import ExcelJS from "exceljs";
import {
  getSalesReport,
  getProfitReport,
  getStockReport,
  getCariTaksitReport,
  getOverviewReport,
  ReportFilterOptions,
} from "./reports-service";

type SalesReportData = Awaited<ReturnType<typeof getSalesReport>>;
type ProfitReportData = Awaited<ReturnType<typeof getProfitReport>>;
type StockReportData = Awaited<ReturnType<typeof getStockReport>>;
type CariTaksitReportData = Awaited<ReturnType<typeof getCariTaksitReport>>;
type OverviewReportData = Awaited<ReturnType<typeof getOverviewReport>>;

const CURRENCY_FORMAT = '#,##0.00 "TL"';
const PERCENT_FORMAT = '0.0"%"';
const INT_FORMAT = "#,##0";

function styleHeaderRow(row: ExcelJS.Row) {
  row.font = { name: "Calibri", size: 11, bold: true, color: { argb: "FFFFFFFF" } };
  row.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FF10B981" }, // Emerald-500
  };
  row.alignment = { vertical: "middle", horizontal: "center" };
  row.height = 24;
}

function autoFitColumns(worksheet: ExcelJS.Worksheet) {
  worksheet.columns.forEach((col) => {
    let maxLen = 12;
    col.eachCell?.({ includeEmpty: true }, (cell) => {
      const valStr = cell.value ? cell.value.toString() : "";
      if (valStr.length > maxLen) {
        maxLen = valStr.length;
      }
    });
    col.width = Math.min(maxLen + 4, 40);
  });
}

// ----------------------------------------------------
// WORKBOOK GENERATORS (PURE LOGIC)
// ----------------------------------------------------

export async function buildSalesExcelWorkbook(salesData: SalesReportData): Promise<ExcelJS.Workbook> {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("Satış Detayları");

  sheet.columns = [
    { header: "Tarih", key: "date", width: 14 },
    { header: "Satış No", key: "saleNumber", width: 16 },
    { header: "Müşteri", key: "customerName", width: 22 },
    { header: "Marka", key: "brand", width: 14 },
    { header: "Model", key: "modelName", width: 20 },
    { header: "RAM", key: "ram", width: 10 },
    { header: "Depolama", key: "storage", width: 12 },
    { header: "Renk", key: "color", width: 12 },
    { header: "IMEI", key: "imei", width: 18 },
    { header: "Satış Fiyatı", key: "soldPrice", width: 16 },
    { header: "Ödenen Tutar", key: "paidAmount", width: 16 },
    { header: "Kalan Bakiye", key: "remainingAmount", width: 16 },
    { header: "Ödeme Yöntemi", key: "paymentType", width: 18 },
  ];

  styleHeaderRow(sheet.getRow(1));

  salesData.rows.forEach((r) => {
    const row = sheet.addRow({
      date: new Date(r.saleDate).toLocaleDateString("tr-TR"),
      saleNumber: r.saleNumber,
      customerName: r.customerName,
      brand: r.brand,
      modelName: r.modelName,
      ram: r.ram,
      storage: r.storage,
      color: r.color,
      imei: r.imei || "-",
      soldPrice: Number(r.soldPrice),
      paidAmount: Number(r.paidAmount),
      remainingAmount: Number(r.remainingAmount),
      paymentType: r.paymentMethods || r.paymentType,
    });

    row.getCell("soldPrice").numFmt = CURRENCY_FORMAT;
    row.getCell("paidAmount").numFmt = CURRENCY_FORMAT;
    row.getCell("remainingAmount").numFmt = CURRENCY_FORMAT;
  });

  autoFitColumns(sheet);
  return workbook;
}

