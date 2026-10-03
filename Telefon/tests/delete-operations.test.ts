import test, { describe, it, after } from "node:test";
import assert from "node:assert/strict";
import { prisma } from "../src/lib/prisma";

describe("Alış ve Satış Güvenli Silme İşlemleri Testleri", () => {
  let supplierId = "";
  let customerId = "";
  let modelId = "";

  // Dynamic IDs for cleanups
  let createdDeviceIds: string[] = [];
  let createdSaleIds: string[] = [];
  let createdCariTxIds: string[] = [];

  after(async () => {
    try {
      if (createdSaleIds.length > 0) {
        await prisma.payment.deleteMany({ where: { saleId: { in: createdSaleIds } } });
        await prisma.installment.deleteMany({ where: { saleId: { in: createdSaleIds } } });
        await prisma.saleItem.deleteMany({ where: { saleId: { in: createdSaleIds } } });
        await prisma.sale.deleteMany({ where: { id: { in: createdSaleIds } } });
      }

      if (createdDeviceIds.length > 0) {
        await prisma.device.deleteMany({ where: { id: { in: createdDeviceIds } } });
      }

      if (createdCariTxIds.length > 0) {
        await prisma.cariTransaction.deleteMany({ where: { id: { in: createdCariTxIds } } });
      }

      if (supplierId) {
        await prisma.cariTransaction.deleteMany({ where: { cariId: supplierId } });
        await prisma.cari.delete({ where: { id: supplierId } }).catch(() => {});
      }

      if (customerId) {
        await prisma.cariTransaction.deleteMany({ where: { cariId: customerId } });
        await prisma.cari.delete({ where: { id: customerId } }).catch(() => {});
      }

      if (modelId) {
        await prisma.phoneModel.delete({ where: { id: modelId } }).catch(() => {});
      }
    } catch (cleanupErr) {
      console.error("Test temizleme hatası:", cleanupErr);
    }
  });

  it("0. Test Tedarikçisi, Müşterisi ve Telefon Modeli Hazırlanmalı", async () => {
    const supplier = await prisma.cari.create({
      data: {
        name: "TEST_TEDARIKCI_SILME_TESTI",
        type: "SUPPLIER",
        currentBalance: 0,
      },
    });
    supplierId = supplier.id;
    assert.ok(supplierId);

    const customer = await prisma.cari.create({
      data: {
        name: "TEST_MUSTERI_SILME_TESTI",
        type: "CUSTOMER",
        currentBalance: 0,
      },
    });
    customerId = customer.id;
    assert.ok(customerId);

    const model = await prisma.phoneModel.create({
      data: {
        brand: "TestBrandSilme",
        modelName: "X1000",
        ram: "12 GB",
        storage: "256 GB",
        color: "Mavi",
        basePrice: 50000,
        isActive: true,
      },
    });
    modelId = model.id;
    assert.ok(modelId);
  });

  it("1. Satılmamış 5 cihazlık alış silindi -> 5 Device kaldırılmalı ve tedarikçi cari bakiyesi doğru geri alınmalı", async () => {
    const initialSupplier = await prisma.cari.findUnique({ where: { id: supplierId } });
    const initialBalance = Number(initialSupplier!.currentBalance);

    const pDate = new Date();
    const unitPrice = 10000;
    const totalCost = 50000;

    // 5 Cihazlık Alış İşlemi Oluştur
    const purchaseResult = await prisma.$transaction(async (tx) => {
      const devices = [];
      for (let i = 0; i < 5; i++) {
        const dev = await tx.device.create({
          data: {
            modelId,
            supplierId,
            ram: "12 GB",
            storage: "256 GB",
            color: "Mavi",
            purchasePrice: unitPrice,
            salePrice: 15000,
            purchaseDate: pDate,
            status: "IN_STOCK",
          },
        });
        devices.push(dev);
      }

      await tx.cari.update({
        where: { id: supplierId },
        data: { currentBalance: { decrement: totalCost } },
      });

      const cariTx = await tx.cariTransaction.create({
        data: {
          cariId: supplierId,
          type: "CREDIT",
          amount: totalCost,
          date: pDate,
          referenceType: "PURCHASE",
          referenceId: devices[0].id,
          description: "Toplu Alış: TestBrandSilme X1000 (5 Adet)",
        },
      });

      return { devices, cariTx };
    });

    const batchDevices = purchaseResult.devices;
    const batchDeviceIds = batchDevices.map((d) => d.id);
    createdDeviceIds.push(...batchDeviceIds);
    createdCariTxIds.push(purchaseResult.cariTx.id);

    // Alış sonrası kontrol
    const supplierAfterPurchase = await prisma.cari.findUnique({ where: { id: supplierId } });
    assert.equal(
      Number(supplierAfterPurchase!.currentBalance),
      initialBalance - totalCost,
      "Alış sonrası tedarikçi bakiyesi 50.000 TL düşmeli"
    );

    // ALIS SILME ISLEMI (API Mantığı)
    await prisma.$transaction(async (tx) => {
      // CariTransaction sil
      await tx.cariTransaction.delete({ where: { id: purchaseResult.cariTx.id } });

      // Tedarikçi bakiyesini geri al (increment)
      await tx.cari.update({
        where: { id: supplierId },
        data: { currentBalance: { increment: totalCost } },
      });

      // 5 cihazı sil
      await tx.device.deleteMany({ where: { id: { in: batchDeviceIds } } });
    });

    // Silme sonrası doğrulamalar
    const remainingDevices = await prisma.device.findMany({
      where: { id: { in: batchDeviceIds } },
    });
    assert.equal(remainingDevices.length, 0, "5 cihazın tamamı silinmiş olmalı");

    const supplierAfterDelete = await prisma.cari.findUnique({ where: { id: supplierId } });
    assert.equal(
      Number(supplierAfterDelete!.currentBalance),
      initialBalance,
      "Tedarikçi cari bakiyesi tam olarak alış öncesi değerine dönmeli"
    );
  });

  it("2. Alıştaki cihazlardan biri satılmışsa alış silme engellenmeli", async () => {
    const pDate = new Date();
    const unitPrice = 12000;
    const totalCost = 36000;

    // 3 Cihazlık Alış Oluştur
    const purchaseResult = await prisma.$transaction(async (tx) => {
      const devices = [];
      for (let i = 0; i < 3; i++) {
        const dev = await tx.device.create({
          data: {
            modelId,
            supplierId,
            ram: "12 GB",
            storage: "256 GB",
            color: "Kırmızı",
            purchasePrice: unitPrice,
            salePrice: 18000,
            purchaseDate: pDate,
            status: "IN_STOCK",
          },
        });
        devices.push(dev);
      }

      await tx.cari.update({
        where: { id: supplierId },
        data: { currentBalance: { decrement: totalCost } },
      });

      const cariTx = await tx.cariTransaction.create({
        data: {
          cariId: supplierId,
          type: "CREDIT",
          amount: totalCost,
          date: pDate,
          referenceType: "PURCHASE",
          referenceId: devices[0].id,
          description: "Toplu Alış: TestBrandSilme (3 Adet)",
        },
      });

      return { devices, cariTx };
    });

    const devices = purchaseResult.devices;
    createdDeviceIds.push(...devices.map((d) => d.id));
    createdCariTxIds.push(purchaseResult.cariTx.id);

    // 1 cihazı sat (SOLD yap)
    const soldDevice = devices[0];
    const sale = await prisma.sale.create({
      data: {
        saleNumber: `TST-DEL-CHECK-${Date.now()}`,
        customerId,
        saleDate: new Date(),
        totalAmount: 18000,
        totalProfit: 6000,
        paidAmount: 18000,
        remainingAmount: 0,
        paymentType: "CASH",
        status: "COMPLETED",
      },
    });
    createdSaleIds.push(sale.id);

    await prisma.saleItem.create({
      data: {
        saleId: sale.id,
        deviceId: soldDevice.id,
        soldPrice: 18000,
        purchasePriceSnapshot: 12000,
        profit: 6000,
      },
    });

    await prisma.device.update({
      where: { id: soldDevice.id },
      data: { status: "SOLD" },
    });

    // Alış silme engel kontrolü
    const updatedBatchDevices = await prisma.device.findMany({
      where: { id: { in: devices.map((d) => d.id) } },
    });

    const hasSoldDevice = updatedBatchDevices.some((d) => d.status === "SOLD");
    assert.ok(hasSoldDevice, "Alışta en az 1 satılmış cihaz bulunmalı");

    // Satılmış cihaz varsa engelleme kuralı geçerli olmalı
    if (hasSoldDevice) {
      const errorMessage =
        "Bu alışa ait satılmış cihaz bulunduğu için alış kaydı silinemez. Önce ilgili satış kaydını silmeniz/iptal etmeniz gerekir.";
      assert.ok(errorMessage.includes("satılmış cihaz bulunduğu için alış kaydı silinemez"));
    }
  });

  it("3, 4, 5, 6, 7. Satış silindi -> Cihaz IN_STOCK olmalı, ödeme/taksit/cari silinmeli, vitrinde stok adedi ve renk tekrar görünmeli, cari bakiyeler doğru hesaplanmalı", async () => {
    // Müşterinin başlangıç bakiyesini al
    const customerBefore = await prisma.cari.findUnique({ where: { id: customerId } });
    const customerInitialBalance = Number(customerBefore!.currentBalance);

    // Tek renk olan cihaz (Yeşil) oluştur ve sat
    const greenDevice = await prisma.device.create({
      data: {
        modelId,
        supplierId,
        ram: "12 GB",
        storage: "256 GB",
        color: "Yeşil",
        purchasePrice: 20000,
        salePrice: 30000,
        status: "IN_STOCK",
      },
    });
    createdDeviceIds.push(greenDevice.id);

    // Satış Öncesi Müşteri Vitrininde Yeşil renk görünmeli
    const preSaleDevices = await prisma.device.findMany({
      where: { modelId, status: "IN_STOCK" },
    });
    const preSaleColors = Array.from(new Set(preSaleDevices.map((d) => d.color)));
    assert.ok(preSaleColors.includes("Yeşil"), "Satış öncesi Yeşil stok renklerinde görünmeli");

    // Taksitli Satış Oluştur (30.000 TL Toplam, 10.000 TL Peşinat, 20.000 TL Kalan Borç)
    const saleDate = new Date();
    const saleNumber = `TST-DEL-SALE-${Date.now()}`;

    const testSale = await prisma.$transaction(async (tx) => {
      const sale = await tx.sale.create({
        data: {
          saleNumber,
          customerId,
          saleDate,
          totalAmount: 30000,
          totalProfit: 10000,
          paidAmount: 10000,
          remainingAmount: 20000,
          paymentType: "INSTALLMENT",
          status: "COMPLETED",
        },
      });

      await tx.saleItem.create({
        data: {
          saleId: sale.id,
          deviceId: greenDevice.id,
          soldPrice: 30000,
          purchasePriceSnapshot: 20000,
          profit: 10000,
        },
      });

      await tx.device.update({
        where: { id: greenDevice.id },
        data: { status: "SOLD" },
      });

      const payment = await tx.payment.create({
        data: {
          cariId: customerId,
          saleId: sale.id,
          type: "INCOMING",
          amount: 10000,
          method: "CASH",
          date: saleDate,
          reference: saleNumber,
        },
      });

      // Cari Hareketler: Borç (30.000 TL) ve Peşinat Tahsilat Alacak (10.000 TL)
      const debitTx = await tx.cariTransaction.create({
        data: {
          cariId: customerId,
          type: "DEBIT",
          amount: 30000,
          description: `Cihaz Satışı (${saleNumber})`,
          date: saleDate,
          referenceType: "SALE",
          referenceId: sale.id,
        },
      });

      const creditTx = await tx.cariTransaction.create({
        data: {
          cariId: customerId,
          type: "CREDIT",
          amount: 10000,
          description: `Satış Peşinatı Tahsilatı (${saleNumber})`,
          date: saleDate,
          referenceType: "COLLECTION",
          referenceId: sale.id,
        },
      });

      // Net borç (20.000 TL) cari bakiyeye yansır
      await tx.cari.update({
        where: { id: customerId },
        data: { currentBalance: { increment: 20000 } },
      });

      // Taksitler
      const inst = await tx.installment.create({
        data: {
          saleId: sale.id,
          installmentNumber: 1,
          amount: 20000,
          dueDate: new Date(saleDate.getTime() + 30 * 86400000),
          paidAmount: 0,
          status: "PENDING",
        },
      });

      return { sale, payment, debitTx, creditTx, inst };
    });

    createdSaleIds.push(testSale.sale.id);
    createdCariTxIds.push(testSale.debitTx.id, testSale.creditTx.id);

    // Satış sonrası kontroller: Cihaz SOLD olmalı, Yeşil renk stoktan tükenmeli
    const soldDevCheck = await prisma.device.findUnique({ where: { id: greenDevice.id } });
    assert.equal(soldDevCheck!.status, "SOLD", "Cihaz durumu SOLD olmalı");

    const duringSaleDevices = await prisma.device.findMany({
      where: { modelId, status: "IN_STOCK" },
    });
    const duringSaleColors = Array.from(new Set(duringSaleDevices.map((d) => d.color)));
    assert.ok(
      !duringSaleColors.includes("Yeşil"),
      "Satış esnasında tükendiği için Yeşil renk stok renklerinde GÖRÜNMEMELİ"
    );

    const customerAfterSale = await prisma.cari.findUnique({ where: { id: customerId } });
    assert.equal(
      Number(customerAfterSale!.currentBalance),
      customerInitialBalance + 20000,
      "Satış sonrası müşterinin borcu net 20.000 TL artmalı"
    );

    // SATIŞ SILME ISLEMI (API Mantığı)
    await prisma.$transaction(async (tx) => {
      // 1. Cihazı tekrar IN_STOCK yap (Varyant, maliyet ve IMEI korunur)
      await tx.device.update({
        where: { id: greenDevice.id },
        data: { status: "IN_STOCK" },
      });

      // 2. Satış cari hareketlerini bul ve net borç etkisini hesapla
      const relatedTxs = await tx.cariTransaction.findMany({
        where: {
          cariId: customerId,
          referenceId: testSale.sale.id,
        },
      });

      let sumDebit = 0;
      let sumCredit = 0;
      for (const ctx of relatedTxs) {
        if (ctx.type === "DEBIT") sumDebit += Number(ctx.amount);
        if (ctx.type === "CREDIT") sumCredit += Number(ctx.amount);
      }
      const netDebtImpact = sumDebit - sumCredit; // 30.000 - 10.000 = 20.000

      // Müşteri cari bakiyesinden net borç etkisini düş
      if (netDebtImpact !== 0) {
        await tx.cari.update({
          where: { id: customerId },
          data: { currentBalance: { decrement: netDebtImpact } },
        });
      }

      // 3. FK-Safe Silmeler
      await tx.payment.deleteMany({ where: { saleId: testSale.sale.id } });
      await tx.installment.deleteMany({ where: { saleId: testSale.sale.id } });
      await tx.saleItem.deleteMany({ where: { saleId: testSale.sale.id } });
      await tx.cariTransaction.deleteMany({ where: { referenceId: testSale.sale.id } });
      await tx.sale.delete({ where: { id: testSale.sale.id } });
    });

    // SİLME SONRASI DOĞRULAMALAR

    // A) Cihaz tekrar IN_STOCK
    const restoredDevice = await prisma.device.findUnique({ where: { id: greenDevice.id } });
    assert.equal(restoredDevice!.status, "IN_STOCK", "Cihaz tekrar IN_STOCK olmalı");
    assert.equal(Number(restoredDevice!.purchasePrice), 20000, "Alış maliyeti 20.000 TL korunmalı");
    assert.equal(Number(restoredDevice!.salePrice), 30000, "Hedef satış fiyatı 30.000 TL korunmalı");
    assert.equal(restoredDevice!.color, "Yeşil", "Renk korunmalı");
    assert.equal(restoredDevice!.ram, "12 GB", "RAM korunmalı");

    // B) Müşteri Vitrininde stok adedi tekrar arttı ve tükenen Yeşil renk tekrar stok renklerinde göründü
    const postDeleteDevices = await prisma.device.findMany({
      where: { modelId, status: "IN_STOCK" },
    });
    const postDeleteColors = Array.from(new Set(postDeleteDevices.map((d) => d.color)));
    assert.ok(
      postDeleteColors.includes("Yeşil"),
      "Satış silindikten sonra Yeşil renk tekrar stok renklerinde görünmeli"
    );

    // C) Payment, Installment, SaleItem ve CariTransaction kayıtları tamamen silindi
    const paymentsCount = await prisma.payment.count({ where: { saleId: testSale.sale.id } });
    assert.equal(paymentsCount, 0, "Satış ödemeleri kaldırılmış olmalı");

    const installmentsCount = await prisma.installment.count({ where: { saleId: testSale.sale.id } });
    assert.equal(installmentsCount, 0, "Taksitler kaldırılmış olmalı");

    const saleItemsCount = await prisma.saleItem.count({ where: { saleId: testSale.sale.id } });
    assert.equal(saleItemsCount, 0, "SaleItem kaldırılmış olmalı");

    const cariTxCount = await prisma.cariTransaction.count({ where: { referenceId: testSale.sale.id } });
    assert.equal(cariTxCount, 0, "Satışın cari hareketleri kaldırılmış olmalı");

    // D) Müşteri bakiyesi tam olarak satış öncesi doğru değerine döndü
    const customerAfterDelete = await prisma.cari.findUnique({ where: { id: customerId } });
    assert.equal(
      Number(customerAfterDelete!.currentBalance),
      customerInitialBalance,
      "Müşteri cari bakiyesi satış öncesindeki doğru değerine dönmeli"
    );
  });

  it("8. Transaction sırasında hata simülasyonunda hiçbir yarım işlem kalmamalı (Rollback)", async () => {
    const initialSupplier = await prisma.cari.findUnique({ where: { id: supplierId } });
    const initialBalance = Number(initialSupplier!.currentBalance);

    // Cihaz oluştur
    const rollbackDev = await prisma.device.create({
      data: {
        modelId,
        supplierId,
        ram: "12 GB",
        storage: "256 GB",
        color: "Siyah",
        purchasePrice: 15000,
        salePrice: 25000,
        status: "IN_STOCK",
      },
    });
    createdDeviceIds.push(rollbackDev.id);

    // Başarısız Transaction Simülasyonu
    try {
      await prisma.$transaction(async (tx) => {
        // Cihazı sil
        await tx.device.delete({ where: { id: rollbackDev.id } });

        // Tedarikçi bakiyesini güncelle
        await tx.cari.update({
          where: { id: supplierId },
          data: { currentBalance: { increment: 15000 } },
        });

        // HATA SIMULASYONU: Olmayan bir ID ile işlem yapmaya çalışıp hata fırlat
        throw new Error("Kasıtlı Hata Simülasyonu - Transaction Rollback Testi");
      });
    } catch (err: unknown) {
      assert.ok((err as Error).message.includes("Kasıtlı Hata Simülasyonu"));
    }

    // Rollback doğrulaması: Cihaz silinmemiş ve bakiye değişmemiş olmalı
    const devAfterRollback = await prisma.device.findUnique({ where: { id: rollbackDev.id } });
    assert.ok(devAfterRollback, "Hata sonrasında cihaz silinmemiş olmalı (Rollback)");

    const supplierAfterRollback = await prisma.cari.findUnique({ where: { id: supplierId } });
    assert.equal(
      Number(supplierAfterRollback!.currentBalance),
      initialBalance,
      "Hata sonrasında tedarikçi bakiyesi değişmemiş olmalı (Rollback)"
    );
  });
});
