import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { getPreviousEquivalentPeriod, calculatePercentageChange } from "./date-utils";

export interface ReportFilterOptions {
  startDate: Date;
  endDate: Date;
  brand?: string | null;
  search?: string | null;
  page?: number;
  limit?: number;
}

// ----------------------------------------------------
// 1. GENEL BAKIŞ SERVİSİ (OVERVIEW)
// ----------------------------------------------------
export async function getOverviewReport(filter: { startDate: Date; endDate: Date }) {
  const { startDate, endDate } = filter;
  const { prevStart, prevEnd } = getPreviousEquivalentPeriod(startDate, endDate);
  const now = new Date();

  // Parallel database queries with aggregations and slim selects
  const [
    currentSalesAgg,
    prevSalesAgg,
    currentSales,
    currentSaleItems,
    inStockDeviceAgg,
    positiveCarisAgg,
    overdueInstallmentsAgg,
    paymentGrouped,
  ] = await Promise.all([
    // Current period sales aggregate (Ciro & Profit)
    prisma.sale.aggregate({
      where: {
        status: "COMPLETED",
        saleDate: { gte: startDate, lte: endDate },
      },
      _sum: { totalAmount: true, totalProfit: true },
      _count: { id: true },
    }),

    // Previous period sales aggregate for comparison
    prisma.sale.aggregate({
      where: {
        status: "COMPLETED",
        saleDate: { gte: prevStart, lte: prevEnd },
      },
      _sum: { totalAmount: true, totalProfit: true },
      _count: { id: true },
    }),

    // Current period sales slim query for time-series chart
    prisma.sale.findMany({
      where: {
        status: "COMPLETED",
        saleDate: { gte: startDate, lte: endDate },
      },
      select: {
        saleDate: true,
        totalAmount: true,
        totalProfit: true,
      },
    }),

    // Current period flat saleItems query for brand and product breakdown
    prisma.saleItem.findMany({
      where: {
        sale: {
          status: "COMPLETED",
          saleDate: { gte: startDate, lte: endDate },
        },
      },
      select: {
        soldPrice: true,
        profit: true,
        device: {
          select: {
            ram: true,
            storage: true,
            model: {
              select: {
                brand: true,
                modelName: true,
              },
            },
          },
        },
      },
    }),

    // Instant Stock Metrics (count & cost)
    prisma.device.aggregate({
      where: { status: "IN_STOCK" },
      _sum: { purchasePrice: true },
      _count: { id: true },
    }),

    // Receivables from Caris (currentBalance > 0)
    prisma.cari.aggregate({
      where: { currentBalance: { gt: 0 } },
      _sum: { currentBalance: true },
    }),

    // Overdue Installments
    prisma.installment.findMany({
      where: {
        status: { in: ["PENDING", "PARTIALLY_PAID", "OVERDUE"] },
        dueDate: { lt: now },
      },
      select: { amount: true, paidAmount: true },
    }),

    // Payment method distribution grouped by method
    prisma.payment.groupBy({
      by: ["method"],
      where: {
        type: "INCOMING",
        date: { gte: startDate, lte: endDate },
      },
      _sum: { amount: true },
    }),
  ]);

  // Total sold device counts from current sale items
  const soldDeviceCount = currentSaleItems.length;

  // For previous period sold device count, run count query on SaleItem
  const prevSoldDeviceCount = await prisma.saleItem.count({
    where: {
      sale: {
        status: "COMPLETED",
        saleDate: { gte: prevStart, lte: prevEnd },
      },
    },
  });

  // KPI Calculations - Current Period
  const totalCiro = Number(currentSalesAgg._sum.totalAmount || 0);
  const totalProfit = Number(currentSalesAgg._sum.totalProfit || 0);

  // KPI Calculations - Previous Period Comparison
  const prevCiro = Number(prevSalesAgg._sum.totalAmount || 0);
  const prevProfit = Number(prevSalesAgg._sum.totalProfit || 0);

  const ciroChange = calculatePercentageChange(totalCiro, prevCiro);
  const profitChange = calculatePercentageChange(totalProfit, prevProfit);
  const soldDeviceChange = calculatePercentageChange(soldDeviceCount, prevSoldDeviceCount);

  // Instant Stock Metrics
  const currentStockCount = inStockDeviceAgg._count.id;
  const currentStockCost = Number(inStockDeviceAgg._sum.purchasePrice || 0);

  // Receivables
  const totalReceivables = Number(positiveCarisAgg._sum.currentBalance || 0);

  // Overdue Installments
  const overdueCount = overdueInstallmentsAgg.length;
  const overdueAmount = overdueInstallmentsAgg.reduce(
    (acc, inst) => acc + (Number(inst.amount) - Number(inst.paidAmount)),
    0
  );

  // Time-Series Revenue & Profit Chart Data (Daily / Monthly)
  const dailyMap = new Map<string, { date: string; ciro: number; profit: number }>();
  currentSales.forEach((s) => {
    const dateKey = s.saleDate.toISOString().split("T")[0];
    const existing = dailyMap.get(dateKey) || { date: dateKey, ciro: 0, profit: 0 };
    existing.ciro += Number(s.totalAmount);
    existing.profit += Number(s.totalProfit);
    dailyMap.set(dateKey, existing);
  });
  const timeSeriesData = Array.from(dailyMap.values()).sort((a, b) => a.date.localeCompare(b.date));

  // Sales by Brand
  const brandSalesMap = new Map<string, { brand: string; count: number; ciro: number }>();
  currentSaleItems.forEach((item) => {
    const b = item.device.model.brand;
    const existing = brandSalesMap.get(b) || { brand: b, count: 0, ciro: 0 };
    existing.count += 1;
    existing.ciro += Number(item.soldPrice);
    brandSalesMap.set(b, existing);
  });
  const brandSales = Array.from(brandSalesMap.values()).sort((a, b) => b.ciro - a.ciro);

  // Top Selling Products (Model + RAM + Storage)
  const productSalesMap = new Map<
    string,
    { key: string; brand: string; modelName: string; ram: string; storage: string; count: number; ciro: number; profit: number }
  >();
  currentSaleItems.forEach((item) => {
    const m = item.device.model;
    const key = `${m.brand} ${m.modelName} (${item.device.ram} / ${item.device.storage})`;
    const existing = productSalesMap.get(key) || {
      key,
      brand: m.brand,
      modelName: m.modelName,
      ram: item.device.ram,
      storage: item.device.storage,
      count: 0,
      ciro: 0,
      profit: 0,
    };
    existing.count += 1;
    existing.ciro += Number(item.soldPrice);
    existing.profit += Number(item.profit);
    productSalesMap.set(key, existing);
  });
  const topProducts = Array.from(productSalesMap.values()).sort((a, b) => b.count - a.count).slice(0, 10);

  // Payment Distribution in date range
  const paymentMethodMap = new Map<string, number>();
  paymentMethodMap.set("CASH", 0);
  paymentMethodMap.set("CREDIT_CARD", 0);
  paymentMethodMap.set("BANK_TRANSFER", 0);

  paymentGrouped.forEach((p) => {
    paymentMethodMap.set(p.method, Number(p._sum.amount || 0));
  });

  const paymentDistribution = [
    { method: "Nakit", amount: paymentMethodMap.get("CASH") || 0, key: "CASH" },
    { method: "Kredi Kartı", amount: paymentMethodMap.get("CREDIT_CARD") || 0, key: "CREDIT_CARD" },
    { method: "Havale / EFT", amount: paymentMethodMap.get("BANK_TRANSFER") || 0, key: "BANK_TRANSFER" },
  ];

  return {
    kpis: {
      totalCiro,
      ciroChange,
      totalProfit,
      profitChange,
      soldDeviceCount,
      soldDeviceChange,
      currentStockCount,
      currentStockCost,
      totalReceivables,
      overdueCount,
      overdueAmount,
    },
    timeSeriesData,
    brandSales,
    topProducts,
    paymentDistribution,
  };
}

