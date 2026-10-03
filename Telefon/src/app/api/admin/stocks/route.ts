import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search")?.trim();
    const brand = searchParams.get("brand")?.trim();
    const stockFilter = searchParams.get("stock"); // "in_stock", "out_of_stock", "all"

    const where: Prisma.PhoneModelWhereInput = {};

    if (brand && brand !== "ALL") {
      where.brand = brand;
    }

    if (search) {
      where.OR = [
        { brand: { contains: search, mode: "insensitive" } },
        { modelName: { contains: search, mode: "insensitive" } },
        { ram: { contains: search, mode: "insensitive" } },
        { storage: { contains: search, mode: "insensitive" } },
        { color: { contains: search, mode: "insensitive" } },
      ];
    }

    const models = await prisma.phoneModel.findMany({
      where,
      include: {
        devices: {
          include: {
            supplier: {
              select: {
                id: true,
                name: true,
                phone: true,
              },
            },
          },
          orderBy: { purchaseDate: "desc" },
        },
      },
      orderBy: [{ brand: "asc" }, { modelName: "asc" }],
    });

    let result = models.map((m) => {
      const inStockDevices = m.devices.filter((d) => d.status === "IN_STOCK");
      const reservedDevices = m.devices.filter((d) => d.status === "RESERVED");
      const soldDevices = m.devices.filter((d) => d.status === "SOLD");

      const inStockCost = inStockDevices.reduce(
        (acc, curr) => acc + Number(curr.purchasePrice),
        0
      );

      return {
        id: m.id,
        brand: m.brand,
        modelName: m.modelName,
        ram: m.ram,
        storage: m.storage,
        color: m.color,
        description: m.description,
        imageUrl: m.imageUrl,
        basePrice: Number(m.basePrice),
        isActive: m.isActive,
        inStockCount: inStockDevices.length,
        reservedCount: reservedDevices.length,
        soldCount: soldDevices.length,
        inStockCost,
        devices: m.devices.map((d) => ({
          id: d.id,
          imei: d.imei,
          ram: d.ram,
          storage: d.storage,
          color: d.color,
          purchasePrice: Number(d.purchasePrice),
          salePrice: Number(d.salePrice),
          status: d.status,
          purchaseDate: d.purchaseDate,
          notes: d.notes,
          supplier: d.supplier,
        })),
      };
    });

    if (stockFilter === "in_stock") {
      result = result.filter((m) => m.inStockCount > 0);
    } else if (stockFilter === "out_of_stock") {
      result = result.filter((m) => m.inStockCount === 0);
    }

    return NextResponse.json({ success: true, data: result });
  } catch (error: unknown) {
    console.error("Stoklar GET hatası:", error);
    return NextResponse.json(
      { success: false, error: "Stok verileri yüklenirken hata oluştu." },
      { status: 500 }
    );
  }
}
