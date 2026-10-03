import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const customerId = searchParams.get("customerId");
    const status = searchParams.get("status"); // PENDING, PAID, OVERDUE, ALL
    const search = searchParams.get("search")?.trim();

    const saleWhere: Prisma.SaleWhereInput = {
      status: "COMPLETED", // İptal edilmiş satışların taksitlerini gösterme
    };

    if (customerId && customerId !== "ALL") {
      saleWhere.customerId = customerId;
    }

    if (search) {
      saleWhere.OR = [
        { saleNumber: { contains: search, mode: "insensitive" } },
        { customer: { name: { contains: search, mode: "insensitive" } } },
        { customer: { phone: { contains: search, mode: "insensitive" } } },
      ];
    }

    const where: Prisma.InstallmentWhereInput = {
      sale: saleWhere,
    };

    const installments = await prisma.installment.findMany({
      where,
      include: {
        sale: {
          select: {
            id: true,
            saleNumber: true,
            saleDate: true,
            totalAmount: true,
            paidAmount: true,
            remainingAmount: true,
            customer: {
              select: {
                id: true,
                name: true,
                phone: true,
              },
            },
            installments: {
              select: {
                id: true,
                installmentNumber: true,
                amount: true,
                paidAmount: true,
                status: true,
                dueDate: true,
              },
              orderBy: [{ dueDate: "asc" }, { installmentNumber: "asc" }],
            },
          },
        },
      },
      orderBy: [{ dueDate: "asc" }, { installmentNumber: "asc" }],
    });

    const now = new Date();

    let formatted = installments.map((ins) => {
      const amount = Number(ins.amount);
      const paidAmount = Number(ins.paidAmount);
      const remainingAmount = Math.max(0, Math.round((amount - paidAmount) * 100) / 100);

      // Satışın tüm açık taksitlerinin kalan toplam borcu (Kuruş hassasiyeti)
      const saleOpenInstallmentsRemaining = ins.sale.installments.reduce((sum, sIns) => {
        const targetC = Math.round(Number(sIns.amount) * 100);
        const paidC = Math.round(Number(sIns.paidAmount) * 100);
        return sum + Math.max(0, targetC - paidC);
      }, 0);
      const saleTotalRemaining = Math.round(saleOpenInstallmentsRemaining) / 100;

      let effectiveStatus = ins.status;
      if (ins.status !== "PAID" && new Date(ins.dueDate) < now) {
        effectiveStatus = "OVERDUE";
      }

      return {
        id: ins.id,
        installmentNumber: ins.installmentNumber,
        amount,
        paidAmount,
        remainingAmount,
        saleTotalRemaining,
        dueDate: ins.dueDate,
        paidDate: ins.paidDate,
        status: effectiveStatus,
        notes: ins.notes,
        sale: {
          id: ins.sale.id,
          saleNumber: ins.sale.saleNumber,
          saleDate: ins.sale.saleDate,
          totalAmount: Number(ins.sale.totalAmount),
          paidAmount: Number(ins.sale.paidAmount),
          remainingAmount: Number(ins.sale.remainingAmount),
          customer: ins.sale.customer,
        },
      };
    });

    if (status && status !== "ALL") {
      formatted = formatted.filter((ins) => ins.status === status);
    }

    return NextResponse.json({ success: true, data: formatted });
  } catch (error: unknown) {
    console.error("Installments GET hatası:", error);
    return NextResponse.json(
      { success: false, error: "Taksitler listelenirken hata oluştu." },
      { status: 500 }
    );
  }
}