// ----------------------------------------------------
// 2. SATIŞ RAPORU SERVİSİ (SALES)
// ----------------------------------------------------
export async function getSalesReport(opts: ReportFilterOptions) {
  const { startDate, endDate, brand, search, page = 1, limit = 15 } = opts;

  // Build Prisma where clause for Sales (COMPLETED sales only)
  const where: Prisma.SaleWhereInput = {
    status: "COMPLETED",
    saleDate: { gte: startDate, lte: endDate },
  };

  if (search) {
    const q = search.trim();
    where.OR = [
      { saleNumber: { contains: q, mode: "insensitive" } },
      { customer: { name: { contains: q, mode: "insensitive" } } },
      { items: { some: { device: { imei: { contains: q, mode: "insensitive" } } } } },
      { items: { some: { device: { model: { modelName: { contains: q, mode: "insensitive" } } } } } },
    ];
  }

  if (brand && brand !== "ALL") {
    where.items = {
      some: {
        device: {
          model: { brand },
        },
      },
    };
  }

  // Aggregate summary KPIs (for filtered set)
  const allFilteredSales = await prisma.sale.findMany({
    where,
    include: { items: true },
  });

  const totalSalesCount = allFilteredSales.length;
  const totalSoldDevices = allFilteredSales.reduce((acc, s) => acc + s.items.length, 0);
  const totalCiro = allFilteredSales.reduce((acc, s) => acc + Number(s.totalAmount), 0);
  const avgSaleAmount = totalSalesCount > 0 ? totalCiro / totalSalesCount : 0;

  // Paginated detailed sales rows
  const skip = (page - 1) * limit;
  const sales = await prisma.sale.findMany({
    where,
    include: {
      customer: { select: { id: true, name: true } },
      items: {
        include: {
          device: {
            include: { model: true },
          },
        },
      },
      payments: { select: { method: true } },
    },
    orderBy: { saleDate: "desc" },
    skip,
    take: limit,
  });

  // Flatten sales into line items for the detailed table
  const rows = [];
  for (const s of sales) {
    const paymentMethods = Array.from(new Set(s.payments.map((p) => p.method))).join(", ") || s.paymentType;
    for (const item of s.items) {
      rows.push({
        saleId: s.id,
        saleNumber: s.saleNumber,
        saleDate: s.saleDate,
        customerName: s.customer.name,
        brand: item.device.model.brand,
        modelName: item.device.model.modelName,
        ram: item.device.ram,
        storage: item.device.storage,
        color: item.device.color,
        imei: item.device.imei,
        soldPrice: Number(item.soldPrice),
        paidAmount: Number(s.paidAmount),
        remainingAmount: Number(s.remainingAmount),
        paymentType: s.paymentType,
        paymentMethods,
      });
    }
  }

  return {
    kpis: {
      totalSalesCount,
      totalSoldDevices,
      totalCiro,
      avgSaleAmount,
    },
    pagination: {
      page,
      limit,
      totalCount: totalSalesCount,
      totalPages: Math.ceil(totalSalesCount / limit),
    },
    rows,
  };
}

