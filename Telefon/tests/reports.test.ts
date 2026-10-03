import test, { describe, it } from "node:test";
import assert from "node:assert/strict";
import ExcelJS from "exceljs";
import {
  getDateRangeFromPreset,
  getPreviousEquivalentPeriod,
  calculatePercentageChange,
} from "../src/lib/reports/date-utils";
import {
  buildSalesExcelWorkbook,
  buildProfitExcelWorkbook,
  buildStockExcelWorkbook,
  buildCariTaksitExcelWorkbook,
  buildOverviewExcelWorkbook,
} from "../src/lib/reports/excel-export";

describe("Raporlar Modülü Birim ve Excel .xlsx Testleri", () => {
  // 1. Tarih Preset Testleri
  describe("Tarih Preset ve Dönem Karşılaştırma Testleri", () => {
    it("1. getDateRangeFromPreset 'TODAY' seçeneği için başlangıç ve bitiş gün sınırlarını doğru vermeli", () => {
      const now = new Date();
      const { startDate, endDate } = getDateRangeFromPreset("TODAY");

      assert.equal(startDate.getDate(), now.getDate());
      assert.equal(startDate.getHours(), 0);
      assert.equal(startDate.getMinutes(), 0);
      assert.equal(endDate.getHours(), 23);
      assert.equal(endDate.getMinutes(), 59);

      const { prevStart, prevEnd } = getPreviousEquivalentPeriod(startDate, endDate);
      assert.equal(prevStart < startDate, true);
      assert.equal(prevEnd < endDate, true);
    });

    it("2. getDateRangeFromPreset 'THIS_MONTH' seçeneği için ayın 1'inden ayın son gününe aralık vermeli", () => {
      const now = new Date();
      const { startDate, endDate } = getDateRangeFromPreset("THIS_MONTH");

      assert.equal(startDate.getDate(), 1);
      assert.equal(startDate.getMonth(), now.getMonth());
      assert.equal(endDate.getHours(), 23);
    });

    it("3. calculatePercentageChange yüzde değişimini ve sıfır durumlarını doğru hesaplamalı", () => {
      const inc = calculatePercentageChange(150, 100);
      assert.equal(inc, 50);

      const dec = calculatePercentageChange(50, 100);
      assert.equal(dec, -50);

      const zeroBasePos = calculatePercentageChange(100, 0);
      assert.equal(zeroBasePos, null);
    });
  });

  // 2. Gerçek .xlsx Excel Çıktısı Doğrulama Testleri (ExcelJS ile okuma & Hücre Tipi İnceleme)
  describe("Gerçek .xlsx Excel Çıktısı Doğrulama Testleri", () => {
    it("4. Satış sekmesi: .xlsx dosyasında başlık satırı ve Türkçe karakterler düzgün olmalı", async () => {
      const mockSalesData = {
        kpis: { totalSalesCount: 1, totalSoldDevices: 1, totalCiro: 45000, avgSaleAmount: 45000 },
        pagination: { page: 1, limit: 15, totalCount: 1, totalPages: 1 },
        rows: [
          {
            saleId: "s1",
            saleNumber: "SAT-2026-001",
            saleDate: new Date("2026-09-15"),
            customerName: "Ahmet Yılmaz",
            brand: "Apple",
            modelName: "iPhone 15",
            ram: "8 GB",
            storage: "128 GB",
            color: "Siyah",
            imei: "123456789012345",
            soldPrice: 45000,
            paidAmount: 45000,
            remainingAmount: 0,
            paymentType: "CASH" as const,
            paymentMethods: "Nakit",
          },
        ],
      };

      const wb = await buildSalesExcelWorkbook(mockSalesData);
      const arrayBuffer = await wb.xlsx.writeBuffer();
      assert.equal(arrayBuffer.byteLength > 0, true);

      // Reload & inspect worksheet cells
      const loadedWb = new ExcelJS.Workbook();
      await loadedWb.xlsx.load(new Uint8Array(arrayBuffer) as unknown as ExcelJS.Buffer);

      const sheet = loadedWb.getWorksheet("Satış Detayları");
      assert.notEqual(sheet, undefined);

      const headerRow = sheet!.getRow(1);
      assert.equal(headerRow.getCell(1).value, "Tarih");
      assert.equal(headerRow.getCell(2).value, "Satış No");
      assert.equal(headerRow.getCell(3).value, "Müşteri");
      assert.equal(headerRow.getCell(10).value, "Satış Fiyatı");
      assert.equal(headerRow.getCell(1).font?.bold, true);

      const dataRow = sheet!.getRow(2);
      assert.equal(dataRow.getCell(2).value, "SAT-2026-001");
      assert.equal(dataRow.getCell(3).value, "Ahmet Yılmaz");
      assert.equal(dataRow.getCell(10).value, 45000); // Numeric cell!
      assert.equal(dataRow.getCell(10).numFmt, '#,##0.00 "TL"');
    });

    it("5. Kâr sekmesi: .xlsx dosyasında 2 ayrı worksheet (Satış Kârlılık Detayları & Marka Kârlılığı) bulunmalı ve marj % formatlı olmalı", async () => {
      const mockProfitData = {
        kpis: { totalCiro: 45000, totalCost: 35000, totalProfit: 10000, overallMargin: 22.2 },
        brandProfits: [{ brand: "Apple", ciro: 45000, cost: 35000, profit: 10000, margin: 22.2 }],
        productProfits: [],
        rows: [
          {
            saleId: "s1",
            saleNumber: "SAT-2026-001",
            saleDate: new Date("2026-09-15"),
            brand: "Apple",
            modelName: "iPhone 15",
            ram: "8 GB",
            storage: "128 GB",
            color: "Siyah",
            purchaseCost: 35000,
            soldPrice: 45000,
            profit: 10000,
            profitMargin: 22.2,
          },
        ],
      };

      const wb = await buildProfitExcelWorkbook(mockProfitData);
      const arrayBuffer = await wb.xlsx.writeBuffer();

      const loadedWb = new ExcelJS.Workbook();
      await loadedWb.xlsx.load(new Uint8Array(arrayBuffer) as unknown as ExcelJS.Buffer);

      const sheet1 = loadedWb.getWorksheet("Satış Kârlılık Detayları");
      const sheet2 = loadedWb.getWorksheet("Marka Kârlılığı");
      assert.notEqual(sheet1, undefined);
      assert.notEqual(sheet2, undefined);

      const header1 = sheet1!.getRow(1);
      assert.equal(header1.getCell(8).value, "Alış Maliyeti");
      assert.equal(header1.getCell(11).value, "Kâr Marjı %");

      const dataRow1 = sheet1!.getRow(2);
      assert.equal(dataRow1.getCell(8).value, 35000);
      assert.equal(dataRow1.getCell(10).value, 10000);
      assert.equal(dataRow1.getCell(11).numFmt, '0.0"%"');
    });

    it("6. Stok sekmesi: .xlsx dosyasında Stok Detayları ve Tükenen Modeller worksheet'leri olmalı", async () => {
      const mockStockData = {
        kpis: { totalStockCount: 2, totalStockCost: 50000, potentialSalesValue: 64000, potentialGrossProfit: 14000 },
        groupedRows: [
          {
            key: "k1",
            brand: "Apple",
            modelName: "iPhone 13",
            ram: "4 GB",
            storage: "128 GB",
            color: "Siyah",
            count: 2,
            unitCost: 25000,
            targetSalePrice: 32000,
            totalCost: 50000,
            potentialProfit: 14000,
          },
        ],
        lowStockItems: [],
        outOfStockModels: [
          { id: "m1", brand: "Samsung", modelName: "Galaxy S23", ram: "8 GB", storage: "256 GB", color: "Yeşil", basePrice: 38000 },
        ],
      };

      const wb = await buildStockExcelWorkbook(mockStockData);
      const arrayBuffer = await wb.xlsx.writeBuffer();

      const loadedWb = new ExcelJS.Workbook();
      await loadedWb.xlsx.load(new Uint8Array(arrayBuffer) as unknown as ExcelJS.Buffer);

      const sheet1 = loadedWb.getWorksheet("Stok Detayları");
      const sheet2 = loadedWb.getWorksheet("Tükenen Modeller");
      assert.notEqual(sheet1, undefined);
      assert.notEqual(sheet2, undefined);

      const dataRow1 = sheet1!.getRow(2);
      assert.equal(dataRow1.getCell(6).value, 2); // Integer stock count!
      assert.equal(dataRow1.getCell(7).value, 25000);
    });

    it("7. Cari & Taksit sekmesi: Aynı .xlsx dosyasında Cari Hesaplar ve Taksitler adında 2 ayrı worksheet üretilmeli", async () => {
      const mockCariTaksitData = {
        cariKpis: { totalReceivables: 15000, totalPayables: 25000, netCariPosition: -10000 },
        cariRows: [
          { id: "c1", name: "Ahmet Müşteri", type: "CUSTOMER" as const, alacagimiz: 15000, borcumuz: 0, netBakiye: 15000 },
          { id: "c2", name: "Kaya Tedarikçi", type: "SUPPLIER" as const, alacagimiz: 0, borcumuz: 25000, netBakiye: -25000 },
        ],
        installmentKpis: { pendingCount: 1, pendingAmount: 5000, overdueCount: 1, overdueAmount: 5000 },
        installmentRows: [
          {
            id: "i1",
            customerName: "Ahmet Müşteri",
            saleNumber: "SAT-2026-001",
            dueDate: new Date("2026-09-01"),
            installmentNumber: 1,
            amount: 5000,
            paidAmount: 0,
            remainingAmount: 5000,
            status: "Gecikmiş" as const,
          },
        ],
      };

      const wb = await buildCariTaksitExcelWorkbook(mockCariTaksitData);
      const arrayBuffer = await wb.xlsx.writeBuffer();

      const loadedWb = new ExcelJS.Workbook();
      await loadedWb.xlsx.load(new Uint8Array(arrayBuffer) as unknown as ExcelJS.Buffer);

      const sheetCari = loadedWb.getWorksheet("Cari Hesaplar");
      const sheetTaksit = loadedWb.getWorksheet("Taksitler");
      assert.notEqual(sheetCari, undefined);
      assert.notEqual(sheetTaksit, undefined);

      const cariHeader = sheetCari!.getRow(1);
      assert.equal(cariHeader.getCell(1).value, "Cari / Unvan");
      assert.equal(cariHeader.getCell(3).value, "Alacağımız (+ TL)");

      const taksitHeader = sheetTaksit!.getRow(1);
      assert.equal(taksitHeader.getCell(1).value, "Müşteri Adı");
      assert.equal(taksitHeader.getCell(5).value, "Taksit Tutarı");
    });

    it("8. Genel Bakış sekmesi: .xlsx özet worksheet'i Türkçe metinleri ve sayısal değerleri içermeli", async () => {
      const mockOverviewData = {
        kpis: {
          totalCiro: 100000,
          ciroChange: 15.5,
          totalProfit: 25000,
          profitChange: 10.2,
          soldDeviceCount: 3,
          soldDeviceChange: 5,
          currentStockCount: 10,
          currentStockCost: 200000,
          totalReceivables: 15000,
          overdueCount: 1,
          overdueAmount: 5000,
        },
        timeSeriesData: [],
        brandSales: [],
        topProducts: [],
        paymentDistribution: [],
      };

      const wb = await buildOverviewExcelWorkbook(mockOverviewData);
      const arrayBuffer = await wb.xlsx.writeBuffer();

      const loadedWb = new ExcelJS.Workbook();
      await loadedWb.xlsx.load(new Uint8Array(arrayBuffer) as unknown as ExcelJS.Buffer);

      const sheet = loadedWb.getWorksheet("Genel Bakış Özet");
      assert.notEqual(sheet, undefined);

      const header = sheet!.getRow(1);
      assert.equal(header.getCell(1).value, "Metrik / Gösterge");
      assert.equal(header.getCell(2).value, "Değer");

      const rowCiro = sheet!.getRow(2);
      assert.equal(rowCiro.getCell(1).value, "Toplam Ciro");
      assert.equal(rowCiro.getCell(2).value, 100000);
    });
  });

  // 3. Kârlılık Hesabı Mantık Testleri
  describe("Kârlılık ve Snapshot Hesaplama Mantığı Testleri", () => {
    it("9. Satış kârı anlık alisFiyati snapshot, soldPrice ve profit verisi üzerinden doğru hesaplanmalı", () => {
      const saleItems = [
        {
          soldPrice: 45000,
          purchasePriceSnapshot: 35000,
          profit: 10000,
        },
        {
          soldPrice: 30000,
          purchasePriceSnapshot: 22000,
          profit: 8000,
        },
      ];

      const totalCiro = saleItems.reduce((acc, i) => acc + i.soldPrice, 0);
      const totalCost = saleItems.reduce((acc, i) => acc + i.purchasePriceSnapshot, 0);
      const totalProfit = saleItems.reduce((acc, i) => acc + i.profit, 0);
      const margin = (totalProfit / totalCiro) * 100;

      assert.equal(totalCiro, 75000);
      assert.equal(totalCost, 57000);
      assert.equal(totalProfit, 18000);
      assert.equal(Number(margin.toFixed(1)), 24.0);
    });
  });

  // 4. Stok Raporu Grubu ve Kritik Stok Mantığı
  describe("Stok ve Varyant Gruplama Mantık Testleri", () => {
    it("10. Yalnızca IN_STOCK olan cihazlar stok değerine dahil edilmeli ve stok adedi <= 2 olanlar kritik stok uyarısına girmeli", () => {
      const mockDevices = [
        { id: "d1", status: "IN_STOCK", brand: "Apple", model: "iPhone 13", ram: "4 GB", storage: "128 GB", color: "Siyah", cost: 25000, sale: 32000 },
        { id: "d2", status: "IN_STOCK", brand: "Apple", model: "iPhone 13", ram: "4 GB", storage: "128 GB", color: "Siyah", cost: 25000, sale: 32000 },
        { id: "d3", status: "SOLD", brand: "Apple", model: "iPhone 13", ram: "4 GB", storage: "128 GB", color: "Siyah", cost: 25000, sale: 32000 },
        { id: "d4", status: "IN_STOCK", brand: "Samsung", model: "Galaxy S23", ram: "8 GB", storage: "256 GB", color: "Yeşil", cost: 30000, sale: 38000 },
      ];

      const inStock = mockDevices.filter((d) => d.status === "IN_STOCK");
      assert.equal(inStock.length, 3);

      const totalStockCost = inStock.reduce((acc, d) => acc + d.cost, 0);
      assert.equal(totalStockCost, 80000);

      const groupMap = new Map<string, number>();
      inStock.forEach((d) => {
        const key = `${d.brand} ${d.model} (${d.ram}/${d.storage} - ${d.color})`;
        groupMap.set(key, (groupMap.get(key) || 0) + 1);
      });

      assert.equal(groupMap.get("Apple iPhone 13 (4 GB/128 GB - Siyah)"), 2);
      assert.equal(groupMap.get("Samsung Galaxy S23 (8 GB/256 GB - Yeşil)"), 1);

      const lowStockKeys = Array.from(groupMap.entries()).filter(([_, count]) => count <= 2).map(([key]) => key);
      assert.equal(lowStockKeys.length, 2);
    });
  });

  // 5. Cari ve Taksit Mantık Testleri
  describe("Cari Pozisyonu ve Taksit Vade Durumu Testleri", () => {
    it("11. Cari hesabı pozitif (DEBIT > CREDIT) olanlar Alacağımız, negatif olanlar Borcumuz olarak sınıflandırılmalı", () => {
      const cariler = [
        { name: "Ahmet Müşteri", currentBalance: 15000 },
        { name: "Kaya Tedarikçi", currentBalance: -25000 },
        { name: "Sıfır Cari", currentBalance: 0 },
      ];

      let receivables = 0;
      let payables = 0;

      cariler.forEach((c) => {
        if (c.currentBalance > 0) receivables += c.currentBalance;
        if (c.currentBalance < 0) payables += Math.abs(c.currentBalance);
      });

      assert.equal(receivables, 15000);
      assert.equal(payables, 25000);
      assert.equal(receivables - payables, -10000);
    });

    it("12. Vadesi geçmiş ve henüz ödenmemiş taksitler 'Gecikmiş' olarak etiketlenmeli", () => {
      const now = new Date();
      const pastDate = new Date(now.getTime() - 86400000 * 5);
      const futureDate = new Date(now.getTime() + 86400000 * 10);

      const installments = [
        { id: "i1", status: "PAID", dueDate: pastDate, amount: 5000, paidAmount: 5000 },
        { id: "i2", status: "PENDING", dueDate: pastDate, amount: 5000, paidAmount: 0 },
        { id: "i3", status: "PENDING", dueDate: futureDate, amount: 5000, paidAmount: 0 },
      ];

      const mapped = installments.map((inst) => {
        const isOverdue = inst.status !== "PAID" && inst.dueDate < now;
        let statusDisplay: "Ödendi" | "Bekliyor" | "Gecikmiş" = "Bekliyor";
        if (inst.status === "PAID") statusDisplay = "Ödendi";
        else if (isOverdue) statusDisplay = "Gecikmiş";
        return { ...inst, statusDisplay };
      });

      assert.equal(mapped[0].statusDisplay, "Ödendi");
      assert.equal(mapped[1].statusDisplay, "Gecikmiş");
      assert.equal(mapped[2].statusDisplay, "Bekliyor");
    });
  });
});
