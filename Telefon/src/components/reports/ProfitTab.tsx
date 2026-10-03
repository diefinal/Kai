"use client";

import { Download, Search, TrendingUp, PieChart } from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/utils";
import { ReportKpiCard } from "./ReportKpiCard";

interface ProfitData {
  kpis: {
    totalCiro: number;
    totalCost: number;
    totalProfit: number;
    overallMargin: number;
  };
  brandProfits: {
    brand: string;
    ciro: number;
    cost: number;
    profit: number;
    margin: number;
  }[];
  productProfits: {
    key: string;
    brand: string;
    modelName: string;
    ram: string;
    storage: string;
    ciro: number;
    cost: number;
    profit: number;
    margin: number;
  }[];
  rows: {
    saleId: string;
    saleNumber: string;
    saleDate: string;
    brand: string;
    modelName: string;
    ram: string;
    storage: string;
    color: string;
    purchaseCost: number;
    soldPrice: number;
    profit: number;
    profitMargin: number;
  }[];
}

interface ProfitTabProps {
  data: ProfitData | null;
  search: string;
  onSearchChange: (search: string) => void;
  brand: string;
  onBrandChange: (brand: string) => void;
  onExportExcel: () => void;
}

const BRAND_OPTIONS = ["ALL", "Apple", "Samsung", "Xiaomi", "Huawei", "Google", "OnePlus", "Honor", "Infinix", "Realme", "Nothing"];

export function ProfitTab({
  data,
  search,
  onSearchChange,
  brand,
  onBrandChange,
  onExportExcel,
}: ProfitTabProps) {
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
  const { kpis, brandProfits, productProfits, rows } = data;

  return (
    <div className="space-y-6">
      {/* Top KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <ReportKpiCard title="Toplam Ciro" value={formatCurrency(kpis.totalCiro)} />
        <ReportKpiCard title="Satış Maliyeti" value={formatCurrency(kpis.totalCost)} subtitle="Geçmiş satış alış maliyetleri" />
        <ReportKpiCard title="Brüt Kâr" value={formatCurrency(kpis.totalProfit)} variant="emerald" icon={<TrendingUp className="w-4 h-4 text-emerald-600" />} />
        <ReportKpiCard title="Kâr Marjı (%)" value={`%${kpis.overallMargin}`} variant="emerald" subtitle="Brüt Kâr / Toplam Ciro × 100" />
      </div>

      {/* Filter & Search & Export Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        <div className="flex-1 flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Satış no veya model adı ara..."
              value={search}
              onChange={(e) => onSearchChange(e.target.value)}
              className="w-full pl-10 pr-4 py-2 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-slate-900"
            />
          </div>

          <select
            value={brand}
            onChange={(e) => onBrandChange(e.target.value)}
            className="py-2 px-3 text-xs font-semibold rounded-xl border border-slate-200 bg-slate-50 text-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-900"
          >
            <option value="ALL">Tüm Markalar</option>
            {BRAND_OPTIONS.filter((b) => b !== "ALL").map((b) => (
              <option key={b} value={b}>
                {b}
              </option>
            ))}
          </select>
        </div>

        <button
          onClick={onExportExcel}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold transition shadow-sm"
        >
          <Download className="w-3.5 h-3.5" />
          <span>Excel&apos;e Aktar</span>
        </button>
      </div>

      {/* Summaries: Markalara Göre Kâr & Ürünlere Göre Kâr */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Markalara Göre Kâr */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
          <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
            <PieChart className="w-4 h-4 text-emerald-600" />
            <span>Markalara Göre Kâr Özeti</span>
          </h3>
          {brandProfits.length === 0 ? (
            <div className="p-8 text-center text-slate-400 text-xs">Kâr verisi bulunmuyor.</div>
          ) : (
            <div className="divide-y divide-slate-100">
              {brandProfits.map((b) => (
                <div key={b.brand} className="py-2.5 flex items-center justify-between text-xs">
                  <div>
                    <span className="font-semibold text-slate-800 block">{b.brand}</span>
                    <span className="text-[11px] text-slate-400">
                      Ciro: {formatCurrency(b.ciro)} • Maliyet: {formatCurrency(b.cost)}
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="font-bold text-emerald-700 block">{formatCurrency(b.profit)}</span>
                    <span className="text-[11px] font-semibold text-emerald-600">%{b.margin} marj</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Ürünlere Göre Kâr (Top 15) */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
          <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-emerald-600" />
            <span>En Yüksek Kâr Getiren Ürünler</span>
          </h3>
          {productProfits.length === 0 ? (
            <div className="p-8 text-center text-slate-400 text-xs">Kâr verisi bulunmuyor.</div>
          ) : (
            <div className="divide-y divide-slate-100">
              {productProfits.map((p) => (
                <div key={p.key} className="py-2.5 flex items-center justify-between text-xs">
                  <div>
                    <span className="font-semibold text-slate-800 block">
                      {p.brand} {p.modelName}
                    </span>
                    <span className="text-[11px] text-slate-400">
                      {p.ram} • {p.storage}
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="font-bold text-emerald-700 block">{formatCurrency(p.profit)}</span>
                    <span className="text-[11px] font-semibold text-emerald-600">%{p.margin} marj</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Detailed Profit Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-100 font-bold text-slate-900 text-sm">
          Detaylı Kârlılık Tablosu (Snapshot Bazlı)
        </div>
        {rows.length === 0 ? (
          <div className="p-12 text-center text-slate-400 text-sm">
            Kriterlere uygun kârlılık kaydı bulunamadı.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200 uppercase font-semibold text-slate-500 tracking-wider">
                  <th className="py-3 px-3">Tarih</th>
                  <th className="py-3 px-3">Satış No</th>
                  <th className="py-3 px-3">Marka & Ürün</th>
                  <th className="py-3 px-3">Varyant</th>
                  <th className="py-3 px-3">Renk</th>
                  <th className="py-3 px-3 text-right">Alış Maliyeti (Snapshot)</th>
                  <th className="py-3 px-3 text-right">Satış Fiyatı</th>
                  <th className="py-3 px-3 text-right">Net Kâr</th>
                  <th className="py-3 px-3 text-right">Kâr Marjı %</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {rows.map((r, idx) => (
                  <tr key={`${r.saleId}-${idx}`} className="hover:bg-slate-50/60 transition">
                    <td className="py-2.5 px-3 text-slate-500 whitespace-nowrap">
                      {formatDate(r.saleDate)}
                    </td>
                    <td className="py-2.5 px-3 font-mono font-bold text-slate-900">
                      {r.saleNumber}
                    </td>
                    <td className="py-2.5 px-3 font-semibold text-slate-900">
                      {r.brand} {r.modelName}
                    </td>
                    <td className="py-2.5 px-3 text-slate-600">
                      <span className="font-semibold text-emerald-700">{r.ram}</span> • {r.storage}
                    </td>
                    <td className="py-2.5 px-3 text-slate-600">{r.color}</td>
                    <td className="py-2.5 px-3 text-right font-medium text-slate-700">
                      {formatCurrency(r.purchaseCost)}
                    </td>
                    <td className="py-2.5 px-3 text-right font-bold text-slate-900">
                      {formatCurrency(r.soldPrice)}
                    </td>
                    <td className="py-2.5 px-3 text-right font-bold text-emerald-700">
                      {formatCurrency(r.profit)}
                    </td>
                    <td className="py-2.5 px-3 text-right font-bold text-emerald-600">
                      %{r.profitMargin}
                    </td>
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
