import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { PublicProductDTO, ColorAvailabilityDTO, NormalizedPhoneSpecs } from "@/types";

export const dynamic = "force-dynamic";

const KNOWN_MULTI_WORD_COLORS = [
  "natural titanium",
  "natürel titanyum",
  "doğal titanyum",
  "blue titanium",
  "mavi titanyum",
  "space black",
  "uzay siyahı",
  "gece yarısı",
  "yıldız ışığı",
  "deep purple",
  "derin mor",
  "product red",
  "sierra blue",
  "pacific blue",
  "alpine green",
];

// Parses raw color string (which may contain multiple colors separated by commas, slashes, or spaces)
function parseColorString(colorRaw: string | null | undefined): string[] {
  if (!colorRaw || !colorRaw.trim()) return [];

  const raw = colorRaw.trim();

  // 1. If contains commas or slashes, split by comma/slash
  if (raw.includes(",") || raw.includes("/")) {
    return raw
      .split(/[,/]+/)
      .map((s) => s.trim())
      .filter(Boolean);
  }

  // 2. Check for multi-word color matches
  let remaining = raw;
  const foundColors: string[] = [];

  for (const multiWord of KNOWN_MULTI_WORD_COLORS) {
    const regex = new RegExp(`\\b${multiWord.replace(/\s+/g, "\\s+")}\\b`, "gi");
    const matches = remaining.match(regex);
    if (matches) {
      matches.forEach((m) => foundColors.push(m.trim()));
      remaining = remaining.replace(regex, " ");
    }
  }

  // 3. Split remaining tokens by whitespace
  const singleTokens = remaining.split(/\s+/).map((s) => s.trim()).filter(Boolean);
  foundColors.push(...singleTokens);

  return foundColors;
}

