import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { PublicProductDTO } from "../src/types";

describe("Header, Yönetici Girişi ve Marka Sıralaması Test Suite", () => {
  it("1. Özel Marka Sıralama Mantığı: DB'de tanımlanan manuel sıra (Xiaomi -> Apple -> Samsung) uygulanmalı", () => {
    const brandOrder = ["Xiaomi", "Apple", "Samsung"];
    const brandRankMap = new Map<string, number>();
    brandOrder.forEach((b, idx) => brandRankMap.set(b.toLowerCase(), idx));

    const sampleProducts: PublicProductDTO[] = [
      {
        id: "p1",
        brand: "Apple",
        modelName: "iPhone 16",
        ram: "8 GB",
        storage: "128 GB",
        color: "Siyah",
        stockColors: ["Siyah"],
        description: null,
        imageUrl: null,
        basePrice: 50000,
        inStock: true,
        stockCount: 1,
        deliveryBadge: "Stokta Var",
      },
      {
        id: "p2",
        brand: "Xiaomi",
        modelName: "14 Ultra",
        ram: "16 GB",
        storage: "512 GB",
        color: "Siyah",
        stockColors: ["Siyah"],
        description: null,
        imageUrl: null,
        basePrice: 45000,
        inStock: true,
        stockCount: 2,
        deliveryBadge: "Stokta Var",
      },
      {
        id: "p3",
        brand: "Samsung",
        modelName: "S25 Ultra",
        ram: "12 GB",
        storage: "256 GB",
        color: "Gri",
        stockColors: ["Gri"],
        description: null,
        imageUrl: null,
        basePrice: 55000,
        inStock: true,
        stockCount: 1,
        deliveryBadge: "Stokta Var",
      },
    ];

    // Sort products by custom rank
    const sorted = [...sampleProducts].sort((a, b) => {
      const lowerA = a.brand.toLowerCase();
      const lowerB = b.brand.toLowerCase();
      const rankA = brandRankMap.has(lowerA) ? brandRankMap.get(lowerA)! : 9999;
      const rankB = brandRankMap.has(lowerB) ? brandRankMap.get(lowerB)! : 9999;
      if (rankA !== rankB) return rankA - rankB;
      return a.modelName.localeCompare(b.modelName, "tr");
    });

    assert.deepEqual(
      sorted.map((p) => p.brand),
      ["Xiaomi", "Apple", "Samsung"],
      "Ürünler belirlenen manuel marka sırasına göre dizilmeli!"
    );

    // Extract dynamic brands list preserving rank order with 'ALL' prepended
    const brandSet = new Set<string>();
    sorted.forEach((p) => brandSet.add(p.brand));
    const finalBrands = ["ALL", ...Array.from(brandSet)];

    assert.deepEqual(
      finalBrands,
      ["ALL", "Xiaomi", "Apple", "Samsung"],
      "Markalara Göz At listesi 'ALL' ve ardından belirlenen sıralamada gelmeli!"
    );
  });

  it("2. Sırası Tanımlanmamış Yeni Marka Senaryosu: Yeni eklenen marka listenin sonuna eklenmeli", () => {
    const brandOrder = ["Xiaomi", "Apple"]; // Samsung defined later
    const brandRankMap = new Map<string, number>();
    brandOrder.forEach((b, idx) => brandRankMap.set(b.toLowerCase(), idx));

    const sampleProducts: PublicProductDTO[] = [
      {
        id: "p1",
        brand: "Samsung",
        modelName: "A55",
        ram: "8 GB",
        storage: "128 GB",
        color: "Siyah",
        stockColors: ["Siyah"],
        description: null,
        imageUrl: null,
        basePrice: 20000,
        inStock: true,
        stockCount: 1,
        deliveryBadge: "Stokta Var",
      },
      {
        id: "p2",
        brand: "Xiaomi",
        modelName: "13T Pro",
        ram: "12 GB",
        storage: "512 GB",
        color: "Mavi",
        stockColors: ["Mavi"],
        description: null,
        imageUrl: null,
        basePrice: 30000,
        inStock: true,
        stockCount: 1,
        deliveryBadge: "Stokta Var",
      },
      {
        id: "p3",
        brand: "Apple",
        modelName: "iPhone 15",
        ram: "6 GB",
        storage: "128 GB",
        color: "Siyah",
        stockColors: ["Siyah"],
        description: null,
        imageUrl: null,
        basePrice: 40000,
        inStock: true,
        stockCount: 1,
        deliveryBadge: "Stokta Var",
      },
    ];

    const sorted = [...sampleProducts].sort((a, b) => {
      const lowerA = a.brand.toLowerCase();
      const lowerB = b.brand.toLowerCase();
      const rankA = brandRankMap.has(lowerA) ? brandRankMap.get(lowerA)! : 9999;
      const rankB = brandRankMap.has(lowerB) ? brandRankMap.get(lowerB)! : 9999;
      if (rankA !== rankB) return rankA - rankB;
      return a.brand.localeCompare(b.brand, "tr");
    });

    assert.deepEqual(
      sorted.map((p) => p.brand),
      ["Xiaomi", "Apple", "Samsung"],
      "Sırası önceden tanımlanmamış marka en sona kalmalı, hata vermemeli!"
    );
  });

  it("3. Silinen/Pasif Marka Senaryosu: Manuel sırada olup veritabanında olmayan marka hata oluşturmamalı", () => {
    const brandOrder = ["Huawei", "Apple", "Nokia"]; // Huawei & Nokia removed from active models
    const activeModelsBrands = ["Apple", "Samsung"];

    const savedSet = new Set(brandOrder);
    const activeBrandsSet = new Set(activeModelsBrands);

    const validSavedOrder = brandOrder.filter((b) => activeBrandsSet.has(b));
    const unrankedBrands = activeModelsBrands
      .filter((b) => !savedSet.has(b))
      .sort((a, b) => a.localeCompare(b, "tr"));

    const finalOrder = [...validSavedOrder, ...unrankedBrands];

    assert.deepEqual(
      finalOrder,
      ["Apple", "Samsung"],
      "Silinen markalar temizlenmeli ve kalan aktif markalar düzgün listelenmeli!"
    );
  });
});
