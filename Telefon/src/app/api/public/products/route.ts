import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { PublicProductDTO } from "@/types";
import { buildPublicProductDTO } from "@/lib/productVariantUtils";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const brand = searchParams.get("brand");
    const search = searchParams.get("search");

    // 1. Fetch active PhoneModels with active variants and in-stock devices
    const modelWhere: Prisma.PhoneModelWhereInput = { isActive: true };
    if (brand) modelWhere.brand = brand;
    if (search) {
      modelWhere.OR = [
        { brand: { contains: search, mode: "insensitive" } },
        { modelName: { contains: search, mode: "insensitive" } },
        { ram: { contains: search, mode: "insensitive" } },
        { storage: { contains: search, mode: "insensitive" } },
        { color: { contains: search, mode: "insensitive" } },
      ];
    }

    const activeModels = await prisma.phoneModel.findMany({
      where: modelWhere,
      include: {
        variants: {
          where: { isActive: true },
          orderBy: [{ price: "asc" }],
        },
        devices: {
          where: { status: "IN_STOCK" },
          select: {
            id: true,
            ram: true,
            storage: true,
            color: true,
            salePrice: true,
            status: true,
            variantId: true,
          },
        },
      },
    });

    // 2. Build PublicProductDTO based strictly on PhoneModelVariant architecture
    const products: PublicProductDTO[] = activeModels.map((m) => buildPublicProductDTO(m));

    // 3. Fetch custom product order & brand order settings from DB
    const [productOrderSetting, brandOrderSetting] = await Promise.all([
      prisma.systemSetting.findUnique({ where: { key: "product_order" } }),
      prisma.systemSetting.findUnique({ where: { key: "brand_order" } }),
    ]);

    const productRankMap = new Map<string, number>();
    if (productOrderSetting && Array.isArray(productOrderSetting.value)) {
      (productOrderSetting.value as string[]).forEach((idOrKey, idx) => {
        if (typeof idOrKey === "string" && idOrKey.trim()) {
          productRankMap.set(idOrKey.trim().toLowerCase(), idx);
        }
      });
    }

    const brandRankMap = new Map<string, number>();
    if (brandOrderSetting && Array.isArray(brandOrderSetting.value)) {
      (brandOrderSetting.value as string[]).forEach((b, idx) => {
        if (typeof b === "string" && b.trim()) {
          brandRankMap.set(b.trim().toLowerCase(), idx);
        }
      });
    }

    // Sort by custom product rank, then brand rank, then brand & modelName
    products.sort((a, b) => {
      const lowerIdA = a.id.toLowerCase();
      const lowerIdB = b.id.toLowerCase();
      const keyA = `${a.brand}|||${a.modelName}`.toLowerCase();
      const keyB = `${b.brand}|||${b.modelName}`.toLowerCase();

      const pRankA = productRankMap.has(lowerIdA)
        ? productRankMap.get(lowerIdA)!
        : productRankMap.has(keyA)
        ? productRankMap.get(keyA)!
        : 99999;

      const pRankB = productRankMap.has(lowerIdB)
        ? productRankMap.get(lowerIdB)!
        : productRankMap.has(keyB)
        ? productRankMap.get(keyB)!
        : 99999;

      if (pRankA !== pRankB) {
        return pRankA - pRankB;
      }

      const lowerBrandA = a.brand.toLowerCase();
      const lowerBrandB = b.brand.toLowerCase();

      const bRankA = brandRankMap.has(lowerBrandA) ? brandRankMap.get(lowerBrandA)! : 9999;
      const bRankB = brandRankMap.has(lowerBrandB) ? brandRankMap.get(lowerBrandB)! : 9999;

      if (bRankA !== bRankB) {
        return bRankA - bRankB;
      }

      if (lowerBrandA !== lowerBrandB) {
        return a.brand.localeCompare(b.brand, "tr");
      }

      return a.modelName.localeCompare(b.modelName, "tr");
    });

    return NextResponse.json(
      {
        success: true,
        data: products,
      },
      {
        headers: {
          "Cache-Control": "public, s-maxage=10, stale-while-revalidate=60",
        },
      }
    );
  } catch (error: unknown) {
    console.error("Public ürün listeleme hatası:", error);
    return NextResponse.json(
      { success: false, error: "Ürünler listelenirken bir hata oluştu." },
      { status: 500 }
    );
  }
}
