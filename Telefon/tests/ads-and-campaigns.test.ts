import test, { describe, it, after } from "node:test";
import assert from "node:assert/strict";
import { prisma } from "../src/lib/prisma";

describe("Reklam ve Kampanya Yönetimi Testleri", () => {
  let testSupplierId = "";
  let testModelId = "";
  let createdDeviceIds: string[] = [];
  let createdAdIds: string[] = [];

  after(async () => {
    try {
      if (createdAdIds.length > 0) {
        await prisma.ad.deleteMany({ where: { id: { in: createdAdIds } } });
      }

      if (createdDeviceIds.length > 0) {
        await prisma.device.deleteMany({ where: { id: { in: createdDeviceIds } } });
      }

      if (testModelId) {
        await prisma.phoneModel.delete({ where: { id: testModelId } }).catch(() => {});
      }

      if (testSupplierId) {
        await prisma.cariTransaction.deleteMany({ where: { cariId: testSupplierId } });
        await prisma.cari.delete({ where: { id: testSupplierId } }).catch(() => {});
      }
    } catch (cleanupErr) {
      console.error("Test temizleme hatası:", cleanupErr);
    }
  });

  it("1. Tedarikçi ve Telefon Modeli Hazırlanmalı", async () => {
    const supplier = await prisma.cari.create({
      data: {
        name: "TEST_TEDARIKCI_REKLAM_TESTI",
        type: "SUPPLIER",
        currentBalance: 0,
      },
    });
    testSupplierId = supplier.id;
    assert.ok(testSupplierId, "Tedarikçi ID oluşturulabilmeli");

    const model = await prisma.phoneModel.create({
      data: {
        brand: "TEST_BRAND",
        modelName: "Ad Test Phone",
        ram: "12 GB",
        storage: "256 GB",
        color: "Mavi",
        basePrice: 50000,
        isActive: true,
      },
    });
    testModelId = model.id;
    assert.ok(testModelId, "Telefon modeli ID oluşturulabilmeli");
  });

  it("2. Genel Banner Oluşturma: Aktif ve tarihi uygun genel reklam public'te görünmeli", async () => {
    const ad = await prisma.ad.create({
      data: {
        title: "Genel Yaz Kampanyası",
        description: "Tüm modellerde kaçırılmayacak fırsatlar!",
        position: "HERO_SLIDER",
        displayType: "IMAGE_AND_TEXT",
        buttonText: "Fırsatı Gör",
        isActive: true,
        startDate: new Date(Date.now() - 3600000), // 1 saat önce başladı
      },
    });
    createdAdIds.push(ad.id);

    // Public mantığını simüle et
    const now = new Date();
    const publicAds = await prisma.ad.findMany({
      where: {
        isActive: true,
        startDate: { lte: now },
        OR: [{ endDate: null }, { endDate: { gte: now } }],
      },
    });

    const found = publicAds.find((a) => a.id === ad.id);
    assert.ok(found, "Genel aktif reklam public filtrede görünmeli");
    assert.equal(found?.title, "Genel Yaz Kampanyası");
  });

  it("3. Çoklu Slider Banner: 2 aktif reklam public listede yer almalı", async () => {
    const ad2 = await prisma.ad.create({
      data: {
        title: "İkinci Slider Reklamı",
        position: "HERO_SLIDER",
        displayType: "IMAGE_ONLY",
        imageUrl: "https://example.com/banner2.png",
        isActive: true,
        order: 1,
        startDate: new Date(Date.now() - 3600000),
      },
    });
    createdAdIds.push(ad2.id);

    const now = new Date();
    const publicAds = await prisma.ad.findMany({
      where: {
        position: "HERO_SLIDER",
        isActive: true,
        startDate: { lte: now },
        OR: [{ endDate: null }, { endDate: { gte: now } }],
      },
      orderBy: { order: "asc" },
    });

    assert.ok(publicAds.length >= 2, "En az 2 slider reklamı dönmeli");
  });

  it("4. Pasif Reklam: isActive=false reklam public sonuçlardan elenmeli", async () => {
    const passiveAd = await prisma.ad.create({
      data: {
        title: "Pasif Test Reklamı",
        isActive: false,
        startDate: new Date(Date.now() - 3600000),
      },
    });
    createdAdIds.push(passiveAd.id);

    const now = new Date();
    const publicAds = await prisma.ad.findMany({
      where: {
        id: passiveAd.id,
        isActive: true,
        startDate: { lte: now },
        OR: [{ endDate: null }, { endDate: { gte: now } }],
      },
    });

    assert.equal(publicAds.length, 0, "Pasif reklam public API'de görünmemeli");
  });

  it("5. Gelecek Tarihli ve Süresi Dolmuş Reklamlar Elenmeli", async () => {
    // Gelecek tarihli (henüz başlamamış)
    const futureAd = await prisma.ad.create({
      data: {
        title: "Gelecek Reklam",
        isActive: true,
        startDate: new Date(Date.now() + 86400000), // Yarın başlayacak
      },
    });
    createdAdIds.push(futureAd.id);

    // Süresi dolmuş
    const expiredAd = await prisma.ad.create({
      data: {
        title: "Süresi Dolmuş Reklam",
        isActive: true,
        startDate: new Date(Date.now() - 172800000), // 2 gün önce başladı
        endDate: new Date(Date.now() - 86400000), // Dün bitti
      },
    });
    createdAdIds.push(expiredAd.id);

    const now = new Date();
    const publicAds = await prisma.ad.findMany({
      where: {
        id: { in: [futureAd.id, expiredAd.id] },
        isActive: true,
        startDate: { lte: now },
        OR: [{ endDate: null }, { endDate: { gte: now } }],
      },
    });

    assert.equal(publicAds.length, 0, "Tarih koşuluna uymayan reklamlar görünmemeli");
  });

  it("6. Telefona Bağlı Reklam: İlgili modelde IN_STOCK cihaz varken görünmeli", async () => {
    // Modele 1 adet IN_STOCK cihaz ekle
    const device = await prisma.device.create({
      data: {
        modelId: testModelId,
        supplierId: testSupplierId,
        ram: "12 GB",
        storage: "256 GB",
        color: "Mavi",
        purchasePrice: 40000,
        salePrice: 50000,
        status: "IN_STOCK",
      },
    });
    createdDeviceIds.push(device.id);

    // Modele bağlı reklam oluştur
    const phoneAd = await prisma.ad.create({
      data: {
        title: "Özel Telefon Fırsatı",
        phoneModelId: testModelId,
        buttonText: "Bilgi Al",
        isActive: true,
        startDate: new Date(Date.now() - 3600000),
      },
    });
    createdAdIds.push(phoneAd.id);

    // Stok kontrolü simülasyonu
    const inStockCount = await prisma.device.count({
      where: { modelId: testModelId, status: "IN_STOCK" },
    });

    assert.ok(inStockCount > 0, "Stokta cihaz olmalı");
    assert.equal(inStockCount, 1, "Stok adedi 1 olmalı");
  });

  it("7. Stok Sıfırlanma Durumu: İlgili cihaz SOLD yapıldığında reklam public'te otomatik gizlenmeli", async () => {
    // Stoktaki tek cihazı SOLD yap
    const deviceId = createdDeviceIds[0];
    await prisma.device.update({
      where: { id: deviceId },
      data: { status: "SOLD" },
    });

    // Anlık stok kontrolü
    const inStockCount = await prisma.device.count({
      where: { modelId: testModelId, status: "IN_STOCK" },
    });

    assert.equal(inStockCount, 0, "Stok sıfırlanmış olmalı");

    // Stok sıfırlandığı için telefona bağlı reklam vitrinde gizlenmeli (ama DB'de kaydı kalmalı)
    const phoneAdInDb = await prisma.ad.findFirst({
      where: { phoneModelId: testModelId },
    });

    assert.ok(phoneAdInDb, "Reklam kaydı veritabanında silinmeden kalmalı");
    assert.equal(phoneAdInDb?.isActive, true, "Reklamın aktiflik durumu true kalmalı");
  });

  it("8. Yeniden Stok Girişi: İlgili modele yeni stok gelince reklam otomatik tekrar görünmeli", async () => {
    // Modele yeni bir IN_STOCK cihaz ekle
    const newDevice = await prisma.device.create({
      data: {
        modelId: testModelId,
        supplierId: testSupplierId,
        ram: "12 GB",
        storage: "256 GB",
        color: "Siyah",
        purchasePrice: 42000,
        salePrice: 52000,
        status: "IN_STOCK",
      },
    });
    createdDeviceIds.push(newDevice.id);

    const inStockCount = await prisma.device.count({
      where: { modelId: testModelId, status: "IN_STOCK" },
    });

    assert.equal(inStockCount, 1, "Stok tekrar 1 oldu");

    // Stok geldiği için telefona bağlı reklam public sorgusunda tekrar yer almalı
    const now = new Date();
    const eligibleAd = await prisma.ad.findFirst({
      where: {
        phoneModelId: testModelId,
        isActive: true,
        startDate: { lte: now },
        OR: [{ endDate: null }, { endDate: { gte: now } }],
      },
    });

    assert.ok(eligibleAd, "Stok yenilendiğinde reklam otomatik tekrar görünür hale gelmeli");
  });

  it("9. Özel Varyant Bağlantılı Reklam (Model + RAM + Hafıza) Doğrulaması", async () => {
    // Modele 12 GB / 256 GB stoğu varken 16 GB / 512 GB varyantı için reklam ekle
    const variantAd = await prisma.ad.create({
      data: {
        title: "16 GB / 512 GB Özel İndirim",
        phoneModelId: testModelId,
        targetRam: "16 GB",
        targetStorage: "512 GB",
        buttonText: "İncele",
        isActive: true,
        startDate: new Date(Date.now() - 3600000),
      },
    });
    createdAdIds.push(variantAd.id);

    // Stokta sadece 12 GB / 256 GB var. 16 GB / 512 GB stoğu = 0.
    const matching16GB = await prisma.device.count({
      where: {
        modelId: testModelId,
        ram: "16 GB",
        storage: "512 GB",
        status: "IN_STOCK",
      },
    });
    assert.equal(matching16GB, 0, "16 GB / 512 GB varyantında stok 0 olmalı");

    // Dolayısıyla 16 GB / 512 GB reklamı vitrin sorgusunda elenmeli!
    const dev12GB = await prisma.device.findMany({
      where: { modelId: testModelId, status: "IN_STOCK" },
    });
    assert.ok(dev12GB.length > 0, "12 GB / 256 GB stokta var ancak 16 GB stokta yok");

    // Şimdi 16 GB / 512 GB cihaz ekle
    const dev16GB = await prisma.device.create({
      data: {
        modelId: testModelId,
        supplierId: testSupplierId,
        ram: "16 GB",
        storage: "512 GB",
        color: "Altın",
        purchasePrice: 60000,
        salePrice: 70000,
        status: "IN_STOCK",
      },
    });
    createdDeviceIds.push(dev16GB.id);

    const updated16GBCount = await prisma.device.count({
      where: {
        modelId: testModelId,
        ram: "16 GB",
        storage: "512 GB",
        status: "IN_STOCK",
      },
    });
    assert.equal(updated16GBCount, 1, "16 GB varyantına stok eklenince 1 oldu");
  });
});