// ----------------------------------------------------
// 3. KÂR RAPORU SERVİSİ (PROFIT - SNAPSHOT BASED)
// ----------------------------------------------------
export async function getProfitReport(opts: ReportFilterOptions) {
  const { startDate, endDate, brand, search } = opts;

  const where: Prisma.SaleWhereInput = {
    status: "COMPLETED",
    saleDate: { gte: startDate, lte: endDate },
  };

  if (search) {
    const q = search.trim();
    where.OR = [
      { saleNumber: { contains: q, mode: "insensitive" } },
      { items: { some: { device: { model: { modelName: { contains: q, mode: "insensitive" } } } } } },
    ];
  }

  if (brand && brand !== "ALL") {
    where.items = {
      some: {
        device: {
          model: { brand },
        },
      },
    };
  }

  const sales = await prisma.sale.findMany({
    where,
    include: {
      items: {
        include: {
          device: {
            include: { model: true },
          },
        },
      },
    },
    orderBy: { saleDate: "desc" },
  });

  // Calculate snapshot-based metrics
  let totalCiro = 0;
  let totalCost = 0;
  let totalProfit = 0;

  const rows = [];
  const brandProfitMap = new Map<string, { brand: string; ciro: number; cost: number; profit: number }>();
  const productProfitMap = new Map<string, { key: string; brand: string; modelName: string; ram: string; storage: string; ciro: number; cost: number; profit: number }>();

  for (const s of sales) {
    for (const item of s.items) {
      const soldPrice = Number(item.soldPrice);
      const purchaseCost = Number(item.purchasePriceSnapshot); // Historical snapshot cost!
      const profit = Number(item.profit); // Historical snapshot profit!
      const margin = soldPrice > 0 ? (profit / soldPrice) * 100 : 0;

      totalCiro += soldPrice;
      totalCost += purchaseCost;
      totalProfit += profit;

      const m = item.device.model;
      rows.push({
        saleId: s.id,
        saleNumber: s.saleNumber,
        saleDate: s.saleDate,
        brand: m.brand,
        modelName: m.modelName,
        ram: item.device.ram,
        storage: item.device.storage,
        color: item.device.color,
        purchaseCost,
        soldPrice,
        profit,
        profitMargin: Number(margin.toFixed(1)),
      });

      // Brand summary
      const existingB = brandProfitMap.get(m.brand) || { brand: m.brand, ciro: 0, cost: 0, profit: 0 };
      existingB.ciro += soldPrice;
      existingB.cost += purchaseCost;
      existingB.profit += profit;
      brandProfitMap.set(m.brand, existingB);

      // Product summary
      const pKey = `${m.brand} ${m.modelName} (${item.device.ram}/${item.device.storage})`;
      const existingP = productProfitMap.get(pKey) || {
        key: pKey,
        brand: m.brand,
        modelName: m.modelName,
        ram: item.device.ram,
        storage: item.device.storage,
        ciro: 0,
        cost: 0,
        profit: 0,
      };
      existingP.ciro += soldPrice;
      existingP.cost += purchaseCost;
      existingP.profit += profit;
      productProfitMap.set(pKey, existingP);
    }
  }

  const overallMargin = totalCiro > 0 ? (totalProfit / totalCiro) * 100 : 0;

  const brandProfits = Array.from(brandProfitMap.values()).map((b) => ({
    ...b,
    margin: b.ciro > 0 ? Number(((b.profit / b.ciro) * 100).toFixed(1)) : 0,
  })).sort((a, b) => b.profit - a.profit);

  const productProfits = Array.from(productProfitMap.values()).map((p) => ({
    ...p,
    margin: p.ciro > 0 ? Number(((p.profit / p.ciro) * 100).toFixed(1)) : 0,
  })).sort((a, b) => b.profit - a.profit).slice(0, 15);

  return {
    kpis: {
      totalCiro,
      totalCost,
      totalProfit,
      overallMargin: Number(overallMargin.toFixed(1)),
    },
    brandProfits,
    productProfits,
    rows,
  };
}

