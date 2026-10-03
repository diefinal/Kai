"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Boxes,
  TrendingUp,
  Users,
  ArrowDownLeft,
  CalendarDays,
  AlertTriangle,
  Receipt,
  ShoppingCart,
  Wallet,
  Landmark,
} from "lucide-react";
import { formatCurrency } from "@/lib/utils";

interface OverviewStats {
  totalModels: number;
  inStockDevices: number;
  reservedDevices: number;
  soldDevices: number;
  totalStockCost: number;
  // Bugün
  todaySalesCount: number;
  todaySalesRevenue: number;
  todaySalesProfit: number;
  // Bu Ay
  monthSalesCount: number;
  monthSalesRevenue: number;
  monthSalesProfit: number;
  // Finans / Cari
  totalReceivable: number;
  totalPayable: number;
  totalCariler: number;
  // Taksitler
  upcomingInstallmentsCount: number;
  upcomingAmount: number;
  overdueInstallmentsCount: number;
  overdueAmount: number;
}

interface ExchangeRateData {
  success: boolean;
  date: string;
  rates: {
    USD: { buying: number; selling: number };
    EUR: { buying: number; selling: number };
  };
}

export default function YonetimDashboardPage() {
  const [stats, setStats] = useState<OverviewStats | null>(null);
  const [ratesData, setRatesData] = useState<ExchangeRateData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadStats() {
      try {
        const res = await fetch("/api/admin/overview");
        const json = await res.json();
        if (json.success && json.data) {
          setStats(json.data);
        }
      } catch (err) {
        console.error("İstatistikler alınamadı:", err);
      } finally {
        setLoading(false);
      }
    }

    async function loadRates() {
      try {
        const res = await fetch("/api/public/exchange-rates");
        const json = await res.json();
        if (json.success && json.rates) {
          setRatesData(json);
        }
      } catch (err) {
        console.error("Kur verileri alınamadı:", err);
      }
    }

    loadStats();
    loadRates();
  }, []);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
            Genel Bakış
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            İşletmenizin anlık satış cirosu, net kâr, stok maliyeti ve cari hesap durumu.
          </p>
        </div>

        {/* Quick Actions */}
        <div className="flex flex-wrap gap-2.5">
          <Link
            href="/yonetim/satislar"
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-sm font-semibold transition shadow-sm"
          >
            <ShoppingCart className="w-4 h-4" />
            <span>Yeni Satış Yap</span>
          </Link>
          <Link
            href="/yonetim/stoklar"
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-semibold transition shadow-sm"
          >
            <ArrowDownLeft className="w-4 h-4" />
            <span>Yeni Alış / Stok Girişi</span>
          </Link>
        </div>
      </div>

      {/* Top 4 Primary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* Stok Durumu */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Aktif Stokta
            </span>
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <Boxes className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4">
            <span className="text-3xl font-extrabold text-slate-900">
              {loading ? "..." : stats?.inStockDevices ?? 0}
            </span>
            <span className="text-xs text-slate-500 ml-1.5">cihaz</span>
          </div>
          <p className="text-xs text-slate-400 mt-2">
            Maliyet Değeri:{" "}
            <strong className="text-slate-700">
              {formatCurrency(stats?.totalStockCost ?? 0)}
            </strong>
          </p>
        </div>

        {/* Bu Ayki Satış Cirosu */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Bu Ayki Satış
            </span>
            <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
              <Receipt className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4">
            <span className="text-2xl sm:text-3xl font-extrabold text-slate-900">
              {loading ? "..." : formatCurrency(stats?.monthSalesRevenue ?? 0)}
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-2">
            {stats?.monthSalesCount ?? 0} satış işlemi (Bugün: {stats?.todaySalesCount ?? 0} adet / {formatCurrency(stats?.todaySalesRevenue ?? 0)})
          </p>
        </div>

        {/* Bu Ayki Net Kâr */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Bu Ayki Net Kâr
            </span>
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <TrendingUp className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4">
            <span className="text-2xl sm:text-3xl font-extrabold text-emerald-600">
              {loading ? "..." : formatCurrency(stats?.monthSalesProfit ?? 0)}
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-2">
            Bugün: <strong className="text-emerald-700">{formatCurrency(stats?.todaySalesProfit ?? 0)}</strong>
          </p>
        </div>

        {/* Müşteri Alacakları */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Müşteri Alacağımız
            </span>
            <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 flex items-center justify-center">
              <Wallet className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4">
            <span className="text-2xl sm:text-3xl font-extrabold text-emerald-700 dark:text-emerald-400">
              {loading ? "..." : formatCurrency(stats?.totalReceivable ?? 0)}
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-2">
            Tedarikçi Borcumuz:{" "}
            <strong className="text-amber-700 dark:text-amber-400">
              {formatCurrency(stats?.totalPayable ?? 0)}
            </strong>
          </p>
        </div>
      </div>

      {/* TCMB Döviz Kurları Bilgi Kartları */}
      <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
          <div>
            <h3 className="font-bold text-slate-900 dark:text-white text-base flex items-center gap-2">
              <Landmark className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
              <span>TCMB Döviz Kurları Göstergesi</span>
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Kaynak: Türkiye Cumhuriyet Merkez Bankası (TCMB) • Bilgi Amaçlıdır.
            </p>
          </div>
          {ratesData && (
            <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
              Kur Tarihi: <strong className="text-slate-800 dark:text-slate-200">{ratesData.date}</strong>
            </span>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* USD Card */}
          <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 flex items-center justify-between">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="font-black text-sm text-slate-900 dark:text-white bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 px-2 py-0.5 rounded">
                  USD
                </span>
                <span className="text-xs font-bold text-slate-700 dark:text-slate-300">ABD Doları</span>
              </div>
              <div className="text-xs text-slate-500 dark:text-slate-400 pt-1">
                Döviz Alış: <strong className="text-slate-900 dark:text-white">{ratesData?.rates.USD.buying.toFixed(4) ?? "..."} ₺</strong>
              </div>
            </div>
            <div className="text-right">
              <span className="text-xs text-slate-400 block font-medium">Döviz Satış</span>
              <span className="text-xl font-extrabold text-slate-900 dark:text-white">
                {ratesData?.rates.USD.selling.toFixed(4) ?? "..."} <span className="text-sm font-bold text-emerald-600">₺</span>
              </span>
            </div>
          </div>

          {/* EUR Card */}
          <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 flex items-center justify-between">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="font-black text-sm text-slate-900 dark:text-white bg-blue-100 dark:bg-blue-950/80 text-blue-800 dark:text-blue-300 px-2 py-0.5 rounded">
                  EUR
                </span>
                <span className="text-xs font-bold text-slate-700 dark:text-slate-300">Euro</span>
              </div>
              <div className="text-xs text-slate-500 dark:text-slate-400 pt-1">
                Döviz Alış: <strong className="text-slate-900 dark:text-white">{ratesData?.rates.EUR.buying.toFixed(4) ?? "..."} ₺</strong>
              </div>
            </div>
            <div className="text-right">
              <span className="text-xs text-slate-400 block font-medium">Döviz Satış</span>
              <span className="text-xl font-extrabold text-slate-900 dark:text-white">
                {ratesData?.rates.EUR.selling.toFixed(4) ?? "..."} <span className="text-sm font-bold text-blue-600">₺</span>
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Secondary Row: Taksitler & Finansal Durum */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Taksit Durumu Kartı */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
                <CalendarDays className="w-5 h-5 text-purple-600" />
                <span>Taksit ve Vade Durumu</span>
              </h3>
              <Link
                href="/yonetim/taksitler"
                className="text-xs font-semibold text-purple-600 hover:underline"
              >
                Taksitleri Gör →
              </Link>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                <span className="text-xs font-semibold text-slate-500 block mb-1">
                  Yaklaşan (30 Gün İçinde)
                </span>
                <span className="text-xl font-bold text-slate-900">
                  {loading ? "..." : formatCurrency(stats?.upcomingAmount ?? 0)}
                </span>
                <span className="text-[11px] text-slate-400 block mt-1">
                  {stats?.upcomingInstallmentsCount ?? 0} adet taksit
                </span>
              </div>

              <div className="p-4 rounded-xl bg-red-50/40 border border-red-200">
                <span className="text-xs font-semibold text-red-600 block mb-1 flex items-center gap-1">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  Gecikmiş Taksitler
                </span>
                <span className="text-xl font-bold text-red-700">
                  {loading ? "..." : formatCurrency(stats?.overdueAmount ?? 0)}
                </span>
                <span className="text-[11px] text-red-500 block mt-1">
                  {stats?.overdueInstallmentsCount ?? 0} adet vadesi geçmiş
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Cari Bakiye ve Hızlı Aksiyonlar */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
                <Users className="w-5 h-5 text-blue-600" />
                <span>Cari ve Finansal Denge</span>
              </h3>
              <Link
                href="/yonetim/cariler"
                className="text-xs font-semibold text-blue-600 hover:underline"
              >
                Carilere Git →
              </Link>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 rounded-xl bg-emerald-50/40 border border-emerald-200">
                <span className="text-xs font-semibold text-emerald-700 block mb-1">
                  Toplam Alacağımız
                </span>
                <span className="text-xl font-bold text-emerald-800">
                  {loading ? "..." : formatCurrency(stats?.totalReceivable ?? 0)}
                </span>
                <span className="text-[11px] text-emerald-600 block mt-1">
                  Müşteri açık hesapları
                </span>
              </div>

              <div className="p-4 rounded-xl bg-amber-50/40 border border-amber-200">
                <span className="text-xs font-semibold text-amber-700 block mb-1">
                  Toplam Borcumuz
                </span>
                <span className="text-xl font-bold text-amber-800">
                  {loading ? "..." : formatCurrency(stats?.totalPayable ?? 0)}
                </span>
                <span className="text-[11px] text-amber-600 block mt-1">
                  Tedarikçi borçları
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Modules Overview Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Link
          href="/yonetim/satislar"
          className="group bg-white p-5 rounded-2xl border border-slate-200 hover:border-slate-300 hover:shadow-md transition"
        >
          <div className="flex items-center gap-3 mb-2">
            <div className="w-9 h-9 rounded-xl bg-slate-100 group-hover:bg-slate-900 group-hover:text-white flex items-center justify-center text-slate-700 transition">
              <ShoppingCart className="w-4 h-4" />
            </div>
            <h3 className="font-bold text-slate-900 text-sm">Satışlar</h3>
          </div>
          <p className="text-xs text-slate-500">
            Cihaz satışı yapın, kâr hesaplayın ve peşin/vadeli tahsilatları yönetin.
          </p>
        </Link>

        <Link
          href="/yonetim/stoklar"
          className="group bg-white p-5 rounded-2xl border border-slate-200 hover:border-slate-300 hover:shadow-md transition"
        >
          <div className="flex items-center gap-3 mb-2">
            <div className="w-9 h-9 rounded-xl bg-slate-100 group-hover:bg-emerald-600 group-hover:text-white flex items-center justify-center text-slate-700 transition">
              <Boxes className="w-4 h-4" />
            </div>
            <h3 className="font-bold text-slate-900 text-sm">Fiziksel Stoklar</h3>
          </div>
          <p className="text-xs text-slate-500">
            IMEI bazında cihaz takibi ve yeni alış/stok girişleri.
          </p>
        </Link>

        <Link
          href="/yonetim/taksitler"
          className="group bg-white p-5 rounded-2xl border border-slate-200 hover:border-slate-300 hover:shadow-md transition"
        >
          <div className="flex items-center gap-3 mb-2">
            <div className="w-9 h-9 rounded-xl bg-slate-100 group-hover:bg-purple-600 group-hover:text-white flex items-center justify-center text-slate-700 transition">
              <CalendarDays className="w-4 h-4" />
            </div>
            <h3 className="font-bold text-slate-900 text-sm">Taksitler</h3>
          </div>
          <p className="text-xs text-slate-500">
            Vadeli satışların taksit planları ve tahsilat takipleri.
          </p>
        </Link>

        <Link
          href="/yonetim/cariler"
          className="group bg-white p-5 rounded-2xl border border-slate-200 hover:border-slate-300 hover:shadow-md transition"
        >
          <div className="flex items-center gap-3 mb-2">
            <div className="w-9 h-9 rounded-xl bg-slate-100 group-hover:bg-blue-600 group-hover:text-white flex items-center justify-center text-slate-700 transition">
              <Users className="w-4 h-4" />
            </div>
            <h3 className="font-bold text-slate-900 text-sm">Cari Hesaplar</h3>
          </div>
          <p className="text-xs text-slate-500">
            Müşteri alacakları, tedarikçi borçları ve hesap ekstreleri.
          </p>
        </Link>
      </div>
    </div>
  );
}
