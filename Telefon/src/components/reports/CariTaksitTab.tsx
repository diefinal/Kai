"use client";

import React from "react";
import { ReportKpiCard } from "./ReportKpiCard";
import { Download, Wallet, Calendar, AlertCircle, CheckCircle2, Clock } from "lucide-react";

interface CariRow {
  id: string;
  name: string;
  type: string;
  alacagimiz: number;
  borcumuz: number;
  netBakiye: number;
}

interface InstallmentRow {
  id: string;
  customerName: string;
  saleNumber: string;
  dueDate: string | Date;
  installmentNumber: number;
  amount: number;
  paidAmount: number;
  remainingAmount: number;
  status: "Ödendi" | "Bekliyor" | "Gecikmiş";
}

interface CariTaksitReportData {
  cariKpis: {
    totalReceivables: number;
    totalPayables: number;
    netCariPosition: number;
  };
  cariRows: CariRow[];
  installmentKpis: {
    pendingCount: number;
    pendingAmount: number;
    overdueCount: number;
    overdueAmount: number;
  };
  installmentRows: InstallmentRow[];
}

interface CariTaksitTabProps {
  data: CariTaksitReportData | null;
  loading: boolean;
  onExport: () => void;
}

export default function CariTaksitTab({ data, loading, onExport }: CariTaksitTabProps) {
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

  const { cariKpis, cariRows, installmentKpis, installmentRows } = data;

  const formatCurrency = (val: number) =>
    new Intl.NumberFormat("tr-TR", { style: "currency", currency: "TRY" }).format(val);

  const formatDate = (dateInput: string | Date) => {
    const d = new Date(dateInput);
    return d.toLocaleDateString("tr-TR");
  };

  const getCariTypeLabel = (type: string) => {
    switch (type) {
      case "CUSTOMER":
        return "Müşteri";
      case "SUPPLIER":
        return "Tedarikçi";
      case "BOTH":
        return "Müşteri & Tedarikçi";
      default:
        return type;
    }
  };

  return (
    <div className="space-y-8">
      {/* Header & Export */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Wallet className="w-6 h-6 text-purple-500" />
            Cari & Taksit Raporu
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Müşteri/tedarikçi cari bakiyeleri ve satış taksitlerinin mevcut ödeme durumları.
          </p>
        </div>
        <button
          onClick={onExport}
          className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white font-medium text-sm rounded-lg transition-colors shadow-sm"
        >
          <Download className="w-4 h-4" />
          Cari & Taksit Raporunu İndir (Excel)
        </button>
      </div>

      {/* KPI Section 1: Cari Position */}
      <div>
        <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-3">
          1. Cari Bakiyeler & Finansal Pozisyon
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <ReportKpiCard
            title="Toplam Alacağımız"
            value={formatCurrency(cariKpis.totalReceivables)}
            subtitle="Cari hesabı pozitif olanlar"
            icon="profit"
          />
          <ReportKpiCard
            title="Toplam Borcumuz"
            value={formatCurrency(cariKpis.totalPayables)}
            subtitle="Cari hesabı negatif olanlar"
            icon="cost"
          />
          <ReportKpiCard
            title="Net Cari Pozisyonu"
            value={formatCurrency(cariKpis.netCariPosition)}
            subtitle="Alacaklar - Borçlar"
            icon="ciro"
          />
        </div>
      </div>

      {/* Cari Table */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="p-4 border-b border-gray-200 dark:border-gray-700 font-semibold text-gray-900 dark:text-white">
          Cari Hesap Detay Tablosu ({cariRows.length} Kayıt)
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left text-gray-500 dark:text-gray-400">
            <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-900/50 dark:text-gray-300">
              <tr>
                <th className="px-4 py-3">Cari / Unvan</th>
                <th className="px-4 py-3">Cari Tipi</th>
                <th className="px-4 py-3 text-right">Alacağımız (+ TL)</th>
                <th className="px-4 py-3 text-right">Borcumuz (- TL)</th>
                <th className="px-4 py-3 text-right">Net Bakiye</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {cariRows.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-gray-500">
                    Kayıtlı cari hesap bulunmuyor.
                  </td>
                </tr>
              ) : (
                cariRows.map((c) => (
                  <tr key={c.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                    <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">
                      {c.name}
                    </td>
                    <td className="px-4 py-3">
                      <span className="px-2 py-0.5 rounded text-xs bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300">
                        {getCariTypeLabel(c.type)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right text-emerald-600 dark:text-emerald-400 font-medium">
                      {c.alacagimiz > 0 ? formatCurrency(c.alacagimiz) : "-"}
                    </td>
                    <td className="px-4 py-3 text-right text-red-600 dark:text-red-400 font-medium">
                      {c.borcumuz > 0 ? formatCurrency(c.borcumuz) : "-"}
                    </td>
                    <td
                      className={`px-4 py-3 text-right font-bold ${
                        c.netBakiye > 0
                          ? "text-emerald-600 dark:text-emerald-400"
                          : c.netBakiye < 0
                          ? "text-red-600 dark:text-red-400"
                          : "text-gray-500"
                      }`}
                    >
                      {formatCurrency(c.netBakiye)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* KPI Section 2: Installments */}
      <div>
        <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
          <Calendar className="w-5 h-5 text-indigo-500" />
          2. Taksitli Satış Ödeme Takibi
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <ReportKpiCard
            title="Bekleyen Taksit Tutarı"
            value={formatCurrency(installmentKpis.pendingAmount)}
            subtitle={`${installmentKpis.pendingCount} adet bekleyen taksit`}
            icon="time"
          />
          <ReportKpiCard
            title="Gecikmiş Taksit Tutarı"
            value={formatCurrency(installmentKpis.overdueAmount)}
            subtitle={`${installmentKpis.overdueCount} adet gecikmiş taksit`}
            icon="cost"
          />
          <ReportKpiCard
            title="Geciken Taksit Sayısı"
            value={`${installmentKpis.overdueCount} Adet`}
            subtitle="Vadesi geçmiş henüz ödenmeyen"
            icon="receivable"
          />
        </div>
      </div>

      {/* Installment Table */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="p-4 border-b border-gray-200 dark:border-gray-700 font-semibold text-gray-900 dark:text-white">
          Taksit Takip Tablosu ({installmentRows.length} Taksit)
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left text-gray-500 dark:text-gray-400">
            <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-900/50 dark:text-gray-300">
              <tr>
                <th className="px-4 py-3">Müşteri</th>
                <th className="px-4 py-3">Satış No</th>
                <th className="px-4 py-3">Taksit No</th>
                <th className="px-4 py-3">Vade Tarihi</th>
                <th className="px-4 py-3 text-right">Taksit Tutarı</th>
                <th className="px-4 py-3 text-right">Ödenen</th>
                <th className="px-4 py-3 text-right">Kalan</th>
                <th className="px-4 py-3 text-center">Durum</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {installmentRows.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-gray-500">
                    Taksit kaydı bulunmuyor.
                  </td>
                </tr>
              ) : (
                installmentRows.map((inst) => (
                  <tr key={inst.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                    <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">
                      {inst.customerName}
                    </td>
                    <td className="px-4 py-3 font-mono text-xs">{inst.saleNumber}</td>
                    <td className="px-4 py-3 font-medium">{inst.installmentNumber}. Taksit</td>
                    <td className="px-4 py-3">{formatDate(inst.dueDate)}</td>
                    <td className="px-4 py-3 text-right font-medium text-gray-900 dark:text-white">
                      {formatCurrency(inst.amount)}
                    </td>
                    <td className="px-4 py-3 text-right text-emerald-600 dark:text-emerald-400">
                      {formatCurrency(inst.paidAmount)}
                    </td>
                    <td className="px-4 py-3 text-right font-semibold text-gray-900 dark:text-white">
                      {formatCurrency(inst.remainingAmount)}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {inst.status === "Ödendi" && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          Ödendi
                        </span>
                      )}
                      {inst.status === "Bekliyor" && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300">
                          <Clock className="w-3.5 h-3.5" />
                          Bekliyor
                        </span>
                      )}
                      {inst.status === "Gecikmiş" && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300">
                          <AlertCircle className="w-3.5 h-3.5" />
                          Gecikmiş
                        </span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
