"use client";

import { Download, Search } from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/utils";
import { ReportKpiCard } from "./ReportKpiCard";

interface SalesData {
  kpis: {
    totalSalesCount: number;
    totalSoldDevices: number;
    totalCiro: number;
    avgSaleAmount: number;
  };
  pagination: {
    page: number;
    limit: number;
    totalCount: number;
    totalPages: number;
  };
  rows: {
    saleId: string;
    saleNumber: string;
    saleDate: string;
    customerName: string;
    brand: string;
    modelName: string;
    ram: string;
    storage: string;
    color: string;
    imei: string | null;
    soldPrice: number;
    paidAmount: number;
    remainingAmount: number;
    paymentType: string;
    paymentMethods: string;
  }[];
}

interface SalesTabProps {
  data: SalesData | null;
  search: string;
  onSearchChange: (search: string) => void;
  brand: string;
  onBrandChange: (brand: string) => void;
  page: number;
  onPageChange: (page: number) => void;
  onExportExcel: () => void;
}

const BRAND_OPTIONS = ["ALL", "Apple", "Samsung", "Xiaomi", "Huawei", "Google", "OnePlus", "Honor", "Infinix", "Realme", "Nothing"];

export function SalesTab({
  data,
  search,
  onSearchChange,
  brand,
  onBrandChange,
  page,
  onPageChange,
  onExportExcel,
}: SalesTabProps) {
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
  const { kpis, pagination, rows } = data;

  return (
    <div className="space-y-6">
      {/* Top KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <ReportKpiCard title="Toplam Satış" value={`${kpis.totalSalesCount} adet işlem`} />
        <ReportKpiCard title="Satılan Cihaz" value={`${kpis.totalSoldDevices} adet`} />
        <ReportKpiCard title="Toplam Ciro" value={formatCurrency(kpis.totalCiro)} variant="emerald" />
        <ReportKpiCard title="Ortalama Satış Tutarı" value={formatCurrency(kpis.avgSaleAmount)} />
      </div>

      {/* Filter & Search & Export Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        <div className="flex-1 flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Satış no, müşteri adı veya IMEI ara..."
              value={search}
              onChange={(e) => {
                onSearchChange(e.target.value);
                onPageChange(1);
              }}
              className="w-full pl-10 pr-4 py-2 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-slate-900"
            />
          </div>

          <select
            value={brand}
            onChange={(e) => {
              onBrandChange(e.target.value);
              onPageChange(1);
            }}
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

      {/* Detailed Sales Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {rows.length === 0 ? (
          <div className="p-12 text-center text-slate-400 text-sm">
            Seçilen filtrelere uygun satış kaydı bulunamadı.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200 uppercase font-semibold text-slate-500 tracking-wider">
                  <th className="py-3 px-3">Tarih</th>
                  <th className="py-3 px-3">Satış No</th>
                  <th className="py-3 px-3">Müşteri</th>
                  <th className="py-3 px-3">Marka & Ürün</th>
                  <th className="py-3 px-3">RAM / Hafıza</th>
                  <th className="py-3 px-3">Renk</th>
                  <th className="py-3 px-3">IMEI</th>
                  <th className="py-3 px-3 text-right">Satış Fiyatı</th>
                  <th className="py-3 px-3 text-right">Ödenen</th>
                  <th className="py-3 px-3 text-right">Kalan</th>
                  <th className="py-3 px-3">Ödeme Tipi</th>
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
                    <td className="py-2.5 px-3 font-medium text-slate-800">
                      {r.customerName}
                    </td>
                    <td className="py-2.5 px-3 font-semibold text-slate-900">
                      {r.brand} {r.modelName}
                    </td>
                    <td className="py-2.5 px-3 text-slate-600">
                      <span className="font-semibold text-emerald-700">{r.ram}</span> • {r.storage}
                    </td>
                    <td className="py-2.5 px-3 text-slate-600">{r.color}</td>
                    <td className="py-2.5 px-3 font-mono text-[11px] text-slate-700">
                      {r.imei || "-"}
                    </td>
                    <td className="py-2.5 px-3 text-right font-bold text-slate-900">
                      {formatCurrency(r.soldPrice)}
                    </td>
                    <td className="py-2.5 px-3 text-right font-medium text-emerald-700">
                      {formatCurrency(r.paidAmount)}
                    </td>
                    <td className="py-2.5 px-3 text-right font-medium text-amber-700">
                      {formatCurrency(r.remainingAmount)}
                    </td>
                    <td className="py-2.5 px-3 text-slate-600">
                      <span className="px-2 py-0.5 rounded bg-slate-100 font-medium">
                        {r.paymentMethods || r.paymentType}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Footer */}
        {pagination.totalPages > 1 && (
          <div className="p-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span>
              Toplam {pagination.totalCount} kayıttan {(page - 1) * pagination.limit + 1}-
              {Math.min(page * pagination.limit, pagination.totalCount)} arası gösteriliyor
            </span>
            <div className="flex gap-1.5">
              <button
                disabled={page <= 1}
                onClick={() => onPageChange(page - 1)}
                className="px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-40 font-semibold"
              >
                Önceki
              </button>
              <span className="px-3 py-1.5 font-bold text-slate-900">
                {page} / {pagination.totalPages}
              </span>
              <button
                disabled={page >= pagination.totalPages}
                onClick={() => onPageChange(page + 1)}
                className="px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-40 font-semibold"
              >
                Sonraki
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
