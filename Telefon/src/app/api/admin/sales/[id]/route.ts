import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

// Satış Kaydı Silme (Tek Transaction, FK-Safe, Cihazları Stoğa İade Etme & Cari Bakiye Tersine Çevirme)
export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    const sale = await prisma.sale.findUnique({
      where: { id },
      include: {
        items: true,
        installments: true,
        payments: true,
        customer: true,
      },
    });

    if (!sale) {
      return NextResponse.json(
        { success: false, error: "Silinecek satış kaydı bulunamadı." },
        { status: 404 }
      );
    }

    await prisma.$transaction(async (tx) => {
      // 1. Cihazları tekrar IN_STOCK yap
      // (Alış maliyeti, RAM, hafıza, renk, IMEI ve hedef satış fiyatı aynen korunur)
      for (const item of sale.items) {
        await tx.device.update({
          where: { id: item.deviceId },
          data: { status: "IN_STOCK" },
        });
      }

      // 2. Bu satışa ait CariTransaction kayıtlarını bul
      const installmentIds = sale.installments.map((ins) => ins.id);
      const paymentIds = sale.payments.map((p) => p.id);

      const relatedCariTxs = await tx.cariTransaction.findMany({
        where: {
          cariId: sale.customerId,
          OR: [
            { referenceId: sale.id },
            ...(paymentIds.length > 0 ? [{ referenceId: { in: paymentIds } }] : []),
          ],
        },
      });

      // Bu satıştan doğan DEBIT (Borç) ve CREDIT (Alacak/Tahsilat) toplamlarını hesapla
      let totalDebit = 0;
      let totalCredit = 0;

      for (const ctx of relatedCariTxs) {
        const amt = Number(ctx.amount);
        if (ctx.type === "DEBIT") {
          totalDebit += amt;
        } else if (ctx.type === "CREDIT") {
          totalCredit += amt;
        }
      }

      // Net borç etkisi = totalDebit - totalCredit
      // Müşteri cari bakiyesinden (currentBalance) yalnızca bu satışın net etkisi atomic olarak çıkarılır (decrement)
      const netDebtImpact = totalDebit - totalCredit;

      if (netDebtImpact !== 0) {
        await tx.cari.update({
          where: { id: sale.customerId },
          data: {
            currentBalance: {
              decrement: netDebtImpact,
            },
          },
        });
      }

      // 3. FK-Safe Sırada Temizlik
      // A) Payments
      await tx.payment.deleteMany({
        where: {
          OR: [
            { saleId: sale.id },
            ...(installmentIds.length > 0 ? [{ installmentId: { in: installmentIds } }] : []),
          ],
        },
      });

      // B) Installments
      await tx.installment.deleteMany({
        where: { saleId: sale.id },
      });

      // C) SaleItems
      await tx.saleItem.deleteMany({
        where: { saleId: sale.id },
      });

      // D) CariTransactions
      if (relatedCariTxs.length > 0) {
        await tx.cariTransaction.deleteMany({
          where: {
            id: { in: relatedCariTxs.map((t) => t.id) },
          },
        });
      }

      // E) Sale Kaydı
      await tx.sale.delete({
        where: { id: sale.id },
      });
    });

    return NextResponse.json({
      success: true,
      message: `${sale.saleNumber} numaralı satış kaydı ve tüm finansal hareketleri güvenli şekilde silindi. Cihaz(lar) tekrar stok durumuna alındı.`,
    });
  } catch (error: unknown) {
    console.error("Satış silme hatası:", error);
    return NextResponse.json(
      { success: false, error: "Satış kaydı silinirken bir hata oluştu ve tüm işlem geri alındı." },
      { status: 500 }
    );
  }
}