// ----------------------------------------------------
// 4. STOK RAPORU SERVİSİ (STOCK - IN_STOCK DEVICES ONLY)
// ----------------------------------------------------
export async function getStockReport() {
  // Fetch ALL IN_STOCK devices
  const inStockDevices = await prisma.device.findMany({
    where: { status: "IN_STOCK" },
    include: { model: true },
  });

  const totalStockCount = inStockDevices.length;
  let totalStockCost = 0;
  let potentialSalesValue = 0;
  let potentialGrossProfit = 0;

  // Grouped Stock Table (Brand + Model + RAM + Storage + Color)
  const groupMap = new Map<
    string,
    {
      key: string;
      brand: string;
      modelName: string;
      ram: string;
      storage: string;
      color: string;
      count: number;
      unitCost: number;
      targetSalePrice: number;
      totalCost: number;
      potentialProfit: number;
    }
  >();

  for (const d of inStockDevices) {
    const cost = Number(d.purchasePrice);
    const targetSale = Number(d.salePrice);
    const profit = targetSale - cost;

    totalStockCost += cost;
    potentialSalesValue += targetSale;
    potentialGrossProfit += profit;

    const m = d.model;
    const key = `${m.brand}|||${m.modelName}|||${d.ram}|||${d.storage}|||${d.color}`;
    const existing = groupMap.get(key);

    if (existing) {
      existing.count += 1;
      existing.totalCost += cost;
      existing.potentialProfit += profit;
    } else {
      groupMap.set(key, {
        key,
        brand: m.brand,
        modelName: m.modelName,
        ram: d.ram,
        storage: d.storage,
        color: d.color,
        count: 1,
        unitCost: cost,
        targetSalePrice: targetSale,
        totalCost: cost,
        potentialProfit: profit,
      });
    }
  }

  const groupedRows = Array.from(groupMap.values()).sort((a, b) => {
    if (a.brand !== b.brand) return a.brand.localeCompare(b.brand);
    return a.modelName.localeCompare(b.modelName);
  });

  // Low Stock Items (count <= 2)
  const lowStockItems = groupedRows.filter((row) => row.count <= 2);

  // Active PhoneModels with 0 IN_STOCK devices (optimized with groupBy to eliminate N+1 queries)
  const [activeModels, inStockDeviceGroups] = await Promise.all([
    prisma.phoneModel.findMany({
      where: { isActive: true },
      select: {
        id: true,
        brand: true,
        modelName: true,
        ram: true,
        storage: true,
        color: true,
        basePrice: true,
      },
    }),
    prisma.device.groupBy({
      by: ["modelId"],
      where: { status: "IN_STOCK" },
      _count: { id: true },
    }),
  ]);

  const inStockModelIds = new Set(inStockDeviceGroups.map((g) => g.modelId));

  const outOfStockModels = activeModels
    .filter((m) => !inStockModelIds.has(m.id))
    .map((m) => ({
      id: m.id,
      brand: m.brand,
      modelName: m.modelName,
      ram: m.ram,
      storage: m.storage,
      color: m.color,
      basePrice: Number(m.basePrice),
    }));

  return {
    kpis: {
      totalStockCount,
      totalStockCost,
      potentialSalesValue,
      potentialGrossProfit,
    },
    groupedRows,
    lowStockItems,
    outOfStockModels,
  };
}

