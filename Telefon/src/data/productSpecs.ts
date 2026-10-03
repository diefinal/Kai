import { NormalizedPhoneSpecs } from "@/types";

export interface SpecItem {
  label: string;
  value: string;
}

export interface SpecCategory {
  title: string;
  icon: string; // Emoji or category identifier
  items: SpecItem[];
}

export interface ProductSpecs {
  modelName: string;
  source: string;
  sourceUrl?: string;
  lastUpdated: string;
  categories: SpecCategory[];
}

// Verified technical specifications dictionary for supported models
export const PRODUCT_SPECS_DATABASE: Record<string, ProductSpecs> = {
  "17 pro": {
    modelName: "Apple iPhone 17 Pro",
    source: "Epey",
    sourceUrl: "https://www.epey.com/akilli-telefonlar/apple-iphone-17-pro.html",
    lastUpdated: "23 Eylül 2026",
    categories: [
      {
        title: "Ekran",
        icon: "📱",
        items: [
          { label: "Ekran Boyutu", value: "6.3 inç" },
          { label: "Ekran Teknolojisi", value: "LTPO Super Retina XDR OLED" },
          { label: "Yenileme Hızı", value: "120 Hz ProMotion" },
          { label: "Çözünürlük", value: "2622 x 1206 Piksel" },
          { label: "Ekran Koruması", value: "Ceramic Shield 2" },
        ],
      },
      {
        title: "Performans",
        icon: "⚡",
        items: [
          { label: "İşlemci", value: "Apple A19 Pro (3 nm)" },
          { label: "RAM", value: "8 GB" },
          { label: "Dahili Depolama", value: "256 GB" },
          { label: "İşletim Sistemi", value: "iOS 26" },
        ],
      },
      {
        title: "Kamera",
        icon: "📷",
        items: [
          { label: "Ana Kamera", value: "48 MP (Geniş) + 48 MP (Ultra Geniş) + 48 MP (Telefoto)" },
          { label: "Optik Zoom", value: "8x Optik Kalitesinde Zoom" },
          { label: "Ön Kamera", value: "18 MP Center Stage" },
          { label: "Video Kayıt", value: "4K 120 fps / ProRes RAW / Apple Log 2" },
        ],
      },
      {
        title: "Batarya & Şarj",
        icon: "🔋",
        items: [
          { label: "Batarya Kapasitesi", value: "3582 mAh" },
          { label: "Hızlı Şarj", value: "Var (%50 Şarj ~30 Dakika)" },
          { label: "Kablosuz Şarj", value: "MagSafe & Qi2 Desteği" },
        ],
      },
      {
        title: "Bağlantılar",
        icon: "📡",
        items: [
          { label: "5G Desteği", value: "✓ Var" },
          { label: "NFC", value: "✓ Var" },
          { label: "Wi-Fi Teknolojisi", value: "Wi-Fi 7 (802.11be)" },
          { label: "Bluetooth", value: "v5.4" },
        ],
      },
      {
        title: "Tasarım & Dayanıklılık",
        icon: "📐",
        items: [
          { label: "Gövde Malzemesi", value: "Alüminyum Unibody + Buhar Odası" },
          { label: "Su / Toz Dayanıklılığı", value: "IP68 (6 Metre, 30 Dakika)" },
          { label: "Boyutlar", value: "149.6 x 71.5 x 8.25 mm" },
          { label: "Ağırlık", value: "187 g" },
        ],
      },
    ],
  },
};

/**
 * Converts a NormalizedPhoneSpecs JSON object into categorized ProductSpecs format.
 */
