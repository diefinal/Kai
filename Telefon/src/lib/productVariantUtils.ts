import { ColorAvailabilityDTO, NormalizedPhoneSpecs, PublicProductDTO } from "@/types";
import { parseColorList } from "@/lib/utils";

export interface PhoneModelWithVariantsAndDevices {
  id: string;
  brand: string;
  modelName: string;
  ram: string;
  storage: string;
  color: string;
  description: string | null;
  imageUrl: string | null;
  colorImages: unknown;
  specs: unknown;
  basePrice: unknown;
  isActive: boolean;
  variants: {
    id: string;
    phoneModelId: string;
    ram: string;
    storage: string;
    price: unknown;
    isActive: boolean;
  }[];
  devices: {
    id: string;
    ram: string;
    storage: string;
    color: string;
    salePrice: unknown;
    status: string;
    variantId?: string | null;
  }[];
}

export interface ResolvedVariantInfo {
  variantId: string;
  ram: string;
  storage: string;
  price: number;
  inStock: boolean;
  stockCount: number;
  colorsWithStock: ColorAvailabilityDTO[];
  defaultColor: string;
  colorImages: Record<string, string> | null;
}

/**
  * Parses colorImages record from PhoneModel
  */
export function parseColorImagesMap(colorImagesRaw: unknown): Map<string, string> {
  const colorImagesMap = new Map<string, string>();
  if (colorImagesRaw && typeof colorImagesRaw === "object") {
    Object.entries(colorImagesRaw as Record<string, string>).forEach(([cName, url]) => {
      if (cName && url) {
        const cleanColors = parseColorList(cName);
        cleanColors.forEach((cleanC) => {
          colorImagesMap.set(cleanC.toLowerCase(), url);
        });
      }
    });
  }
  return colorImagesMap;
}

/**
  * Resolves variant details (price, stock, colors) for a specific RAM/Storage or selects the default variant.
  */
