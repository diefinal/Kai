"use client";

import {
  DollarSign,
  TrendingUp,
  Smartphone,
  Boxes,
  Users,
  AlertCircle,
  CreditCard,
  Award,
} from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { ReportKpiCard } from "./ReportKpiCard";

interface OverviewData {
  kpis: {
    totalCiro: number;
    ciroChange: number | null;
    totalProfit: number;
    profitChange: number | null;
    soldDeviceCount: number;
    soldDeviceChange: number | null;
    currentStockCount: number;
    currentStockCost: number;
    totalReceivables: number;
    overdueCount: number;
    overdueAmount: number;
  };
  timeSeriesData: { date: string; ciro: number; profit: number }[];
  brandSales: { brand: string; count: number; ciro: number }[];
  topProducts: {
    key: string;
    brand: string;
    modelName: string;
    ram: string;
    storage: string;
    count: number;
    ciro: number;
    profit: number;
  }[];
  paymentDistribution: { method: string; amount: number; key: string }[];
}

export function OverviewTab({ data }: { data: OverviewData | null }) {
  if (!data) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-28 bg-gray-200 dark:bg-gray-800 rounded-xl" />
          ))}
        </div>
        <div className="h-64 bg-gray-200 dark:bg-gray-800 rounded-xl" />
      </div>
    );
  }

  const { kpis, timeSeriesData, brandSales, topProducts, paymentDistribution } = data;
  const maxCiro = Math.max(...timeSeriesData.map((d) => d.ciro), 1);

  return (
    <div className="space-y-6">
      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <ReportKpiCard
          title="Toplam Ciro"
          value={formatCurrency(kpis.totalCiro)}
          change={kpis.ciroChange}
          variant="emerald"
          icon={<DollarSign className="w-4 h-4 text-emerald-600" />}
        />
        <ReportKpiCard
          title="Toplam Kâr"
          value={formatCurrency(kpis.totalProfit)}
          change={kpis.profitChange}
          variant="emerald"
          icon={<TrendingUp className="w-4 h-4 text-emerald-600" />}
        />
        <ReportKpiCard
          title="Satılan Cihaz"
          value={`${kpis.soldDeviceCount} adet`}
          change={kpis.soldDeviceChange}
          icon={<Smartphone className="w-4 h-4 text-slate-600" />}
        />
        <ReportKpiCard
          title="Mevcut Stok"
          value={`${kpis.currentStockCount} adet`}
          subtitle={`Stok Maliyeti: ${formatCurrency(kpis.currentStockCost)}`}
          icon={<Boxes className="w-4 h-4 text-slate-600" />}
        />
        <ReportKpiCard
          title="Bekleyen Alacak"
          value={formatCurrency(kpis.totalReceivables)}
          subtitle="Müşteri carilerindeki pozitif bakiyeler"
          variant="blue"
          icon={<Users className="w-4 h-4 text-blue-600" />}
        />
        <ReportKpiCard
          title="Geciken Taksit"
          value={formatCurrency(kpis.overdueAmount)}
          subtitle={`${kpis.overdueCount} adet taksit vadesi geçti`}
          variant={kpis.overdueCount > 0 ? "red" : "default"}
          icon={<AlertCircle className="w-4 h-4 text-red-600" />}
        />
      </div>

      {/* Ciro & Kâr Zaman Serisi Grafiği */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-bold text-slate-900 text-base">Ciro & Kâr Zaman Serisi</h3>
            <p className="text-xs text-slate-400">Seçilen tarih aralığındaki günlük ciro ve kâr seyri</p>
          </div>
          <div className="flex items-center gap-4 text-xs font-semibold">
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full bg-emerald-600 inline-block" /> Ciro
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full bg-emerald-400 inline-block" /> Kâr
            </span>
          </div>
        </div>

        {timeSeriesData.length === 0 ? (
          <div className="p-8 text-center text-slate-400 text-xs">
            Seçilen tarih aralığında gösterilecek ciro verisi bulunmuyor.
          </div>
        ) : (
          <div className="space-y-3 pt-2">
            {timeSeriesData.map((item) => {
              const ciroPct = Math.min(100, Math.max(4, (item.ciro / maxCiro) * 100));
              const profitPct = Math.min(100, Math.max(2, (item.profit / maxCiro) * 100));
              return (
                <div key={item.date} className="space-y-1">
                  <div className="flex justify-between text-xs font-medium">
                    <span className="text-slate-600 font-mono">{item.date}</span>
                    <span className="text-slate-900 font-bold">
                      {formatCurrency(item.ciro)}{" "}
                      <span className="text-emerald-600 text-[11px]">
                        (Kâr: {formatCurrency(item.profit)})
                      </span>
                    </span>
                  </div>
                  <div className="h-3 w-full bg-slate-100 rounded-full overflow-hidden relative flex">
                    <div
                      style={{ width: `${ciroPct}%` }}
                      className="bg-emerald-600 h-full rounded-full transition-all duration-300 relative"
                    />
                    <div
                      style={{ width: `${profitPct}%` }}
                      className="bg-emerald-400 h-full rounded-full transition-all duration-300 absolute left-0 top-0 opacity-80"
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Grid: Marka Satışları & Ödeme Dağılımı */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Markalara Göre Satış */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
          <h3 className="font-bold text-slate-900 text-base">Markalara Göre Satış</h3>
          {brandSales.length === 0 ? (
            <div className="p-8 text-center text-slate-400 text-xs">Satış verisi bulunmuyor.</div>
          ) : (
            <div className="divide-y divide-slate-100">
              {brandSales.map((b) => (
                <div key={b.brand} className="py-2.5 flex items-center justify-between text-xs">
                  <span className="font-semibold text-slate-800">{b.brand}</span>
                  <div className="text-right">
                    <span className="font-bold text-slate-900 block">{formatCurrency(b.ciro)}</span>
                    <span className="text-[11px] text-slate-400">{b.count} adet satıldı</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Ödeme Yöntemi Dağılımı */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
          <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
            <CreditCard className="w-4 h-4 text-slate-500" />
            <span>Ödeme Yöntemi Dağılımı</span>
          </h3>
          <div className="space-y-3">
            {paymentDistribution.map((p) => (
              <div key={p.key} className="p-3 bg-slate-50 rounded-xl border border-slate-100 flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-700">{p.method}</span>
                <span className="text-sm font-bold text-slate-900">{formatCurrency(p.amount)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* En Çok Satan Ürünler */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
        <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
          <Award className="w-4 h-4 text-emerald-600" />
          <span>En Çok Satan Ürünler (Model + RAM + Hafıza)</span>
        </h3>
        {topProducts.length === 0 ? (
          <div className="p-8 text-center text-slate-400 text-xs">En çok satan ürün verisi bulunmuyor.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-500 uppercase font-semibold">
                  <th className="py-2.5 px-3">Marka & Model</th>
                  <th className="py-2.5 px-3">Varyant</th>
                  <th className="py-2.5 px-3 text-right">Satış Adedi</th>
                  <th className="py-2.5 px-3 text-right">Toplam Ciro</th>
                  <th className="py-2.5 px-3 text-right">Toplam Kâr</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {topProducts.map((p) => (
                  <tr key={p.key} className="hover:bg-slate-50/60">
                    <td className="py-3 px-3 font-semibold text-slate-900">
                      {p.brand} {p.modelName}
                    </td>
                    <td className="py-3 px-3 text-slate-600">
                      <span className="font-semibold text-emerald-700 mr-1">{p.ram}</span> • {p.storage}
                    </td>
                    <td className="py-3 px-3 text-right font-bold text-slate-900">{p.count} adet</td>
                    <td className="py-3 px-3 text-right font-bold text-slate-900">{formatCurrency(p.ciro)}</td>
                    <td className="py-3 px-3 text-right font-bold text-emerald-700">{formatCurrency(p.profit)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
