import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ColorAvailabilityDTO, NormalizedPhoneSpecs } from "@/types";
import { parseColorList, slugify, createProductSlug } from "@/lib/utils";

export const dynamic = "force-dynamic";

export async function GET(
  request: Request,
  { params }: { params: { slug: string } }
) {
  try {
    const { slug } = params;
    const { searchParams } = new URL(request.url);
    const selectedRam = searchParams.get("ram");
    const selectedStorage = searchParams.get("storage");
    const selectedColor = searchParams.get("color");

    if (!slug) {
      return NextResponse.json(
        { success: false, error: "Geçersiz ürün bağlantısı." },
        { status: 400 }
      );
    }

    const cleanSlug = slug.toLowerCase().trim();

    // 1. Target query using indexed brand / modelName search
    const slugTokens = cleanSlug.split("-").filter(Boolean);
    const candidateBrandToken = slugTokens[0] || "";
    const candidateModelToken = slugTokens[slugTokens.length - 1] || "";

    const targetModels = await prisma.phoneModel.findMany({
      where: {
        isActive: true,
        OR: [
          { brand: { contains: candidateBrandToken, mode: "insensitive" } },
          { modelName: { contains: candidateBrandToken, mode: "insensitive" } },
          { modelName: { contains: candidateModelToken, mode: "insensitive" } },
        ],
      },
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
        specs: true,
        basePrice: true,
      },
    });

    let matchingModels = targetModels.filter(
      (m) => createProductSlug(m.brand, m.modelName) === cleanSlug
    );

    let allModels = targetModels;

    // 2. If targeted query didn't find any match, load all active models as fallback
    if (matchingModels.length === 0) {
      allModels = await prisma.phoneModel.findMany({
        where: { isActive: true },
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
          specs: true,
          basePrice: true,
        },
      });

      matchingModels = allModels.filter(
        (m) => createProductSlug(m.brand, m.modelName) === cleanSlug
      );
    }

    if (matchingModels.length === 0) {
      // Fallback check by modelName alone
      const modelNameMatches = allModels.filter(
        (m) => slugify(m.modelName) === cleanSlug
      );

      // Unique brand count matching this modelName
      const uniqueBrands = new Set(modelNameMatches.map((m) => m.brand.toLowerCase()));
      if (uniqueBrands.size === 1) {
        matchingModels = modelNameMatches;
      } else if (uniqueBrands.size > 1) {
        // Ambiguous slug! (e.g. /urun/17 matching both Apple 17 and Xiaomi 17)
        return NextResponse.json(
          {
            success: false,
            error: "Belirsiz ürün adresi. Lütfen markası belirtilmiş ürün bağlantısını kullanınız.",
          },
          { status: 404 }
        );
      }
    }

    if (matchingModels.length === 0) {
      return NextResponse.json(
        { success: false, error: "Aradığınız ürün bulunamadı." },
        { status: 404 }
      );
    }

    const firstMatch = matchingModels[0];
    const brand = firstMatch.brand;
    const modelName = firstMatch.modelName;

    // 3. Collect available RAMs and Storages per RAM for this model
    const phoneModelVariants = allModels.filter(
      (m) => m.brand === brand && m.modelName === modelName
    );

    const availableStoragesPerRam: Record<string, string[]> = {};
    const ramSet = new Set<string>();
    const allStorageSet = new Set<string>();

    phoneModelVariants.forEach((m) => {
      if (m.ram) {
        ramSet.add(m.ram);
        if (!availableStoragesPerRam[m.ram]) {
          availableStoragesPerRam[m.ram] = [];
        }
        if (m.storage && !availableStoragesPerRam[m.ram].includes(m.storage)) {
          availableStoragesPerRam[m.ram].push(m.storage);
        }
      }
      if (m.storage) allStorageSet.add(m.storage);
    });

    const availableRams = Array.from(ramSet).sort(
      (a, b) => parseInt(a) - parseInt(b)
    );
    const availableStorages = Array.from(allStorageSet).sort(
      (a, b) => parseInt(a) - parseInt(b)
    );

    Object.keys(availableStoragesPerRam).forEach((r) => {
      availableStoragesPerRam[r].sort((a, b) => parseInt(a) - parseInt(b));
    });

    // Active variant RAM & Storage
    const activeRam =
      selectedRam && ramSet.has(selectedRam)
        ? selectedRam
        : availableRams[0] || firstMatch.ram;

    const validStoragesForActiveRam = availableStoragesPerRam[activeRam] || availableStorages;

    const activeStorage =
      selectedStorage && validStoragesForActiveRam.includes(selectedStorage)
        ? selectedStorage
        : validStoragesForActiveRam[0] || firstMatch.storage;

    // Filter models for active RAM + Storage variant
    const variantModels = allModels.filter(
      (m) =>
        m.brand === brand &&
        m.modelName === modelName &&
        m.ram === activeRam &&
        m.storage === activeStorage
    );

    const baseModel = variantModels[0] || firstMatch;

    // 4. Fetch IN_STOCK devices for this specific brand, modelName, RAM, Storage
    const inStockDevices = await prisma.device.findMany({
      where: {
        status: "IN_STOCK",
        ram: activeRam,
        storage: activeStorage,
        model: {
          brand,
          modelName,
          isActive: true,
        },
      },
      select: {
        color: true,
        salePrice: true,
      },
    });

    // Count physical devices per normalized color name
    const inStockColorCountsMap = new Map<string, { count: number; name: string }>();
    let minSalePrice = Number(baseModel.basePrice);

    inStockDevices.forEach((d) => {
      const parsedColors = parseColorList(d.color);
      parsedColors.forEach((colorName) => {
        const lower = colorName.toLowerCase();
        const existing = inStockColorCountsMap.get(lower);
        if (existing) {
          existing.count += 1;
        } else {
          inStockColorCountsMap.set(lower, { count: 1, name: colorName });
        }
      });

      const p = Number(d.salePrice);
      if (p > 0 && (minSalePrice === 0 || p < minSalePrice)) {
        minSalePrice = p;
      }
    });

    // 5. Gather color images & defined colors from PhoneModel.color
    const definedColorsMap = new Map<string, string>();
    const colorImagesMap = new Map<string, string>();

    const targetModelsForColors =
      variantModels.length > 0
        ? variantModels
        : allModels.filter((m) => m.brand === brand && m.modelName === modelName);

    targetModelsForColors.forEach((m) => {
      if (m.color) {
        const parsedModelColors = parseColorList(m.color);
        parsedModelColors.forEach((cName) => {
          definedColorsMap.set(cName.toLowerCase(), cName);
        });
      }
      if (m.colorImages && typeof m.colorImages === "object") {
        Object.entries(m.colorImages as Record<string, string>).forEach(
          ([cName, url]) => {
            if (cName && url) {
              const cleanColorList = parseColorList(cName);
              cleanColorList.forEach((cleanC) => {
                colorImagesMap.set(cleanC.toLowerCase(), url);
              });
            }
          }
        );
      }
    });

    const allColorsMap = new Map<string, string>();
    definedColorsMap.forEach((name, lower) => allColorsMap.set(lower, name));
    inStockColorCountsMap.forEach((item, lower) => allColorsMap.set(lower, item.name));

    const colorsWithStock: ColorAvailabilityDTO[] = Array.from(
      allColorsMap.values()
    )
      .map((colorName) => {
        const lower = colorName.toLowerCase();
        const stockItem = inStockColorCountsMap.get(lower);
        const count = stockItem ? stockItem.count : 0;
        const colorImgUrl = colorImagesMap.get(lower) || null;
        return {
          color: colorName,
          inStock: count > 0,
          stockCount: count,
          imageUrl: colorImgUrl,
        };
      })
      .sort((a, b) => a.color.localeCompare(b.color, "tr"));

    // Active color selection
    let activeColor = colorsWithStock[0]?.color || "Siyah";

    if (selectedColor) {
      const matched = Array.from(allColorsMap.values()).find(
        (c) => c.toLowerCase() === selectedColor.toLowerCase()
      );
      if (matched) {
        activeColor = matched;
      }
    } else {
      // Default to first color in stock if available
      const firstInStock = colorsWithStock.find((c) => c.inStock);
      if (firstInStock) {
        activeColor = firstInStock.color;
      }
    }

    const activeColorLower = activeColor.toLowerCase();
    const activeColorStockObj = inStockColorCountsMap.get(activeColorLower);
    const activeColorStockCount = activeColorStockObj ? activeColorStockObj.count : 0;
    const isSelectedColorInStock = activeColorStockCount > 0;
    const overallInStock = colorsWithStock.some((c) => c.inStock);

    const selectedColorImageUrl =
      colorImagesMap.get(activeColorLower) || baseModel.imageUrl;

    const colorImagesObj: Record<string, string> = {};
    colorImagesMap.forEach((url, lower) => {
      colorImagesObj[lower] = url;
    });

    return NextResponse.json({
      success: true,
      data: {
        id: baseModel.id,
        brand,
        modelName,
        ram: activeRam,
        storage: activeStorage,
        color: activeColor,
        availableRams,
        availableStorages,
        availableStoragesPerRam,
        colorsWithStock,
        colorImages:
          Object.keys(colorImagesObj).length > 0 ? colorImagesObj : null,
        specs: (baseModel.specs as unknown as NormalizedPhoneSpecs) || null,
        description: baseModel.description,
        imageUrl: selectedColorImageUrl,
        basePrice: minSalePrice,
        inStock: isSelectedColorInStock,
        overallInStock,
        stockCount: activeColorStockCount,
        deliveryBadge: isSelectedColorInStock
          ? `${activeColorStockCount} Adet Stokta`
          : "3 Gün İçinde Teslim",
      },
    });
  } catch (error: unknown) {
    console.error("Public ürün detay hatası:", error);
    return NextResponse.json(
      { success: false, error: "Ürün detayları alınırken bir hata oluştu." },
      { status: 500 }
    );
  }
}
