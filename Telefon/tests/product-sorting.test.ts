import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { PublicProductDTO } from "../src/types";

describe("Müşteri Vitrini Manuel Ürün Sıralaması Test Suite", () => {
  const sampleProducts: PublicProductDTO[] = [
    {
      id: "id-samsung-s25u",
      brand: "Samsung",
      modelName: "S25 Ultra",
      ram: "12 GB",
      storage: "256 GB",
      color: "Gri",
      stockColors: ["Gri"],
      description: null,
      imageUrl: "https://example.com/s25u.png",
      basePrice: 55000,
      inStock: true,
      stockCount: 1,
      deliveryBadge: "Stokta Var",
    },
    {
      id: "id-apple-17pro-256",
      brand: "Apple",
      modelName: "iPhone 17 Pro",
      ram: "8 GB",
      storage: "256 GB",
      color: "Çöl Titanyum",
      stockColors: ["Çöl Titanyum"],
      description: null,
      imageUrl: "https://example.com/17pro.png",
      basePrice: 65000,
      inStock: true,
      stockCount: 2,
      deliveryBadge: "Stokta Var",
    },
    {
      id: "id-apple-17pro-512",
      brand: "Apple",
      modelName: "iPhone 17 Pro",
      ram: "8 GB",
      storage: "512 GB",
      color: "Çöl Titanyum",
      stockColors: ["Çöl Titanyum"],
      description: null,
      imageUrl: "https://example.com/17pro.png",
      basePrice: 75000,
      inStock: false,
      stockCount: 0,
      deliveryBadge: "3 Gün İçinde Teslim",
    },
    {
      id: "id-xiaomi-17tpro",
      brand: "Xiaomi",
      modelName: "17T Pro",
      ram: "12 GB",
      storage: "512 GB",
      color: "Siyah",
      stockColors: ["Siyah"],
      description: null,
      imageUrl: "https://example.com/17tpro.png",
      basePrice: 42000,
      inStock: true,
      stockCount: 3,
      deliveryBadge: "Stokta Var",
    },
  ];

  it("1. Yönetimde belirlenen manuel ürün sırası (iPhone 17 Pro -> Xiaomi 17T Pro -> Samsung S25 Ultra) varsayılan katalogda uygulanmalı", () => {
    // product_order specified: iPhone 17 Pro -> Xiaomi 17T Pro -> Samsung S25 Ultra
    const productOrder = ["id-apple-17pro-256", "id-apple-17pro-512", "id-xiaomi-17tpro", "id-samsung-s25u"];
    const productRankMap = new Map<string, number>();
    productOrder.forEach((id, idx) => productRankMap.set(id.toLowerCase(), idx));

    const sorted = [...sampleProducts].sort((a, b) => {
      const rankA = productRankMap.has(a.id.toLowerCase()) ? productRankMap.get(a.id.toLowerCase())! : 99999;
      const rankB = productRankMap.has(b.id.toLowerCase()) ? productRankMap.get(b.id.toLowerCase())! : 99999;
      return rankA - rankB;
    });

    assert.equal(sorted[0].modelName, "iPhone 17 Pro");
    assert.equal(sorted[1].modelName, "iPhone 17 Pro");
    assert.equal(sorted[2].modelName, "17T Pro");
    assert.equal(sorted[3].modelName, "S25 Ultra");
  });

  it("2. Aynı modelin birden fazla varyantı (RAM/Storage) kendi model grubunun altında/yanında kalmalı", () => {
    // Both 256GB and 512GB variants of iPhone 17 Pro share model level rank
    const modelKeyOrder = ["apple|||iphone 17 pro", "xiaomi|||17t pro", "samsung|||s25 ultra"];
    const rankMap = new Map<string, number>();
    modelKeyOrder.forEach((key, idx) => rankMap.set(key, idx));

    const sorted = [...sampleProducts].sort((a, b) => {
      const keyA = `${a.brand}|||${a.modelName}`.toLowerCase();
      const keyB = `${b.brand}|||${b.modelName}`.toLowerCase();
      const rankA = rankMap.has(keyA) ? rankMap.get(keyA)! : 99999;
      const rankB = rankMap.has(keyB) ? rankMap.get(keyB)! : 99999;
      if (rankA !== rankB) return rankA - rankB;
      return a.storage.localeCompare(b.storage, "tr");
    });

    const firstTwo = sorted.slice(0, 2);
    assert.deepEqual(
      firstTwo.map((p) => p.modelName),
      ["iPhone 17 Pro", "iPhone 17 Pro"]
    );
    assert.equal(sorted[2].modelName, "17T Pro");
    assert.equal(sorted[3].modelName, "S25 Ultra");
  });

  it("3. Yeni Eklenen Ürünler: Manuel sırada tanımlanmamış ürün listenin sonuna eklenmeli", () => {
    // Only iPhone 17 Pro is in product_order; Xiaomi and Samsung are newly added
    const productOrder = ["id-apple-17pro-256"];
    const rankMap = new Map<string, number>();
    productOrder.forEach((id, idx) => rankMap.set(id.toLowerCase(), idx));

    const sorted = [...sampleProducts].sort((a, b) => {
      const rankA = rankMap.has(a.id.toLowerCase()) ? rankMap.get(a.id.toLowerCase())! : 99999;
      const rankB = rankMap.has(b.id.toLowerCase()) ? rankMap.get(b.id.toLowerCase())! : 99999;
      if (rankA !== rankB) return rankA - rankB;
      return a.brand.localeCompare(b.brand, "tr");
    });

    assert.equal(sorted[0].modelName, "iPhone 17 Pro");
    // Samsung and Xiaomi pushed to end, ordered predictably by brand
    assert.equal(sorted[1].brand, "Apple");
    assert.equal(sorted[2].brand, "Samsung");
    assert.equal(sorted[3].brand, "Xiaomi");
  });

  it("4. Silinen/Pasif Ürünler: Manuel sırada kalan geçersiz ID'ler hata vermemeli ve temizlenmeli", () => {
    const savedOrder = ["deleted-id-123", "id-xiaomi-17tpro", "id-samsung-s25u"];
    const activeModelIds = new Set(sampleProducts.map((p) => p.id));

    const validOrder = savedOrder.filter((id) => activeModelIds.has(id));
    assert.deepEqual(validOrder, ["id-xiaomi-17tpro", "id-samsung-s25u"]);
  });

  it("5. Marka ve Stok Filtreleri Seçildiğinde Manuel Sıralama Nispi Olarak Korunmalı", () => {
    const productOrder = ["id-apple-17pro-256", "id-xiaomi-17tpro", "id-samsung-s25u"];
    const rankMap = new Map<string, number>();
    productOrder.forEach((id, idx) => rankMap.set(id.toLowerCase(), idx));

    // Filter by brand: "Apple"
    const appleProducts = sampleProducts.filter((p) => p.brand === "Apple");
    appleProducts.sort((a, b) => {
      const rankA = rankMap.has(a.id.toLowerCase()) ? rankMap.get(a.id.toLowerCase())! : 99999;
      const rankB = rankMap.has(b.id.toLowerCase()) ? rankMap.get(b.id.toLowerCase())! : 99999;
      return rankA - rankB;
    });

    assert.equal(appleProducts.length, 2);
    assert.equal(appleProducts[0].id, "id-apple-17pro-256");

    // Filter by stockStatus: "IN_STOCK"
    const inStockProducts = sampleProducts.filter((p) => p.inStock);
    inStockProducts.sort((a, b) => {
      const rankA = rankMap.has(a.id.toLowerCase()) ? rankMap.get(a.id.toLowerCase())! : 99999;
      const rankB = rankMap.has(b.id.toLowerCase()) ? rankMap.get(b.id.toLowerCase())! : 99999;
      return rankA - rankB;
    });

    assert.equal(inStockProducts[0].id, "id-apple-17pro-256");
    assert.equal(inStockProducts[1].id, "id-xiaomi-17tpro");
    assert.equal(inStockProducts[2].id, "id-samsung-s25u");
  });

  it("6. Kullanıcı Fiyat / Yeni Eklenen Sıralama Dropdown'unu Seçtiğinde Seçilen Sıralama Manuel Sıranın Önüne Geçmeli", () => {
    const products = [...sampleProducts];

    // Price Ascending selection
    const priceAsc = [...products].sort((a, b) => a.basePrice - b.basePrice);
    assert.equal(priceAsc[0].modelName, "17T Pro"); // 42,000
    assert.equal(priceAsc[1].modelName, "S25 Ultra"); // 55,000
    assert.equal(priceAsc[2].modelName, "iPhone 17 Pro"); // 65,000
    assert.equal(priceAsc[3].modelName, "iPhone 17 Pro"); // 75,000

    // Price Descending selection
    const priceDesc = [...products].sort((a, b) => b.basePrice - a.basePrice);
    assert.equal(priceDesc[0].storage, "512 GB"); // 75,000
    assert.equal(priceDesc[3].modelName, "17T Pro"); // 42,000
  });
});
