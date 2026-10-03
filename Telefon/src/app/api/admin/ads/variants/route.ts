import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { StockVariantOptionDTO } from "@/types";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    // Fetch all IN_STOCK devices with model info
    const inStockDevices = await prisma.device.findMany({
      where: {
        status: "IN_STOCK",
        model: {
          isActive: true,
        },
      },
      select: {
        id: true,
        modelId: true,
        ram: true,
        storage: true,
        color: true,
        salePrice: true,
        model: {
          select: {
            id: true,
            brand: true,
            modelName: true,
          },
        },
      },
    });

    // Group IN_STOCK devices by modelId + ram + storage
    const groupMap = new Map<
      string,
      {
        variantKey: string;
        modelId: string;
        brand: string;
        modelName: string;
        ram: string;
        storage: string;
        colors: Set<string>;
        minSalePrice: number;
        count: number;
      }
    >();

    for (const d of inStockDevices) {
      const variantKey = `${d.modelId}|||${d.ram}|||${d.storage}`;
      const existing = groupMap.get(variantKey);
      const price = Number(d.salePrice);

      if (existing) {
        existing.colors.add(d.color);
        existing.count++;
        if (price < existing.minSalePrice) {
          existing.minSalePrice = price;
        }
      } else {
        groupMap.set(variantKey, {
          variantKey,
          modelId: d.modelId,
          brand: d.model.brand,
          modelName: d.model.modelName,
          ram: d.ram,
          storage: d.storage,
          colors: new Set([d.color]),
          minSalePrice: price,
          count: 1,
        });
      }
    }

    const variants: StockVariantOptionDTO[] = [];

    Array.from(groupMap.values()).forEach((group) => {
      const sortedColors = Array.from(group.colors).sort();
      variants.push({
        variantKey: group.variantKey,
        modelId: group.modelId,
        brand: group.brand,
        modelName: group.modelName,
        ram: group.ram,
        storage: group.storage,
        stockCount: group.count,
        colors: sortedColors,
        minSalePrice: group.minSalePrice,
        displayText: `${group.brand} ${group.modelName} — ${group.ram} RAM / ${group.storage} — Stok: ${group.count}`,
      });
    });

    // Sort variants by brand, then modelName, then ram
    variants.sort((a, b) => {
      if (a.brand !== b.brand) return a.brand.localeCompare(b.brand);
      if (a.modelName !== b.modelName) return a.modelName.localeCompare(b.modelName);
      return a.ram.localeCompare(b.ram);
    });

    return NextResponse.json({
      success: true,
      data: variants,
    });
  } catch (error: unknown) {
    console.error("Ad Stock Variants GET hatası:", error);
    return NextResponse.json(
      { success: false, error: "Stok varyantları yüklenirken hata oluştu." },
      { status: 500 }
    );
  }
}
