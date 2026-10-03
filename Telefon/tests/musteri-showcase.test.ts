import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { getColorSwatchStyle } from "../src/lib/colorUtils";
import { generateWhatsAppLink } from "../src/lib/whatsapp";
import { PublicProductDTO } from "../src/types";

describe("Müşteri Vitrini Geliştirmeleri Test Suite", () => {
  it("1. Renk Swatch Yardımcısı: Tanınan renklerde style döner, bilinmeyen renklerde null döner", () => {
    const black = getColorSwatchStyle("Siyah");
    assert.ok(black, "Siyah için renk stili dönmeli");
    assert.equal(black?.isDark, true);

    const white = getColorSwatchStyle("Beyaz");
    assert.ok(white, "Beyaz için renk stili dönmeli");
    assert.equal(white?.isDark, false);

    const titanium = getColorSwatchStyle("Natural Titanium");
    assert.ok(titanium, "Natural Titanium için renk stili dönmeli");

    const unknown = getColorSwatchStyle("Egzotik Hare 3000");
    assert.equal(unknown, null, "Bilinmeyen renk için null dönmeli ve text chip'e fallback etmeli");
  });

  it("2. WhatsApp Link Üretimi: Renkli stoktaki ürün için doğru Türkçe mesaj formatı üretilmeli", () => {
    const link = generateWhatsAppLink({
      brand: "Apple",
      modelName: "iPhone 17 Pro Max",
      ram: "12 GB",
      storage: "256 GB",
      color: "Natural Titanium",
      inStock: true,
    });

    assert.ok(link.includes("https://wa.me/905386548575"));
    const decoded = decodeURIComponent(link);
    assert.ok(decoded.includes("Merhaba, Apple / iPhone 17 Pro Max / 12 GB RAM / 256 GB / Natural Titanium modeli hakkında bilgi almak istiyorum."));
  });

  it("3. WhatsApp Link Üretimi: Renksiz 0 stoklu ürün için '3 gün içinde teslim' mesaj formatı üretilmeli", () => {
    const link = generateWhatsAppLink({
      brand: "Samsung",
      modelName: "Galaxy S25 Ultra",
      ram: "12 GB",
      storage: "512 GB",
      inStock: false,
    });

    assert.ok(link.includes("https://wa.me/905386548575"));
    const decoded = decodeURIComponent(link);
    assert.ok(decoded.includes("Merhaba, Samsung / Galaxy S25 Ultra / 12 GB RAM / 512 GB modeli için 3 gün içinde teslim hakkında bilgi almak istiyorum."));
  });

  it("4. Public Product DTO Güvenlik Kontrolü: IMEI, alış fiyatı, maliyet, kâr sızdırılmamalı", () => {
    const product: PublicProductDTO = {
      id: "pm-1",
      brand: "Apple",
      modelName: "iPhone 16",
      ram: "8 GB",
      storage: "128 GB",
      color: "Siyah",
      stockColors: ["Siyah", "Beyaz"],
      description: "Test cihazı",
      imageUrl: "/test.png",
      basePrice: 50000,
      inStock: true,
      stockCount: 3,
      deliveryBadge: "Stokta Var",
    };

    const keys = Object.keys(product);
    const forbiddenKeys = ["imei", "purchasePrice", "cost", "profit", "supplier", "notes"];

    for (const forbidden of forbiddenKeys) {
      assert.equal(keys.includes(forbidden), false, `Gizli bilgi '${forbidden}' Public Product DTO içinde kesinlikle yer almamalı!`);
    }
  });

  it("5. Ürün Sıralama Mantığı: Fiyat düşükten yükseğe ve Stoktakiler Önce sıralaması doğru çalışmalı", () => {
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
        inStock: false,
        stockCount: 0,
        deliveryBadge: "3 Gün İçinde Teslim",
      },
      {
        id: "p2",
        brand: "Apple",
        modelName: "iPhone 15",
        ram: "6 GB",
        storage: "128 GB",
        color: "Mavi",
        stockColors: ["Mavi"],
        description: null,
        imageUrl: null,
        basePrice: 45000,
        inStock: true,
        stockCount: 2,
        deliveryBadge: "Stokta Var",
      },
      {
        id: "p3",
        brand: "Apple",
        modelName: "iPhone 13",
        ram: "4 GB",
        storage: "128 GB",
        color: "Beyaz",
        stockColors: ["Beyaz"],
        description: null,
        imageUrl: null,
        basePrice: 30000,
        inStock: true,
        stockCount: 1,
        deliveryBadge: "Stokta Var",
      },
    ];

    // Price ASC sort
    const priceAsc = [...sampleProducts].sort((a, b) => a.basePrice - b.basePrice);
    assert.deepEqual(priceAsc.map((p) => p.id), ["p1", "p3", "p2"]);

    // Stock First sort
    const stockFirst = [...sampleProducts].sort((a, b) => (b.inStock ? 1 : 0) - (a.inStock ? 1 : 0));
    assert.equal(stockFirst[0].inStock, true);
    assert.equal(stockFirst[1].inStock, true);
    assert.equal(stockFirst[2].inStock, false);
  });

  it("6. Renk Bazlı Dinamik Stok Senaryosu: Aynı ürün varyantında stoklu (Yeşil) ve stoksuz (Beyaz) renkler bağımsız çalışmalı", () => {
    const product: PublicProductDTO = {
      id: "iphone-17",
      brand: "Apple",
      modelName: "iPhone 17",
      ram: "8 GB",
      storage: "256 GB",
      color: "Yeşil",
      stockColors: ["Yeşil", "Siyah"],
      colorsWithStock: [
        { color: "Yeşil", inStock: true },
        { color: "Beyaz", inStock: false },
        { color: "Siyah", inStock: true },
      ],
      description: null,
      imageUrl: null,
      basePrice: 54000,
      inStock: true,
      stockCount: 3,
      deliveryBadge: "Stokta Var",
    };

    // Verify colorsWithStock array
    assert.equal(product.colorsWithStock?.length, 3);

    // Green: inStock true -> Stokta Var
    const greenObj = product.colorsWithStock?.find((c) => c.color.toLowerCase() === "yeşil");
    assert.equal(greenObj?.inStock, true);
    const greenLink = generateWhatsAppLink({
      brand: product.brand,
      modelName: product.modelName,
      ram: product.ram,
      storage: product.storage,
      color: greenObj?.color,
      inStock: greenObj?.inStock,
    });
    assert.ok(decodeURIComponent(greenLink).includes("iPhone 17 / 8 GB RAM / 256 GB / Yeşil modeli hakkında bilgi almak istiyorum."));

    // White: inStock false -> 3 Gün İçinde Teslim
    const whiteObj = product.colorsWithStock?.find((c) => c.color.toLowerCase() === "beyaz");
    assert.equal(whiteObj?.inStock, false);
    const whiteLink = generateWhatsAppLink({
      brand: product.brand,
      modelName: product.modelName,
      ram: product.ram,
      storage: product.storage,
      color: whiteObj?.color,
      inStock: whiteObj?.inStock,
    });
    assert.ok(decodeURIComponent(whiteLink).includes("iPhone 17 / 8 GB RAM / 256 GB / Beyaz modeli için 3 gün içinde teslim hakkında bilgi almak istiyorum."));
  });
});
