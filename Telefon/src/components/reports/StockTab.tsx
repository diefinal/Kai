"use client";

import React from "react";
import { ReportKpiCard } from "./ReportKpiCard";
import { Download, AlertTriangle, PackageX, Boxes } from "lucide-react";

interface StockGroupRow {
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

interface OutOfStockModel {
  id: string;
  brand: string;
  modelName: string;
  ram: string;
  storage: string;
  color: string;
  basePrice: number;
}

interface StockReportData {
  kpis: {
    totalStockCount: number;
    totalStockCost: number;
    potentialSalesValue: number;
    potentialGrossProfit: number;
  };
  groupedRows: StockGroupRow[];
  lowStockItems: StockGroupRow[];
  outOfStockModels: OutOfStockModel[];
}

interface StockTabProps {
  data: StockReportData | null;
  loading: boolean;
  onExport: () => void;
}

export default function StockTab({ data, loading, onExport }: StockTabProps) {
  if (loading || !data) {
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

  const { kpis, groupedRows, lowStockItems, outOfStockModels } = data;

  const formatCurrency = (val: number) =>
    new Intl.NumberFormat("tr-TR", { style: "currency", currency: "TRY" }).format(val);

  return (
    <div className="space-y-6">
      {/* Header & Export */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Boxes className="w-6 h-6 text-emerald-500" />
            Anlık Stok Raporu
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Yalnızca mevcut stoktaki (IN_STOCK) cihazlar üzerinden maliyet ve potansiyel kâr hesaplanır.
          </p>
        </div>
        <button
          onClick={onExport}
          className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-medium text-sm rounded-lg transition-colors shadow-sm"
        >
          <Download className="w-4 h-4" />
          Stok Raporunu İndir (Excel)
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <ReportKpiCard
          title="Toplam Stok Adedi"
          value={`${kpis.totalStockCount} Adet`}
          subtitle="Stoktaki toplam fiziksel cihaz"
          icon="stock"
        />
        <ReportKpiCard
          title="Stok Maliyet Değeri"
          value={formatCurrency(kpis.totalStockCost)}
          subtitle="Alış fiyatları toplamı"
          icon="cost"
        />
        <ReportKpiCard
          title="Potansiyel Satış Değeri"
          value={formatCurrency(kpis.potentialSalesValue)}
          subtitle="Hedef satış fiyatları toplamı"
          icon="ciro"
        />
        <ReportKpiCard
          title="Potansiyel Brüt Kâr"
          value={formatCurrency(kpis.potentialGrossProfit)}
          subtitle="Satıldığında elde edilecek kâr"
          icon="profit"
        />
      </div>

      {/* Low Stock Warning Banner */}
      {lowStockItems.length > 0 && (
        <div className="bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-xl p-4">
          <div className="flex items-center gap-2 text-amber-800 dark:text-amber-300 font-semibold mb-3">
            <AlertTriangle className="w-5 h-5 text-amber-500" />
            <span>Kritik Stok Uyarısı (2 ve Daha Az Kalan Ürünler - {lowStockItems.length} Çeşit)</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {lowStockItems.map((item) => (
              <div
                key={item.key}
                className="bg-white dark:bg-gray-800 p-3 rounded-lg border border-amber-100 dark:border-amber-900 shadow-sm text-sm"
              >
                <div className="font-semibold text-gray-900 dark:text-white">
                  {item.brand} {item.modelName}
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400">
                  {item.ram} / {item.storage} — {item.color}
                </div>
                <div className="mt-2 flex justify-between items-center text-xs">
                  <span className="text-gray-500">Stok:</span>
                  <span className="font-bold text-amber-600 dark:text-amber-400 bg-amber-100 dark:bg-amber-900/60 px-2 py-0.5 rounded">
                    {item.count} Adet
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Main Grouped Stock Table */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="p-4 border-b border-gray-200 dark:border-gray-700 font-semibold text-gray-900 dark:text-white">
          Stok Detay Listesi (Model, RAM, Depolama & Renk Bazlı)
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left text-gray-500 dark:text-gray-400">
            <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-900/50 dark:text-gray-300">
              <tr>
                <th className="px-4 py-3">Marka & Model</th>
                <th className="px-4 py-3">RAM / Depolama</th>
                <th className="px-4 py-3">Renk</th>
                <th className="px-4 py-3 text-center">Stok Adedi</th>
                <th className="px-4 py-3 text-right">Ort. Birim Maliyet</th>
                <th className="px-4 py-3 text-right">Hedef Satış Fiyatı</th>
                <th className="px-4 py-3 text-right">Toplam Maliyet</th>
                <th className="px-4 py-3 text-right">Potansiyel Kâr</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {groupedRows.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-gray-500">
                    Stokta hiç cihaz bulunmuyor.
                  </td>
                </tr>
              ) : (
                groupedRows.map((row) => (
                  <tr key={row.key} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                    <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">
                      {row.brand} {row.modelName}
                    </td>
                    <td className="px-4 py-3">{row.ram} / {row.storage}</td>
                    <td className="px-4 py-3">{row.color}</td>
                    <td className="px-4 py-3 text-center font-bold text-gray-900 dark:text-white">
                      <span className={`px-2 py-0.5 rounded text-xs ${row.count <= 2 ? "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300" : "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300"}`}>
                        {row.count} Adet
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">{formatCurrency(row.unitCost)}</td>
                    <td className="px-4 py-3 text-right font-medium text-gray-900 dark:text-white">
                      {formatCurrency(row.targetSalePrice)}
                    </td>
                    <td className="px-4 py-3 text-right">{formatCurrency(row.totalCost)}</td>
                    <td className="px-4 py-3 text-right font-semibold text-emerald-600 dark:text-emerald-400">
                      {formatCurrency(row.potentialProfit)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Out of Stock Active Models */}
      {outOfStockModels.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="p-4 border-b border-gray-200 dark:border-gray-700 font-semibold text-gray-900 dark:text-white flex items-center gap-2">
            <PackageX className="w-5 h-5 text-red-500" />
            Tükenen Aktif Ürün Tanımları ({outOfStockModels.length} Model)
          </div>
          <div className="p-4 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {outOfStockModels.map((m) => (
              <div
                key={m.id}
                className="bg-gray-50 dark:bg-gray-900/50 p-3 rounded-lg border border-gray-200 dark:border-gray-700 text-sm"
              >
                <div className="font-semibold text-gray-900 dark:text-white">
                  {m.brand} {m.modelName}
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400">
                  {m.ram} / {m.storage} — {m.color}
                </div>
                <div className="mt-2 text-xs font-medium text-red-600 dark:text-red-400">
                  Stokta 0 Adet
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
