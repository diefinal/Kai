import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const now = new Date();

    // Bugünün başlangıcı ve bitişi
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
    const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

    // Bu ayın başlangıcı
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
    const thirtyDaysLater = new Date(now.getTime() + 30 * 86400000);

    const [
      totalModels,
      deviceStatusGroups,
      todaySales,
      monthSales,
      positiveCariAgg,
      negativeCariAgg,
      totalCarilerCount,
      unpaidInstallments,
    ] = await Promise.all([
      // 1. Aktif model sayısı
      prisma.phoneModel.count({ where: { isActive: true } }),

      // 2. Cihaz durumları ve stok maliyeti (Tek gruplanmış sorgu)
      prisma.device.groupBy({
        by: ["status"],
        _count: { id: true },
        _sum: { purchasePrice: true },
      }),

      // 3. Bugünkü satışlar (COMPLETED)
      prisma.sale.aggregate({
        where: {
          status: "COMPLETED",
          saleDate: { gte: startOfToday, lte: endOfToday },
        },
        _sum: { totalAmount: true, totalProfit: true },
        _count: { id: true },
      }),

      // 4. Bu ayki satışlar (COMPLETED)
      prisma.sale.aggregate({
        where: {
          status: "COMPLETED",
          saleDate: { gte: startOfMonth },
        },
        _sum: { totalAmount: true, totalProfit: true },
        _count: { id: true },
      }),

      // 5. Cari bakiyeleri (Alacak > 0)
      prisma.cari.aggregate({
        where: { currentBalance: { gt: 0 } },
        _sum: { currentBalance: true },
      }),

      // 6. Cari bakiyeleri (Borç < 0)
      prisma.cari.aggregate({
        where: { currentBalance: { lt: 0 } },
        _sum: { currentBalance: true },
      }),

      // 7. Toplam cari sayısı
      prisma.cari.count(),

      // 8. Ödenmemiş taksitler (Tek sorguda hem yaklaşan hem gecikmiş)
      prisma.installment.findMany({
        where: {
          status: { in: ["PENDING", "PARTIALLY_PAID", "OVERDUE"] },
          sale: { status: "COMPLETED" },
        },
        select: { amount: true, paidAmount: true, dueDate: true, status: true },
      }),
    ]);

    // Cihaz sayıları ve maliyet ayrıştırma
    let inStockDevices = 0;
    let reservedDevices = 0;
    let soldDevices = 0;
    let totalStockCost = 0;

    for (const group of deviceStatusGroups) {
      if (group.status === "IN_STOCK") {
        inStockDevices = group._count.id;
        totalStockCost = Number(group._sum.purchasePrice || 0);
      } else if (group.status === "RESERVED") {
        reservedDevices = group._count.id;
      } else if (group.status === "SOLD") {
        soldDevices = group._count.id;
      }
    }

    // Müşteri alacakları (> 0) ve tedarikçi borçları (< 0)
    const totalReceivable = Number(positiveCariAgg._sum.currentBalance || 0);
    const totalPayable = Math.abs(Number(negativeCariAgg._sum.currentBalance || 0));

    // Taksit analizi
    let upcomingInstallmentsCount = 0;
    let upcomingAmount = 0;
    let overdueInstallmentsCount = 0;
    let overdueAmount = 0;

    for (const ins of unpaidInstallments) {
      const remaining = Number(ins.amount) - Number(ins.paidAmount);
      const due = new Date(ins.dueDate);

      if (due < startOfToday) {
        overdueInstallmentsCount++;
        overdueAmount += remaining;
      } else if (due <= thirtyDaysLater) {
        upcomingInstallmentsCount++;
        upcomingAmount += remaining;
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        totalModels,
        inStockDevices,
        reservedDevices,
        soldDevices,
        totalStockCost,
        // Bugün
        todaySalesCount: todaySales._count.id,
        todaySalesRevenue: Number(todaySales._sum.totalAmount || 0),
        todaySalesProfit: Number(todaySales._sum.totalProfit || 0),
        // Bu Ay
        monthSalesCount: monthSales._count.id,
        monthSalesRevenue: Number(monthSales._sum.totalAmount || 0),
        monthSalesProfit: Number(monthSales._sum.totalProfit || 0),
        // Finans / Cari
        totalReceivable,
        totalPayable,
        totalCariler: totalCarilerCount,
        // Taksitler
        upcomingInstallmentsCount,
        upcomingAmount,
        overdueInstallmentsCount,
        overdueAmount,
      },
    });
  } catch (error: unknown) {
    console.error("Admin overview hatası:", error);
    return NextResponse.json(
      { success: false, error: "İstatistikler getirilirken hata oluştu." },
      { status: 500 }
    );
  }
}