// ----------------------------------------------------
// 5. CARİ & TAKSİT RAPORU SERVİSİ
// ----------------------------------------------------
export async function getCariTaksitReport(opts?: { startDate?: Date; endDate?: Date }) {
  void opts; // acknowledge opts for linter
  // 1. CARİ KISMI (Cari Pozisyonu)
  const cariler = await prisma.cari.findMany({
    select: {
      id: true,
      name: true,
      type: true,
      currentBalance: true,
    },
    orderBy: { name: "asc" },
  });

  let totalReceivables = 0; // Alacağımız (currentBalance > 0)
  let totalPayables = 0;    // Borcumuz (currentBalance < 0)

  const cariRows = cariler.map((c) => {
    const bal = Number(c.currentBalance);
    const alacagimiz = bal > 0 ? bal : 0;
    const borcumuz = bal < 0 ? Math.abs(bal) : 0;

    totalReceivables += alacagimiz;
    totalPayables += borcumuz;

    return {
      id: c.id,
      name: c.name,
      type: c.type,
      alacagimiz,
      borcumuz,
      netBakiye: bal,
    };
  });

  const netCariPosition = totalReceivables - totalPayables;

  // 2. TAKSİT KISMI (Taksit Durumu)
  const now = new Date();
  const installments = await prisma.installment.findMany({
    include: {
      sale: {
        include: {
          customer: { select: { name: true } },
        },
      },
    },
    orderBy: { dueDate: "asc" },
  });

  let pendingCount = 0;
  let pendingAmount = 0;
  let overdueCount = 0;
  let overdueAmount = 0;

  const installmentRows = installments.map((inst) => {
    const amount = Number(inst.amount);
    const paidAmount = Number(inst.paidAmount);
    const remaining = amount - paidAmount;
    const isOverdue = inst.status !== "PAID" && inst.dueDate < now;

    if (inst.status !== "PAID") {
      pendingCount += 1;
      pendingAmount += remaining;
      if (isOverdue) {
        overdueCount += 1;
        overdueAmount += remaining;
      }
    }

    let displayStatus: "Ödendi" | "Bekliyor" | "Gecikmiş" = "Bekliyor";
    if (inst.status === "PAID") {
      displayStatus = "Ödendi";
    } else if (isOverdue) {
      displayStatus = "Gecikmiş";
    }

    return {
      id: inst.id,
      customerName: inst.sale.customer.name,
      saleNumber: inst.sale.saleNumber,
      dueDate: inst.dueDate,
      installmentNumber: inst.installmentNumber,
      amount,
      paidAmount,
      remainingAmount: remaining,
      status: displayStatus,
    };
  });

  return {
    cariKpis: {
      totalReceivables,
      totalPayables,
      netCariPosition,
    },
    cariRows,
    installmentKpis: {
      pendingCount,
      pendingAmount,
      overdueCount,
      overdueAmount,
    },
    installmentRows,
  };
}