export function formatNormalizedSpecs(
  modelName: string,
  normalized: NormalizedPhoneSpecs
): ProductSpecs {
  const categories: SpecCategory[] = [
    {
      title: "Ekran",
      icon: "📱",
      items: [
        normalized.displaySize ? { label: "Ekran Boyutu", value: normalized.displaySize } : null,
        normalized.displayTechnology ? { label: "Ekran Teknolojisi", value: normalized.displayTechnology } : null,
        normalized.resolution ? { label: "Çözünürlük", value: normalized.resolution } : null,
        normalized.refreshRate ? { label: "Yenileme Hızı", value: normalized.refreshRate } : null,
        normalized.displayProtection ? { label: "Ekran Koruması", value: normalized.displayProtection } : null,
        normalized.displayBrightness ? { label: "Parlaklık / Ekran Bilgisi", value: normalized.displayBrightness } : null,
      ].filter(Boolean) as SpecItem[],
    },
    {
      title: "Performans",
      icon: "⚡",
      items: [
        normalized.chipset ? { label: "İşlemci", value: normalized.chipset } : null,
        normalized.gpu ? { label: "GPU", value: normalized.gpu } : null,
        normalized.operatingSystem ? { label: "İşletim Sistemi", value: normalized.operatingSystem } : null,
      ].filter(Boolean) as SpecItem[],
    },
    {
      title: "Kamera",
      icon: "📷",
      items: [
        normalized.mainCamera ? { label: "Arka Kamera", value: normalized.mainCamera } : null,
        normalized.frontCamera ? { label: "Ön Kamera", value: normalized.frontCamera } : null,
        normalized.videoFeatures ? { label: "Video Özellikleri", value: normalized.videoFeatures } : null,
      ].filter(Boolean) as SpecItem[],
    },
    {
      title: "Batarya & Şarj",
      icon: "🔋",
      items: [
        normalized.batteryCapacity ? { label: "Batarya Kapasitesi", value: normalized.batteryCapacity } : null,
        normalized.fastCharging ? { label: "Hızlı Şarj", value: normalized.fastCharging } : null,
        normalized.wirelessCharging ? { label: "Kablosuz Şarj", value: normalized.wirelessCharging } : null,
      ].filter(Boolean) as SpecItem[],
    },
    {
      title: "Bağlantılar",
      icon: "📡",
      items: [
        normalized.fiveG !== undefined && normalized.fiveG !== null && normalized.fiveG !== ""
          ? { label: "5G Desteği", value: typeof normalized.fiveG === "boolean" ? (normalized.fiveG ? "✓ Var" : "Yok") : String(normalized.fiveG) }
          : null,
        normalized.nfc !== undefined && normalized.nfc !== null && normalized.nfc !== ""
          ? { label: "NFC", value: typeof normalized.nfc === "boolean" ? (normalized.nfc ? "✓ Var" : "Yok") : String(normalized.nfc) }
          : null,
        normalized.wifi ? { label: "Wi-Fi", value: normalized.wifi } : null,
        normalized.bluetooth ? { label: "Bluetooth", value: normalized.bluetooth } : null,
      ].filter(Boolean) as SpecItem[],
    },
    {
      title: "Tasarım & Dayanıklılık",
      icon: "📐",
      items: [
        normalized.waterResistance ? { label: "Su / Toz Dayanıklılığı", value: normalized.waterResistance } : null,
        normalized.dimensions ? { label: "Boyutlar", value: normalized.dimensions } : null,
        normalized.weight ? { label: "Ağırlık", value: normalized.weight } : null,
      ].filter(Boolean) as SpecItem[],
    },
  ].filter((cat) => cat.items.length > 0);

  return {
    modelName,
    source: normalized.source || "Manuel",
    sourceUrl: normalized.sourceUrl || undefined,
    lastUpdated: normalized.lastUpdated || new Date().toLocaleDateString("tr-TR", { day: "numeric", month: "long", year: "numeric" }),
    categories,
  };
}

/**
 * Lookup technical specifications for a product, overriding RAM and Storage
 * with the active TeknoReha variant's exact values.
 */
export function getProductSpecs(
  modelName: string,
  variantRam?: string | null,
  variantStorage?: string | null,
  customSpecs?: NormalizedPhoneSpecs | null
): ProductSpecs | null {
  let specs: ProductSpecs | null = null;

  if (customSpecs) {
    specs = formatNormalizedSpecs(modelName, customSpecs);
  } else if (modelName) {
    const normalized = modelName.trim().toLowerCase();
    for (const [key, dbSpecs] of Object.entries(PRODUCT_SPECS_DATABASE)) {
      if (normalized.includes(key) || key.includes(normalized)) {
        // Deep clone categories to avoid mutating base dictionary
        specs = JSON.parse(JSON.stringify(dbSpecs));
        break;
      }
    }
  }

  if (!specs) return null;

  // STRICT VARIANT RULE: Override RAM & Storage with active TeknoReha variant values!
  const perfCat = specs.categories.find(
    (c) => c.title.toLowerCase().includes("performans")
  );

  if (perfCat) {
    if (variantRam) {
      const ramItem = perfCat.items.find((i) => i.label.toLowerCase() === "ram");
      if (ramItem) {
        ramItem.value = variantRam;
      } else {
        perfCat.items.push({ label: "RAM", value: variantRam });
      }
    }

    if (variantStorage) {
      const storageItem = perfCat.items.find(
        (i) => i.label.toLowerCase().includes("depolama")
      );
      if (storageItem) {
        storageItem.value = variantStorage;
      } else {
        perfCat.items.push({ label: "Dahili Depolama", value: variantStorage });
      }
    }
  }

  return specs;
}