export async function buildProfitExcelWorkbook(profitData: ProfitReportData): Promise<ExcelJS.Workbook> {
  const workbook = new ExcelJS.Workbook();

  // Sheet 1: Detaylı Kârlılık Tablosu
  const sheet1 = workbook.addWorksheet("Satış Kârlılık Detayları");
  sheet1.columns = [
    { header: "Tarih", key: "date", width: 14 },
    { header: "Satış No", key: "saleNumber", width: 16 },
    { header: "Marka", key: "brand", width: 14 },
    { header: "Model", key: "modelName", width: 20 },
    { header: "RAM", key: "ram", width: 10 },
    { header: "Depolama", key: "storage", width: 12 },
    { header: "Renk", key: "color", width: 12 },
    { header: "Alış Maliyeti", key: "purchaseCost", width: 16 },
    { header: "Satış Fiyatı", key: "soldPrice", width: 16 },
    { header: "Net Kâr", key: "profit", width: 16 },
    { header: "Kâr Marjı %", key: "profitMargin", width: 14 },
  ];
  styleHeaderRow(sheet1.getRow(1));

  profitData.rows.forEach((r) => {
    const row = sheet1.addRow({
      date: new Date(r.saleDate).toLocaleDateString("tr-TR"),
      saleNumber: r.saleNumber,
      brand: r.brand,
      modelName: r.modelName,
      ram: r.ram,
      storage: r.storage,
      color: r.color,
      purchaseCost: Number(r.purchaseCost),
      soldPrice: Number(r.soldPrice),
      profit: Number(r.profit),
      profitMargin: Number(r.profitMargin),
    });

    row.getCell("purchaseCost").numFmt = CURRENCY_FORMAT;
    row.getCell("soldPrice").numFmt = CURRENCY_FORMAT;
    row.getCell("profit").numFmt = CURRENCY_FORMAT;
    row.getCell("profitMargin").numFmt = PERCENT_FORMAT;
  });
  autoFitColumns(sheet1);

  // Sheet 2: Marka Kârlılık Özeti
  const sheet2 = workbook.addWorksheet("Marka Kârlılığı");
  sheet2.columns = [
    { header: "Marka", key: "brand", width: 16 },
    { header: "Toplam Ciro", key: "ciro", width: 18 },
    { header: "Toplam Maliyet", key: "cost", width: 18 },
    { header: "Toplam Kâr", key: "profit", width: 18 },
    { header: "Kâr Marjı %", key: "margin", width: 14 },
  ];
  styleHeaderRow(sheet2.getRow(1));

  profitData.brandProfits.forEach((bp) => {
    const row = sheet2.addRow({
      brand: bp.brand,
      ciro: Number(bp.ciro),
      cost: Number(bp.cost),
      profit: Number(bp.profit),
      margin: Number(bp.margin),
    });

    row.getCell("ciro").numFmt = CURRENCY_FORMAT;
    row.getCell("cost").numFmt = CURRENCY_FORMAT;
    row.getCell("profit").numFmt = CURRENCY_FORMAT;
    row.getCell("margin").numFmt = PERCENT_FORMAT;
  });
  autoFitColumns(sheet2);

  return workbook;
}

export async function buildStockExcelWorkbook(stockData: StockReportData): Promise<ExcelJS.Workbook> {
  const workbook = new ExcelJS.Workbook();

  // Sheet 1: Anlık Stok Detayları
  const sheet1 = workbook.addWorksheet("Stok Detayları");
  sheet1.columns = [
    { header: "Marka", key: "brand", width: 14 },
    { header: "Model", key: "modelName", width: 20 },
    { header: "RAM", key: "ram", width: 10 },
    { header: "Depolama", key: "storage", width: 12 },
    { header: "Renk", key: "color", width: 12 },
    { header: "Stok Adedi", key: "count", width: 14 },
    { header: "Birim Maliyet", key: "unitCost", width: 16 },
    { header: "Hedef Satış Fiyatı", key: "targetSalePrice", width: 18 },
    { header: "Toplam Maliyet", key: "totalCost", width: 18 },
    { header: "Potansiyel Kâr", key: "potentialProfit", width: 18 },
  ];
  styleHeaderRow(sheet1.getRow(1));

  stockData.groupedRows.forEach((r) => {
    const row = sheet1.addRow({
      brand: r.brand,
      modelName: r.modelName,
      ram: r.ram,
      storage: r.storage,
      color: r.color,
      count: Number(r.count),
      unitCost: Number(r.unitCost),
      targetSalePrice: Number(r.targetSalePrice),
      totalCost: Number(r.totalCost),
      potentialProfit: Number(r.potentialProfit),
    });

    row.getCell("count").numFmt = INT_FORMAT;
    row.getCell("unitCost").numFmt = CURRENCY_FORMAT;
    row.getCell("targetSalePrice").numFmt = CURRENCY_FORMAT;
    row.getCell("totalCost").numFmt = CURRENCY_FORMAT;
    row.getCell("potentialProfit").numFmt = CURRENCY_FORMAT;
  });
  autoFitColumns(sheet1);

  // Sheet 2: Tükenen Aktif Modeller
  const sheet2 = workbook.addWorksheet("Tükenen Modeller");
  sheet2.columns = [
    { header: "Marka", key: "brand", width: 14 },
    { header: "Model", key: "modelName", width: 20 },
    { header: "RAM", key: "ram", width: 10 },
    { header: "Depolama", key: "storage", width: 12 },
    { header: "Renk", key: "color", width: 12 },
    { header: "Baz Fiyat", key: "basePrice", width: 16 },
    { header: "Stok Durumu", key: "status", width: 16 },
  ];
  styleHeaderRow(sheet2.getRow(1));

  stockData.outOfStockModels.forEach((m) => {
    const row = sheet2.addRow({
      brand: m.brand,
      modelName: m.modelName,
      ram: m.ram,
      storage: m.storage,
      color: m.color,
      basePrice: Number(m.basePrice),
      status: "Stokta 0 Adet",
    });

    row.getCell("basePrice").numFmt = CURRENCY_FORMAT;
  });
  autoFitColumns(sheet2);

  return workbook;
}

