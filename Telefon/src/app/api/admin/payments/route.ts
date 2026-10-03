import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { parsePositiveDecimal } from "@/lib/validations";
import { executeInstallmentCollectionTransaction } from "@/lib/installmentService";

export const dynamic = "force-dynamic";

// Tahsilat ve Ödemeleri Listeleme
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const cariId = searchParams.get("cariId");
    const type = searchParams.get("type"); // INCOMING, OUTGOING
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");

    const where: Prisma.PaymentWhereInput = {};

    if (cariId) where.cariId = cariId;
    if (type && ["INCOMING", "OUTGOING"].includes(type)) {
      where.type = type as "INCOMING" | "OUTGOING";
    }

    if (startDate || endDate) {
      where.date = {};
      if (startDate) where.date.gte = new Date(startDate);
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        where.date.lte = end;
      }
    }

    const payments = await prisma.payment.findMany({
      where,
      include: {
        cari: {
          select: {
            id: true,
            name: true,
            phone: true,
            type: true,
          },
        },
        sale: {
          select: {
            id: true,
            saleNumber: true,
          },
        },
        installment: {
          select: {
            id: true,
            installmentNumber: true,
            amount: true,
            dueDate: true,
          },
        },
      },
      orderBy: { date: "desc" },
    });

    const formatted = payments.map((p) => ({
      id: p.id,
      amount: Number(p.amount),
      type: p.type,
      method: p.method,
      date: p.date,
      description: p.description,
      reference: p.reference,
      cari: p.cari,
      sale: p.sale,
      installment: p.installment
        ? {
            id: p.installment.id,
            installmentNumber: p.installment.installmentNumber,
            amount: Number(p.installment.amount),
            dueDate: p.installment.dueDate,
          }
        : null,
    }));

    return NextResponse.json({ success: true, data: formatted });
  } catch (error: unknown) {
    console.error("Payments GET hatası:", error);
    return NextResponse.json(
      { success: false, error: "Ödeme ve tahsilat kayıtları yüklenemedi." },
      { status: 500 }
    );
  }
}

// Yeni Tahsilat Yap veya Tedarikçiye Ödeme Yap (Tam Transaction Bütünlüğü)
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      cariId,
      type = "INCOMING", // INCOMING (Müşteriden Tahsilat) | OUTGOING (Tedarikçiye Ödeme)
      amount: rawAmount,
      method = "CASH", // CASH, BANK_TRANSFER, CREDIT_CARD
      date: inputDate,
      description,
      saleId,
      installmentId,
    } = body;

    const amount = parsePositiveDecimal(rawAmount);
    if (amount === null || amount <= 0) {
      return NextResponse.json(
        { success: false, error: "Geçerli bir ödeme/tahsilat tutarı giriniz (0'dan büyük olmalıdır)." },
        { status: 400 }
      );
    }

    if (!cariId) {
      return NextResponse.json(
        { success: false, error: "Lütfen ilgili cariyi seçiniz." },
        { status: 400 }
      );
    }

    if (!["INCOMING", "OUTGOING"].includes(type)) {
      return NextResponse.json(
        { success: false, error: "İşlem türü INCOMING (Tahsilat) veya OUTGOING (Ödeme) olmalıdır." },
        { status: 400 }
      );
    }

    const cari = await prisma.cari.findUnique({
      where: { id: cariId },
    });

    if (!cari) {
      return NextResponse.json(
        { success: false, error: "Cari kartı bulunamadı." },
        { status: 404 }
      );
    }

    const pDate = inputDate ? new Date(inputDate) : new Date();

    // Varsa ilgili satışı belirle
    let resolvedSaleId = saleId || null;
    if (!resolvedSaleId && installmentId) {
      const targetIns = await prisma.installment.findUnique({
        where: { id: installmentId },
        select: { saleId: true },
      });
      if (targetIns) {
        resolvedSaleId = targetIns.saleId;
      }
    }

    const transactionResult = await prisma.$transaction(async (tx) => {
      // A) Eğer bir satışa veya takside bağlı tahsilatsa (INCOMING):
      // Gelişmiş taksit dağıtım motorunu ve tek işlem transaction'ını çalıştır
      if (type === "INCOMING" && resolvedSaleId) {
        const result = await executeInstallmentCollectionTransaction(tx, {
          cariId,
          saleId: resolvedSaleId,
          startInstallmentId: installmentId || null,
          amount,
          method,
          date: pDate,
          description: description?.trim() || null,
        });

        return result.payment;
      }

      // B) Genel Müşteri Tahsilatı (Herhangi bir satışa bağlanmamış genel cari tahsilatı)
      if (type === "INCOMING") {
        const payment = await tx.payment.create({
          data: {
            cariId,
            type: "INCOMING",
            amount,
            method,
            date: pDate,
            description: description?.trim() || "Müşteri Tahsilatı",
          },
        });

        await tx.cari.update({
          where: { id: cariId },
          data: {
            currentBalance: {
              decrement: amount,
            },
          },
        });

        await tx.cariTransaction.create({
          data: {
            cariId,
            type: "CREDIT",
            amount,
            description: description?.trim() || "Müşteri Tahsilatı",
            date: pDate,
            referenceType: "COLLECTION",
            referenceId: payment.id,
          },
        });

        return payment;
      }

      // C) Tedarikçiye Ödeme (OUTGOING)
      const payment = await tx.payment.create({
        data: {
          cariId,
          type: "OUTGOING",
          amount,
          method,
          date: pDate,
          description: description?.trim() || "Tedarikçiye Ödeme",
        },
      });

      await tx.cari.update({
        where: { id: cariId },
        data: {
          currentBalance: {
            increment: amount,
          },
        },
      });

      await tx.cariTransaction.create({
        data: {
          cariId,
          type: "DEBIT",
          amount,
          description: description?.trim() || "Tedarikçiye Ödeme",
          date: pDate,
          referenceType: "PAYMENT",
          referenceId: payment.id,
        },
      });

      return payment;
    });

    return NextResponse.json({
      success: true,
      message: type === "INCOMING" ? "Tahsilat başarıyla kaydedildi." : "Ödeme başarıyla kaydedildi.",
      data: {
        ...transactionResult,
        amount: Number(transactionResult.amount),
      },
    });
  } catch (error: unknown) {
    console.error("Payment POST hatası:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Ödeme/Tahsilat işlemi sırasında hata oluştu ve geri alındı.",
      },
      { status: 400 }
    );
  }
}
