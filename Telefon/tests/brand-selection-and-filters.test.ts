import { describe, it } from "node:test";
import assert from "node:assert/strict";

// Helper functions mirroring brand deduplication & resolution logic in BrandCombobox & Page
function getAvailableBrands(presets: string[], existingBrands: string[]): string[] {
  const brandMap = new Map<string, string>();
  presets.forEach((b) => {
    brandMap.set(b.toLowerCase(), b);
  });
  existingBrands.forEach((b) => {
    if (b && b.trim()) {
      const lower = b.trim().toLowerCase();
      if (!brandMap.has(lower)) {
        brandMap.set(lower, b.trim());
      }
    }
  });
  return Array.from(brandMap.values());
}

function resolveBrandSelection(query: string, availableBrands: string[]): string {
  const trimmed = query.trim();
  if (!trimmed) return "";
  const match = availableBrands.find((b) => b.toLowerCase() === trimmed.toLowerCase());
  return match || trimmed;
}

describe("Marka Seçimi ve Filtre Mantığı Testleri", () => {
  const BRAND_PRESETS = ["Apple", "Samsung", "Xiaomi", "Huawei", "Google", "OnePlus"];

  it("1. Sabit markalar ile mevcut ürün markalarını büyük/küçük harf duyarsız tekilleştirmeli", () => {
    const existingModelsBrands = ["apple", "APPLE", "Xiaomi", "Honor", "oneplus"];
    const result = getAvailableBrands(BRAND_PRESETS, existingModelsBrands);

    assert.deepEqual(result, ["Apple", "Samsung", "Xiaomi", "Huawei", "Google", "OnePlus", "Honor"]);
    assert.equal(result.filter((b) => b.toLowerCase() === "apple").length, 1, "Apple yalnızca 1 kez listelenmeli");
    assert.equal(result.includes("Honor"), true, "Yeni marka listeye eklenmeli");
  });

  it("2. Harf duyarsız arama mevcut kanonik markayı seçmeli (apple -> Apple)", () => {
    const available = getAvailableBrands(BRAND_PRESETS, ["Xiaomi"]);
    const selected = resolveBrandSelection("apple", available);
    assert.equal(selected, "Apple", "Kullanıcı 'apple' yazarsa kanonik 'Apple' eşleşmeli");
  });

  it("3. Harf duyarsız arama büyük harfle girildiğinde kanonik markayı seçmeli (SAMSUNG -> Samsung)", () => {
    const available = getAvailableBrands(BRAND_PRESETS, []);
    const selected = resolveBrandSelection("SAMSUNG", available);
    assert.equal(selected, "Samsung");
  });

  it("4. Listede olmayan yeni marka girildiğinde girilen değeri aynen korumalı (Oppo -> Oppo)", () => {
    const available = getAvailableBrands(BRAND_PRESETS, []);
    const selected = resolveBrandSelection("Oppo", available);
    assert.equal(selected, "Oppo", "Yeni marka ismi olduğu gibi korunmalı");
  });

  it("5. Marka filtre listesi 'ALL' ve tüm dinamik markaları içermeli", () => {
    const existing = ["Nothing", "Realme"];
    const available = getAvailableBrands(BRAND_PRESETS, existing);
    const filterOptions = ["ALL", ...available];

    assert.equal(filterOptions[0], "ALL");
    assert.ok(filterOptions.includes("Nothing"));
    assert.ok(filterOptions.includes("Realme"));
    assert.ok(filterOptions.includes("Apple"));
  });
});