export async function buildCariTaksitExcelWorkbook(cariTaksitData: CariTaksitReportData): Promise<ExcelJS.Workbook> {
  const workbook = new ExcelJS.Workbook();

  // Sheet 1: Cari Hesap Pozisyonları
  const sheet1 = workbook.addWorksheet("Cari Hesaplar");
  sheet1.columns = [
    { header: "Cari / Unvan", key: "name", width: 24 },
    { header: "Cari Tipi", key: "type", width: 16 },
    { header: "Alacağımız (+ TL)", key: "alacagimiz", width: 18 },
    { header: "Borcumuz (- TL)", key: "borcumuz", width: 18 },
    { header: "Net Bakiye", key: "netBakiye", width: 18 },
  ];
  styleHeaderRow(sheet1.getRow(1));

  cariTaksitData.cariRows.forEach((c) => {
    let typeStr = String(c.type);
    if (c.type === "CUSTOMER") typeStr = "Müşteri";
    else if (c.type === "SUPPLIER") typeStr = "Tedarikçi";
    else if (c.type === "BOTH") typeStr = "Müşteri & Tedarikçi";

    const row = sheet1.addRow({
      name: c.name,
      type: typeStr,
      alacagimiz: Number(c.alacagimiz),
      borcumuz: Number(c.borcumuz),
      netBakiye: Number(c.netBakiye),
    });

    row.getCell("alacagimiz").numFmt = CURRENCY_FORMAT;
    row.getCell("borcumuz").numFmt = CURRENCY_FORMAT;
    row.getCell("netBakiye").numFmt = CURRENCY_FORMAT;
  });
  autoFitColumns(sheet1);

  // Sheet 2: Taksit Ödeme Durumu
  const sheet2 = workbook.addWorksheet("Taksitler");
  sheet2.columns = [
    { header: "Müşteri Adı", key: "customerName", width: 22 },
    { header: "Satış No", key: "saleNumber", width: 16 },
    { header: "Taksit No", key: "installmentNumber", width: 12 },
    { header: "Vade Tarihi", key: "dueDate", width: 14 },
    { header: "Taksit Tutarı", key: "amount", width: 16 },
    { header: "Ödenen Tutar", key: "paidAmount", width: 16 },
    { header: "Kalan Tutar", key: "remainingAmount", width: 16 },
    { header: "Durum", key: "status", width: 14 },
  ];
  styleHeaderRow(sheet2.getRow(1));

  cariTaksitData.installmentRows.forEach((inst) => {
    const row = sheet2.addRow({
      customerName: inst.customerName,
      saleNumber: inst.saleNumber,
      installmentNumber: Number(inst.installmentNumber),
      dueDate: new Date(inst.dueDate).toLocaleDateString("tr-TR"),
      amount: Number(inst.amount),
      paidAmount: Number(inst.paidAmount),
      remainingAmount: Number(inst.remainingAmount),
      status: inst.status,
    });

    row.getCell("installmentNumber").numFmt = INT_FORMAT;
    row.getCell("amount").numFmt = CURRENCY_FORMAT;
    row.getCell("paidAmount").numFmt = CURRENCY_FORMAT;
    row.getCell("remainingAmount").numFmt = CURRENCY_FORMAT;
  });
  autoFitColumns(sheet2);

  return workbook;
}

