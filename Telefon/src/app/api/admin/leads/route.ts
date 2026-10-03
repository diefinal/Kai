import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const search = searchParams.get("search");

    const where: Prisma.SalesLeadWhereInput = {};

    if (status && status !== "ALL") {
      where.status = status as Prisma.EnumLeadStatusFilter;
    }

    if (search && search.trim()) {
      const q = search.trim();
      where.OR = [
        { leadNumber: { contains: q, mode: "insensitive" } },
        { customerName: { contains: q, mode: "insensitive" } },
        { customerPhone: { contains: q, mode: "insensitive" } },
        { modelName: { contains: q, mode: "insensitive" } },
        { brand: { contains: q, mode: "insensitive" } },
        { color: { contains: q, mode: "insensitive" } },
      ];
    }

    const leads = await prisma.salesLead.findMany({
      where,
      include: {
        device: {
          select: {
            id: true,
            status: true,
            imei: true,
            color: true,
            ram: true,
            storage: true,
            salePrice: true,
          },
        },
        customer: {
          select: {
            id: true,
            name: true,
            phone: true,
            currentBalance: true,
          },
        },
        sale: {
          select: {
            id: true,
            saleNumber: true,
            totalAmount: true,
            paidAmount: true,
            remainingAmount: true,
            status: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    const formatted = leads.map((l) => ({
      id: l.id,
      leadNumber: l.leadNumber,
      customerName: l.customerName,
      customerPhone: l.customerPhone,
      notes: l.notes,
      brand: l.brand,
      modelName: l.modelName,
      ram: l.ram,
      storage: l.storage,
      color: l.color,
      snapshotPrice: Number(l.snapshotPrice),
      snapshotStock: l.snapshotStock,
      status: l.status,
      depositAmount: Number(l.depositAmount),
      depositStatus: l.depositStatus,
      depositMethod: l.depositMethod,
      depositDate: l.depositDate ? l.depositDate.toISOString() : null,
      depositNotes: l.depositNotes,
      depositRecordedBy: l.depositRecordedBy,
      refundAmount: l.refundAmount ? Number(l.refundAmount) : null,
      refundDate: l.refundDate ? l.refundDate.toISOString() : null,
      refundMethod: l.refundMethod,
      refundNotes: l.refundNotes,
      phoneModelId: l.phoneModelId,
      deviceId: l.deviceId,
      customerId: l.customerId,
      saleId: l.saleId,
      createdAt: l.createdAt.toISOString(),
      updatedAt: l.updatedAt.toISOString(),
      deviceInfo: l.device
        ? {
            id: l.device.id,
            imei: l.device.imei,
            status: l.device.status,
          }
        : null,
      customerInfo: l.customer
        ? {
            id: l.customer.id,
            name: l.customer.name,
            phone: l.customer.phone,
            balance: Number(l.customer.currentBalance),
          }
        : null,
      saleInfo: l.sale
        ? {
            id: l.sale.id,
            saleNumber: l.sale.saleNumber,
            totalAmount: Number(l.sale.totalAmount),
            paidAmount: Number(l.sale.paidAmount),
            remainingAmount: Number(l.sale.remainingAmount),
            status: l.sale.status,
          }
        : null,
    }));

    return NextResponse.json({
      success: true,
      data: formatted,
    });
  } catch (error: unknown) {
    console.error("Satış fırsatları listeleme hatası:", error);
    return NextResponse.json(
      { success: false, error: "Satış fırsatları alınırken bir hata oluştu." },
      { status: 500 }
    );
  }
}
