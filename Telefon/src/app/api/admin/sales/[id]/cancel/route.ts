import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const body = await request.json().catch(() => ({}));
    const cancelReason = body.cancelReason?.trim() || "Yönetici tarafından iptal edildi";

    const sale = await prisma.sale.findUnique({
      where: { id },
      include: {
        items: true,
        installments: true,
        payments: true,
      },
    });

    if (!sale) {
      return NextResponse.json(
        { success: false, error: "İptal edilecek satış bulunamadı." },
        { status: 404 }
      );
    }

    if (sale.status === "CANCELLED") {
      return NextResponse.json(
        { success: false, error: "Bu satış zaten iptal edilmiş." },
        { status: 400 }
      );
    }

    // Transaction içerisinde satışı iptal et ve cihazları stoğa iade et
    await prisma.$transaction(async (tx) => {
      // 1. Satış durumunu CANCELLED yap
      await tx.sale.update({
        where: { id },
        data: {
          status: "CANCELLED",
          cancelledAt: new Date(),
          cancelReason,
        },
      });

      // 2. Cihazları tekrar IN_STOCK yap
      for (const item of sale.items) {
        await tx.device.update({
          where: { id: item.deviceId },
          data: {
            status: "IN_STOCK",
          },
        });
      }

      // 3. Cari ters kayıt ve bakiye düzeltmesi:
      // Satıştan dolayı müşteriye kalan borç yansıtılmıştı (currentBalance artmıştı)
      const remainingDebt = Number(sale.remainingAmount);
      if (remainingDebt > 0) {
        await tx.cari.update({
          where: { id: sale.customerId },
          data: {
            currentBalance: {
              decrement: remainingDebt,
            },
          },
        });

        // Ters cari hareket kaydı (CREDIT - Borç İptali)
        await tx.cariTransaction.create({
          data: {
            cariId: sale.customerId,
            type: "CREDIT",
            amount: remainingDebt,
            description: `Satış İptali: ${sale.saleNumber} borç kaydı düşüldü (${cancelReason})`,
            referenceType: "CANCEL",
            referenceId: sale.id,
          },
        });
      }

      // 4. Varsa taksitleri iptal et
      if (sale.installments.length > 0) {
        await tx.installment.updateMany({
          where: { saleId: sale.id },
          data: {
            status: "OVERDUE", // veya iptal notu
            notes: "Satış iptal edildi",
          },
        });
      }
    });

    return NextResponse.json({
      success: true,
      message: `${sale.saleNumber} numaralı satış iptal edildi. Cihazlar tekrar aktif stoğa alındı ve cari bakiye düzeltildi.`,
    });
  } catch (error: unknown) {
    console.error("Satış iptal hatası:", error);
    return NextResponse.json(
      { success: false, error: "Satış iptal edilirken bir hata oluştu." },
      { status: 500 }
    );
  }
}