export async function buildOverviewExcelWorkbook(overviewData: OverviewReportData): Promise<ExcelJS.Workbook> {
  const workbook = new ExcelJS.Workbook();
  const sheet1 = workbook.addWorksheet("Genel Bakış Özet");
  sheet1.columns = [
    { header: "Metrik / Gösterge", key: "metric", width: 26 },
    { header: "Değer", key: "value", width: 20 },
    { header: "Açıklama / Değişim", key: "subtitle", width: 26 },
  ];
  styleHeaderRow(sheet1.getRow(1));

  const kpis = overviewData.kpis;
  sheet1.addRows([
    { metric: "Toplam Ciro", value: Number(kpis.totalCiro), subtitle: `Dönem Değişimi: %${kpis.ciroChange ?? 0}` },
    { metric: "Toplam Net Kâr", value: Number(kpis.totalProfit), subtitle: `Dönem Değişimi: %${kpis.profitChange ?? 0}` },
    { metric: "Satılan Cihaz Adedi", value: Number(kpis.soldDeviceCount), subtitle: `Dönem Değişimi: %${kpis.soldDeviceChange ?? 0}` },
    { metric: "Stoktaki Cihaz Adedi", value: Number(kpis.currentStockCount), subtitle: "Anlık Fiziksel Stok" },
    { metric: "Stok Maliyet Değeri", value: Number(kpis.currentStockCost), subtitle: "Alış Fiyatları Toplamı" },
    { metric: "Toplam Cari Alacak", value: Number(kpis.totalReceivables), subtitle: "Pozitif Cari Bakiyeler" },
    { metric: "Gecikmiş Taksit Sayısı", value: Number(kpis.overdueCount), subtitle: `${kpis.overdueAmount} TL geciken tutar` },
  ]);

  sheet1.getRow(2).getCell("value").numFmt = CURRENCY_FORMAT;
  sheet1.getRow(3).getCell("value").numFmt = CURRENCY_FORMAT;
  sheet1.getRow(4).getCell("value").numFmt = INT_FORMAT;
  sheet1.getRow(5).getCell("value").numFmt = INT_FORMAT;
  sheet1.getRow(6).getCell("value").numFmt = CURRENCY_FORMAT;
  sheet1.getRow(7).getCell("value").numFmt = CURRENCY_FORMAT;
  sheet1.getRow(8).getCell("value").numFmt = INT_FORMAT;

  autoFitColumns(sheet1);
  return workbook;
}

// ----------------------------------------------------
// MAIN ROUTE EXPORT FACADE
// ----------------------------------------------------

export async function generateReportExport(
  tab: string,
  opts: ReportFilterOptions
): Promise<{ filename: string; buffer: Buffer; mimeType: string }> {
  const dateSuffix = new Date().toISOString().split("T")[0];
  const mimeType = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

  let workbook: ExcelJS.Workbook;
  let filename = `Rapor_${dateSuffix}.xlsx`;

  if (tab === "sales") {
    const salesData = await getSalesReport({ ...opts, limit: 100000 });
    workbook = await buildSalesExcelWorkbook(salesData);
    filename = `Satis_Raporu_${dateSuffix}.xlsx`;
  } else if (tab === "profit") {
    const profitData = await getProfitReport(opts);
    workbook = await buildProfitExcelWorkbook(profitData);
    filename = `Kar_Raporu_${dateSuffix}.xlsx`;
  } else if (tab === "stock") {
    const stockData = await getStockReport();
    workbook = await buildStockExcelWorkbook(stockData);
    filename = `Stok_Raporu_${dateSuffix}.xlsx`;
  } else if (tab === "cariler-taksit" || tab === "cariler_taksit") {
    const cariTaksitData = await getCariTaksitReport();
    workbook = await buildCariTaksitExcelWorkbook(cariTaksitData);
    filename = `Cari_ve_Taksit_Raporu_${dateSuffix}.xlsx`;
  } else {
    const overviewData = await getOverviewReport(opts);
    workbook = await buildOverviewExcelWorkbook(overviewData);
    filename = `Genel_Bakis_Raporu_${dateSuffix}.xlsx`;
  }

  const arrayBuffer = await workbook.xlsx.writeBuffer();
  return {
    filename,
    buffer: Buffer.from(arrayBuffer),
    mimeType,
  };
}
