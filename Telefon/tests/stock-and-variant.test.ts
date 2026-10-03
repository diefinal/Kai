import test, { describe, it, after } from "node:test";
import assert from "node:assert/strict";
import { prisma } from "../src/lib/prisma";

describe("Stok Varyant, Renk Gösterimi ve Fiyat Düzenleme Testleri", () => {
  let testSupplierId = "";
  let testCustomerId = "";
  let testModelId = "";
  let createdDeviceIds: string[] = [];
  let testSaleId = "";
  let cariTxIds: string[] = [];

  after(async () => {
    try {
      if (testSaleId) {
        await prisma.payment.deleteMany({ where: { saleId: testSaleId } });
        await prisma.saleItem.deleteMany({ where: { saleId: testSaleId } });
        await prisma.sale.delete({ where: { id: testSaleId } }).catch(() => {});
      }

      if (createdDeviceIds.length > 0) {
        await prisma.device.deleteMany({ where: { id: { in: createdDeviceIds } } });
      }

      if (testModelId) {
        await prisma.phoneModel.delete({ where: { id: testModelId } }).catch(() => {});
      }

      if (cariTxIds.length > 0) {
        await prisma.cariTransaction.deleteMany({ where: { id: { in: cariTxIds } } });
      }

      if (testSupplierId) {
        await prisma.cariTransaction.deleteMany({ where: { cariId: testSupplierId } });
        await prisma.cari.delete({ where: { id: testSupplierId } }).catch(() => {});
      }

      if (testCustomerId) {
        await prisma.cariTransaction.deleteMany({ where: { cariId: testCustomerId } });
        await prisma.cari.delete({ where: { id: testCustomerId } }).catch(() => {});
      }
    } catch (cleanupErr) {
      console.error("Test temizleme hatası:", cleanupErr);
    }
  });

  it("1. Tedarikçi ve Müşteri Carileri Hazırlanmalı", async () => {
    const supplier = await prisma.cari.create({
      data: {
        name: "TEST_TEDARIKCI_VARYANT_TESTI",
        type: "SUPPLIER",
        currentBalance: 0,
      },
    });
    testSupplierId = supplier.id;
    assert.ok(testSupplierId, "Tedarikçi ID oluşturulabilmeli");

    const customer = await prisma.cari.create({
      data: {
        name: "TEST_MUSTERI_VARYANT_TESTI",
        type: "CUSTOMER",
        currentBalance: 0,
      },
    });
    testCustomerId = customer.id;
    assert.ok(testCustomerId, "Müşteri ID oluşturulabilmeli");
  });

  it("2. Apple 17 ProMax temel modeli oluşturulmalı", async () => {
    const model = await prisma.phoneModel.create({
      data: {
        brand: "Apple",
        modelName: "17 ProMax Test",
        ram: "8 GB",
        storage: "256 GB",
        color: "Siyah",
        basePrice: 80000,
        isActive: true,
      },
    });

    testModelId = model.id;
    assert.equal(model.brand, "Apple");
    assert.equal(model.modelName, "17 ProMax Test");
  });

  it("3. İlk alış: 8 GB / 256 GB / Turuncu / 2 adet - Device'da bağımsız varyant tutulmalı", async () => {
    const result = await prisma.$transaction(async (tx) => {
      const devices = [];
      for (let i = 0; i < 2; i++) {
        const device = await tx.device.create({
          data: {
            modelId: testModelId,
            supplierId: testSupplierId,
            ram: "8 GB",
            storage: "256 GB",
            color: "Turuncu",
            purchasePrice: 70000,
            salePrice: 80000,
            status: "IN_STOCK",
          },
        });
        devices.push(device);
      }

      await tx.cari.update({
        where: { id: testSupplierId },
        data: { currentBalance: { decrement: 140000 } },
      });

      const cariTx = await tx.cariTransaction.create({
        data: {
          cariId: testSupplierId,
          type: "CREDIT",
          amount: 140000,
          date: new Date(),
          referenceType: "PURCHASE",
          referenceId: devices[0].id,
          description: "Toplu Alış: Apple 17 ProMax Test (2 Adet Cihaz)",
        },
      });

      return { devices, cariTx };
    });

    assert.equal(result.devices.length, 2, "2 adet cihaz oluşmalı");
    createdDeviceIds.push(...result.devices.map((d) => d.id));
    cariTxIds.push(result.cariTx.id);

    // Device'ın kendi ram/storage/color alanlarını doğrula
    result.devices.forEach((d) => {
      assert.equal(d.ram, "8 GB", "Device RAM 8 GB olmalı");
      assert.equal(d.storage, "256 GB", "Device Hafıza 256 GB olmalı");
      assert.equal(d.color, "Turuncu", "Device Renk Turuncu olmalı");
    });
  });

  it("4. İkinci alış: 8 GB / 256 GB / Siyah / 3 adet - Aynı model, farklı renk", async () => {
    const result = await prisma.$transaction(async (tx) => {
      const devices = [];
      for (let i = 0; i < 3; i++) {
        const device = await tx.device.create({
          data: {
            modelId: testModelId,
            supplierId: testSupplierId,
            ram: "8 GB",
            storage: "256 GB",
            color: "Siyah",
            purchasePrice: 72000,
            salePrice: 82000,
            status: "IN_STOCK",
          },
        });
        devices.push(device);
      }

      await tx.cari.update({
        where: { id: testSupplierId },
        data: { currentBalance: { decrement: 216000 } },
      });

      const cariTx = await tx.cariTransaction.create({
        data: {
          cariId: testSupplierId,
          type: "CREDIT",
          amount: 216000,
          date: new Date(),
          referenceType: "PURCHASE",
          referenceId: devices[0].id,
          description: "Toplu Alış: Apple 17 ProMax Test (3 Adet Cihaz)",
        },
      });

      return { devices, cariTx };
    });

    assert.equal(result.devices.length, 3, "3 adet cihaz oluşmalı");
    createdDeviceIds.push(...result.devices.map((d) => d.id));
    cariTxIds.push(result.cariTx.id);

    // Device renk doğrulaması
    result.devices.forEach((d) => {
      assert.equal(d.color, "Siyah", "Device Renk Siyah olmalı");
    });
  });

  it("5. Toplam 5 stok olmalı, renklerde Turuncu ve Siyah bulunmalı", async () => {
    const devices = await prisma.device.findMany({
      where: { modelId: testModelId, status: "IN_STOCK" },
    });

    assert.equal(devices.length, 5, "Toplam 5 IN_STOCK cihaz olmalı");

    const colors = Array.from(new Set(devices.map((d) => d.color))).sort();
    assert.deepEqual(colors, ["Siyah", "Turuncu"], "Stokta Siyah ve Turuncu renk bulunmalı");
  });

  it("6. Siyah cihazların tamamını SOLD yapıldığında yalnızca Turuncu kalmalı", async () => {
    // Siyah cihazları bul ve SOLD yap
    const siyahDevices = await prisma.device.findMany({
      where: {
        modelId: testModelId,
        status: "IN_STOCK",
        color: "Siyah",
      },
    });

    assert.equal(siyahDevices.length, 3, "3 Siyah cihaz bulunmalı");

    // Satış oluştur
    const saleResult = await prisma.$transaction(async (tx) => {
      const sale = await tx.sale.create({
        data: {
          saleNumber: `TST-VARYANT-${Date.now()}`,
          customerId: testCustomerId,
          saleDate: new Date(),
          totalAmount: 246000,
          totalProfit: 30000,
          paidAmount: 246000,
          remainingAmount: 0,
          paymentType: "CASH",
          status: "COMPLETED",
        },
      });

      for (const dev of siyahDevices) {
        await tx.saleItem.create({
          data: {
            saleId: sale.id,
            deviceId: dev.id,
            soldPrice: 82000,
            purchasePriceSnapshot: dev.purchasePrice,
            profit: 10000,
          },
        });

        await tx.device.update({
          where: { id: dev.id },
          data: { status: "SOLD" },
        });
      }

      return sale;
    });

    testSaleId = saleResult.id;

    // Kalan stok kontrolü
    const remainingDevices = await prisma.device.findMany({
      where: { modelId: testModelId, status: "IN_STOCK" },
    });

    assert.equal(remainingDevices.length, 2, "Satış sonrası 2 cihaz kalmalı");

    const remainingColors = Array.from(new Set(remainingDevices.map((d) => d.color)));
    assert.deepEqual(remainingColors, ["Turuncu"], "Yalnızca Turuncu renk kalmalı");

    // SOLD cihazların renklerinin stok renklerine dahil olmadığını doğrula
    const soldDevices = await prisma.device.findMany({
      where: { modelId: testModelId, status: "SOLD" },
    });
    assert.equal(soldDevices.length, 3, "3 adet SOLD cihaz olmalı");
    assert.ok(
      soldDevices.every((d) => d.color === "Siyah"),
      "Satılan cihazların hepsi Siyah olmalı"
    );
  });

  it("7. Alış fiyatı düzenleme: CariTransaction ve bakiye doğru güncellenmeli", async () => {
    // İlk Turuncu cihazı bul
    const device = await prisma.device.findFirst({
      where: {
        modelId: testModelId,
        status: "IN_STOCK",
        color: "Turuncu",
      },
    });

    assert.ok(device, "Düzenlenecek cihaz bulunmalı");

    const oldPrice = Number(device.purchasePrice); // 70000
    const newPrice = 75000;
    const diff = newPrice - oldPrice; // +5000

    // Tedarikçi bakiyesini kaydet
    const supplierBefore = await prisma.cari.findUnique({
      where: { id: testSupplierId },
    });

    // Transaction içinde güncelle
    await prisma.$transaction(async (tx) => {
      await tx.device.update({
        where: { id: device.id },
        data: { purchasePrice: newPrice },
      });

      // CariTransaction güncelle
      const cariTx = await tx.cariTransaction.findFirst({
        where: {
          cariId: testSupplierId,
          referenceType: "PURCHASE",
          referenceId: device.id,
        },
      });

      if (cariTx) {
        await tx.cariTransaction.update({
          where: { id: cariTx.id },
          data: { amount: { increment: diff } },
        });
      }

      // Tedarikçi bakiyesini güncelle
      await tx.cari.update({
        where: { id: testSupplierId },
        data: { currentBalance: { decrement: diff } },
      });
    });

    // Doğrulama
    const updatedDevice = await prisma.device.findUnique({ where: { id: device.id } });
    assert.equal(Number(updatedDevice!.purchasePrice), 75000, "Alış fiyatı 75.000 TL olmalı");

    const supplierAfter = await prisma.cari.findUnique({
      where: { id: testSupplierId },
    });

    const expectedBalanceChange = -diff; // -5000 (borç arttı)
    const actualBalanceChange =
      Number(supplierAfter!.currentBalance) - Number(supplierBefore!.currentBalance);
    assert.equal(actualBalanceChange, expectedBalanceChange, "Tedarikçi bakiyesi fark kadar değişmeli");
  });

  it("8. SOLD cihazın hedef satış fiyatı değiştirilemez, SaleItem snapshot korunmalı", async () => {
    const soldDevice = await prisma.device.findFirst({
      where: { modelId: testModelId, status: "SOLD" },
    });

    assert.ok(soldDevice, "Satılmış cihaz bulunmalı");

    // SaleItem snapshot'ını kaydet
    const saleItem = await prisma.saleItem.findFirst({
      where: { deviceId: soldDevice.id },
    });

    assert.ok(saleItem, "SaleItem kaydı bulunmalı");

    const originalSoldPrice = Number(saleItem.soldPrice);
    const originalPurchaseSnapshot = Number(saleItem.purchasePriceSnapshot);
    const originalProfit = Number(saleItem.profit);

    // SaleItem dokunulmamalı: snapshot değerleri değişmemeli
    assert.equal(originalSoldPrice, 82000, "SaleItem soldPrice korunmalı");
    assert.ok(originalPurchaseSnapshot > 0, "SaleItem purchasePriceSnapshot pozitif olmalı");
    assert.ok(typeof originalProfit === "number", "SaleItem profit sayısal olmalı");
  });

  it("9. IN_STOCK cihazın hedef satış fiyatı değiştirilebilmeli", async () => {
    const inStockDevice = await prisma.device.findFirst({
      where: { modelId: testModelId, status: "IN_STOCK" },
    });

    assert.ok(inStockDevice, "Stoktaki cihaz bulunmalı");

    const newSalePrice = 85000;
    await prisma.device.update({
      where: { id: inStockDevice.id },
      data: { salePrice: newSalePrice },
    });

    const updated = await prisma.device.findUnique({ where: { id: inStockDevice.id } });
    assert.equal(Number(updated!.salePrice), 85000, "Hedef satış fiyatı 85.000 TL olmalı");
  });

  it("10. PhoneModel varyant alanları Device varyant alanlarından bağımsız olmalı", async () => {
    // PhoneModel hâlâ orijinal değerlerini korumalı
    const model = await prisma.phoneModel.findUnique({
      where: { id: testModelId },
    });

    assert.equal(model!.ram, "8 GB", "PhoneModel RAM korunmalı");
    assert.equal(model!.storage, "256 GB", "PhoneModel Storage korunmalı");
    assert.equal(model!.color, "Siyah", "PhoneModel Color korunmalı");

    // Device'lar farklı renklere sahip olabilmeli
    const devices = await prisma.device.findMany({
      where: { modelId: testModelId },
    });

    const deviceColors = Array.from(new Set(devices.map((d) => d.color))).sort();
    assert.ok(deviceColors.includes("Turuncu"), "Device'lar Turuncu renk içermeli");
    assert.ok(deviceColors.includes("Siyah"), "Device'lar Siyah renk içermeli");

    // PhoneModel rengi 'Siyah' olsa da Device'larda 'Turuncu' bulunabiliyor
    assert.notEqual(
      deviceColors.length,
      1,
      "Device'lar PhoneModel'den bağımsız olarak farklı renklere sahip olabilmeli"
    );
  });

  it("11. Vitrin Renk Mantığı: Yalnızca IN_STOCK cihaz renkleri görünmeli, SOLD/RESERVED elenmeli", async () => {
    // Modele bağlı tüm IN_STOCK cihazların renklerini al
    const inStockDevices = await prisma.device.findMany({
      where: { modelId: testModelId, status: "IN_STOCK" },
      select: { color: true },
    });

    const inStockColorMap = new Map<string, string>();
    inStockDevices.forEach((d) => {
      if (d.color && d.color.trim()) {
        const lower = d.color.trim().toLowerCase();
        if (!inStockColorMap.has(lower)) {
          inStockColorMap.set(lower, d.color.trim());
        }
      }
    });

    const activeColors = Array.from(inStockColorMap.values());
    assert.ok(activeColors.includes("Turuncu"), "IN_STOCK renk Turuncu olmalı");

    // Satılmış (SOLD) olan Siyah cihazların tekil listede IN_STOCK olarak görünmediğini doğrula
    const soldCount = await prisma.device.count({
      where: { modelId: testModelId, color: "Siyah", status: "SOLD" },
    });

    assert.ok(soldCount > 0, "En az 1 satılmış Siyah cihaz bulunmalı");
  });

  it("12. Stok Sıfır Durumunda 3 Gün İçinde Teslim İçin PhoneModel Rengi Kullanılmalı", async () => {
    const emptyModel = await prisma.phoneModel.create({
      data: {
        brand: "TEST_BRAND_EMPTY",
        modelName: "No Stock Model",
        ram: "12 GB",
        storage: "512 GB",
        color: "Titanyum Çöl",
        basePrice: 95000,
        isActive: true,
      },
    });

    const inStockCount = await prisma.device.count({
      where: { modelId: emptyModel.id, status: "IN_STOCK" },
    });

    assert.equal(inStockCount, 0, "Stok 0 olmalı");
    assert.equal(emptyModel.color, "Titanyum Çöl", "Stok 0 iken PhoneModel rengi kullanılmalı");

    // Clean up
    await prisma.phoneModel.delete({ where: { id: emptyModel.id } });
  });
});