// Helper to deduplicate colors case-insensitively while preserving display casing
function addColorToMap(map: Map<string, string>, colorRaw: string | null | undefined) {
  if (!colorRaw || !colorRaw.trim()) return;
  const parsedColors = parseColorString(colorRaw);
  for (const clr of parsedColors) {
    const trimmed = clr.trim();
    if (!trimmed) continue;
    const lower = trimmed.toLowerCase();
    if (!map.has(lower)) {
      map.set(lower, trimmed);
    }
  }
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const brand = searchParams.get("brand");
    const search = searchParams.get("search");

    // 1. Fetch active PhoneModels (base models & variants)
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
      select: {
        id: true,
        brand: true,
        modelName: true,
        ram: true,
        storage: true,
        color: true,
        description: true,
        imageUrl: true,
        colorImages: true,
        basePrice: true,
      },
    });

    // Map active models by ID for fast memory lookup
    const modelIdMap = new Map<string, typeof activeModels[0]>();
    for (const m of activeModels) {
      modelIdMap.set(m.id, m);
    }

    // 2. Fetch all IN_STOCK devices matching brand/search
    const inStockDevices = await prisma.device.findMany({
      where: {
        status: "IN_STOCK",
        model: {
          isActive: true,
          ...(brand ? { brand } : {}),
        },
        ...(search
          ? {
              OR: [
                { model: { brand: { contains: search, mode: "insensitive" } } },
                { model: { modelName: { contains: search, mode: "insensitive" } } },
                { ram: { contains: search, mode: "insensitive" } },
                { storage: { contains: search, mode: "insensitive" } },
                { color: { contains: search, mode: "insensitive" } },
              ],
            }
          : {}),
      },
      select: {
        id: true,
        modelId: true,
        ram: true,
        storage: true,
        color: true,
        salePrice: true,
      },
    });

    // 3. Map out in-stock devices by variant key and color
    // variantKey = `${brand}|||${modelName}|||${ram}|||${storage}`
    const inStockMap = new Map<
      string,
      {
        inStockColorsMap: Map<string, string>;
        minSalePrice: number;
        count: number;
      }
    >();

    for (const d of inStockDevices) {
      const modelObj = modelIdMap.get(d.modelId);
      if (!modelObj) continue;

      const key = `${modelObj.brand}|||${modelObj.modelName}|||${d.ram}|||${d.storage}`;
      const price = Number(d.salePrice);
      const existing = inStockMap.get(key);

      if (existing) {
        addColorToMap(existing.inStockColorsMap, d.color);
        existing.count++;
        if (price < existing.minSalePrice) {
          existing.minSalePrice = price;
        }
      } else {
        const inStockColorsMap = new Map<string, string>();
        addColorToMap(inStockColorsMap, d.color);
        inStockMap.set(key, {
          inStockColorsMap,
          minSalePrice: price,
          count: 1,
        });
      }
    }

    // 4. Group all active models by variant key
    const variantMap = new Map<
      string,
      {
        modelId: string;
        brand: string;
        modelName: string;
        ram: string;
        storage: string;
        description: string | null;
        imageUrl: string | null;
        colorImagesMap: Map<string, string>;
        specs?: NormalizedPhoneSpecs | null;
        basePrice: number;
        definedColorsMap: Map<string, string>;
      }
    >();

    for (const m of activeModels) {
      const key = `${m.brand}|||${m.modelName}|||${m.ram}|||${m.storage}`;
      const existing = variantMap.get(key);

      const parsedColorImages = m.colorImages && typeof m.colorImages === "object"
        ? (m.colorImages as Record<string, string>)
        : {};

      if (existing) {
        addColorToMap(existing.definedColorsMap, m.color);
        Object.entries(parsedColorImages).forEach(([cName, url]) => {
          if (cName && url) existing.colorImagesMap.set(cName.toLowerCase(), url);
        });
      } else {
        const definedColorsMap = new Map<string, string>();
        const colorImagesMap = new Map<string, string>();
        addColorToMap(definedColorsMap, m.color);
        Object.entries(parsedColorImages).forEach(([cName, url]) => {
          if (cName && url) colorImagesMap.set(cName.toLowerCase(), url);
        });

        variantMap.set(key, {
          modelId: m.id,
          brand: m.brand,
          modelName: m.modelName,
          ram: m.ram,
          storage: m.storage,
          description: m.description,
          imageUrl: m.imageUrl,
          colorImagesMap,
          specs: null,
          basePrice: Number(m.basePrice),
          definedColorsMap,
        });
      }
    }

    // Combine in-stock variant keys that might not exist in active PhoneModel list (if any edge case)
    for (const [key, stockInfo] of Array.from(inStockMap.entries())) {
      if (!variantMap.has(key)) {
        const firstDev = inStockDevices.find((d) => {
          const m = modelIdMap.get(d.modelId);
          return m && `${m.brand}|||${m.modelName}|||${d.ram}|||${d.storage}` === key;
        });
        if (firstDev) {
          const modelObj = modelIdMap.get(firstDev.modelId)!;
          const definedColorsMap = new Map<string, string>();
          const colorImagesMap = new Map<string, string>();
          addColorToMap(definedColorsMap, firstDev.color);

          const parsedColorImages = modelObj.colorImages && typeof modelObj.colorImages === "object"
            ? (modelObj.colorImages as Record<string, string>)
            : {};
          Object.entries(parsedColorImages).forEach(([cName, url]) => {
            if (cName && url) colorImagesMap.set(cName.toLowerCase(), url);
          });

          variantMap.set(key, {
            modelId: modelObj.id,
            brand: modelObj.brand,
            modelName: modelObj.modelName,
            ram: firstDev.ram,
            storage: firstDev.storage,
            description: modelObj.description,
            imageUrl: modelObj.imageUrl,
            colorImagesMap,
            basePrice: stockInfo.minSalePrice,
            definedColorsMap,
          });
        }
      }
    }

    // 5. Construct PublicProductDTO list with color-level availability and color images
    const products: PublicProductDTO[] = [];

    Array.from(variantMap.entries()).forEach(([key, variant]) => {
      const stockInfo = inStockMap.get(key);
      const inStockColorsMap = stockInfo ? stockInfo.inStockColorsMap : new Map<string, string>();

      // Merge all defined colors and in-stock colors
      const allColorsMap = new Map<string, string>();
      Array.from(variant.definedColorsMap.entries()).forEach(([lower, name]) => {
        allColorsMap.set(lower, name);
      });
      Array.from(inStockColorsMap.entries()).forEach(([lower, name]) => {
        if (!allColorsMap.has(lower)) {
          allColorsMap.set(lower, name);
        }
      });

      // Convert variant.colorImagesMap to plain Record<string, string>
      const colorImagesObj: Record<string, string> = {};
      Array.from(variant.colorImagesMap.entries()).forEach(([lower, url]) => {
        colorImagesObj[lower] = url;
      });

      // Build colorsWithStock list
      const colorsWithStock: ColorAvailabilityDTO[] = Array.from(allColorsMap.values())
        .map((colorName) => {
          const lower = colorName.toLowerCase();
          const inStock = inStockColorsMap.has(lower);
          const colorImgUrl = variant.colorImagesMap.get(lower) || null;
          return {
            color: colorName,
            inStock,
            imageUrl: colorImgUrl,
          };
        })
        .sort((a, b) => a.color.localeCompare(b.color));

      const isOverallInStock = colorsWithStock.some((c) => c.inStock);
      const minPrice = stockInfo && stockInfo.minSalePrice ? stockInfo.minSalePrice : variant.basePrice;
      const stockCount = stockInfo ? stockInfo.count : 0;
      const stockColorsOnly = colorsWithStock.filter((c) => c.inStock).map((c) => c.color);

      products.push({
        id: variant.modelId,
        brand: variant.brand,
        modelName: variant.modelName,
        ram: variant.ram,
        storage: variant.storage,
        color: colorsWithStock[0]?.color || "",
        stockColors: stockColorsOnly,
        colorsWithStock,
        colorImages: Object.keys(colorImagesObj).length > 0 ? colorImagesObj : null,
        specs: null,
        description: variant.description,
        imageUrl: variant.imageUrl,
        basePrice: minPrice,
        inStock: isOverallInStock,
        stockCount,
        deliveryBadge: isOverallInStock ? "Stokta Var" : "3 Gün İçinde Teslim",
      });
    });

    // 6. Fetch custom product order & brand order settings from DB
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