export function resolveModelVariant(
  model: PhoneModelWithVariantsAndDevices,
  requestedRam?: string | null,
  requestedStorage?: string | null
): ResolvedVariantInfo {
  const activeVariants = model.variants.filter((v) => v.isActive);
  const inStockDevices = model.devices.filter((d) => d.status === "IN_STOCK");

  // Map active variants (or synthetic fallback)
  const variantList = activeVariants.length > 0
    ? activeVariants
    : [
        {
          id: "legacy-fallback",
          phoneModelId: model.id,
          ram: model.ram,
          storage: model.storage,
          price: model.basePrice,
          isActive: true,
        },
      ];

  // Function to calculate stock & price info for a variant
  const getVariantDetails = (v: typeof variantList[0]) => {
    const vDevices = inStockDevices.filter(
      (d) =>
        d.variantId === v.id ||
        (d.ram.toLowerCase() === v.ram.toLowerCase() &&
          d.storage.toLowerCase() === v.storage.toLowerCase())
    );

    const hasStock = vDevices.length > 0;
    const stockCount = vDevices.length;

    let minDevicePrice = 0;
    if (hasStock) {
      const prices = vDevices.map((d) => Number(d.salePrice)).filter((p) => p > 0);
      if (prices.length > 0) {
        minDevicePrice = Math.min(...prices);
      }
    }

    const price = minDevicePrice > 0
      ? minDevicePrice
      : Number(v.price) > 0
      ? Number(v.price)
      : Number(model.basePrice) > 0
      ? Number(model.basePrice)
      : 10000;

    return { variant: v, vDevices, hasStock, stockCount, price };
  };

  const evaluatedVariants = variantList.map(getVariantDetails);

  // Determine selected variant
  let selected = evaluatedVariants[0];

  if (requestedRam || requestedStorage) {
    const matched = evaluatedVariants.find((ev) => {
      const ramMatch = requestedRam
        ? ev.variant.ram.toLowerCase() === requestedRam.toLowerCase()
        : true;
      const storageMatch = requestedStorage
        ? ev.variant.storage.toLowerCase() === requestedStorage.toLowerCase()
        : true;
      return ramMatch && storageMatch;
    });
    if (matched) {
      selected = matched;
    }
  } else {
    // Default selection logic:
    // 1. Prefer in-stock variant (lowest price among in-stock variants)
    // 2. Otherwise prefer lowest price active variant
    const inStockVariants = evaluatedVariants.filter((ev) => ev.hasStock);
    if (inStockVariants.length > 0) {
      inStockVariants.sort((a, b) => a.price - b.price);
      selected = inStockVariants[0];
    } else {
      evaluatedVariants.sort((a, b) => a.price - b.price);
      selected = evaluatedVariants[0];
    }
  }

  // Build colors for the selected variant
  const definedColors = parseColorList(model.color);
  const definedColorsSet = new Map<string, string>();
  definedColors.forEach((c) => definedColorsSet.set(c.toLowerCase(), c));

  const inStockColorCountsMap = new Map<string, { count: number; name: string }>();
  selected.vDevices.forEach((d) => {
    const parsed = parseColorList(d.color);
    parsed.forEach((cName) => {
      const lower = cName.toLowerCase();
      const existing = inStockColorCountsMap.get(lower);
      if (existing) {
        existing.count += 1;
      } else {
        inStockColorCountsMap.set(lower, { count: 1, name: cName });
      }
    });
  });

  const allColorsMap = new Map<string, string>();
  definedColorsSet.forEach((name, lower) => allColorsMap.set(lower, name));
  inStockColorCountsMap.forEach((item, lower) => allColorsMap.set(lower, item.name));

  const colorImagesMap = parseColorImagesMap(model.colorImages);

  const colorsWithStock: ColorAvailabilityDTO[] = Array.from(allColorsMap.values())
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

  const firstInStockColor = colorsWithStock.find((c) => c.inStock)?.color;
  const defaultColor = firstInStockColor || colorsWithStock[0]?.color || "Siyah";

  const colorImagesObj: Record<string, string> = {};
  colorImagesMap.forEach((url, lower) => {
    colorImagesObj[lower] = url;
  });

  return {
    variantId: selected.variant.id,
    ram: selected.variant.ram,
    storage: selected.variant.storage,
    price: selected.price,
    inStock: selected.hasStock,
    stockCount: selected.stockCount,
    colorsWithStock,
    defaultColor,
    colorImages: Object.keys(colorImagesObj).length > 0 ? colorImagesObj : null,
  };
}

/**
  * Converts a PhoneModel database record into a PublicProductDTO strictly based on PhoneModelVariant architecture.
  */
export function buildPublicProductDTO(
  model: PhoneModelWithVariantsAndDevices,
  requestedRam?: string | null,
  requestedStorage?: string | null,
  requestedColor?: string | null
): PublicProductDTO {
  const resolved = resolveModelVariant(model, requestedRam, requestedStorage);

  let activeColor = resolved.defaultColor;
  if (requestedColor) {
    const match = resolved.colorsWithStock.find(
      (c) => c.color.toLowerCase() === requestedColor.toLowerCase()
    );
    if (match) {
      activeColor = match.color;
    }
  }

  const activeColorLower = activeColor.toLowerCase();
  const colorImagesMap = parseColorImagesMap(model.colorImages);
  const displayImageUrl = colorImagesMap.get(activeColorLower) || model.imageUrl || null;

  return {
    id: model.id,
    brand: model.brand,
    modelName: model.modelName,
    ram: resolved.ram,
    storage: resolved.storage,
    color: activeColor,
    stockColors: resolved.colorsWithStock.filter((c) => c.inStock).map((c) => c.color),
    colorsWithStock: resolved.colorsWithStock,
    colorImages: resolved.colorImages,
    specs: (model.specs as unknown as NormalizedPhoneSpecs) || null,
    description: model.description || null,
    imageUrl: displayImageUrl,
    basePrice: resolved.price,
    inStock: resolved.inStock,
    stockCount: resolved.stockCount,
    deliveryBadge: resolved.inStock
      ? `${resolved.stockCount > 0 ? `${resolved.stockCount} Adet ` : ""}Stokta Var`
      : "3 Gün İçinde Teslim",
  };
}
