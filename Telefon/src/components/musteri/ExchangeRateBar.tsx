"use client";

import React, { useEffect, useState } from "react";
import { Landmark, Info } from "lucide-react";

interface RateItem {
  buying: number;
  selling: number;
}

interface ExchangeRateData {
  success: boolean;
  source: string;
  date: string;
  lastUpdated: string;
  isFallback: boolean;
  rates: {
    USD: RateItem;
    EUR: RateItem;
  };
}

export function ExchangeRateBar() {
  const [data, setData] = useState<ExchangeRateData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadRates() {
      try {
        setLoading(true);
        const res = await fetch("/api/public/exchange-rates");
        const json = await res.json();
        if (json && json.rates) {
          setData(json);
        }
      } catch (err) {
        console.error("Kur bandı verisi çekilemedi:", err);
      } finally {
        setLoading(false);
      }
    }
    loadRates();
  }, []);

  if (loading) {
    return (
      <div className="w-full bg-slate-100/70 dark:bg-slate-900/70 border-b border-slate-200/80 dark:border-slate-800/80 py-1.5 px-4 animate-pulse flex items-center justify-between text-xs text-slate-400">
        <span>TCMB Döviz Kurları Yükleniyor...</span>
      </div>
    );
  }

  if (!data || !data.rates) return null;

  return (
    <div className="w-full bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border-b border-slate-200/80 dark:border-slate-800/80 py-1.5 px-3 sm:px-6 transition-colors">
      <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-2 text-xs">
        {/* Source & Date Badge */}
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1 font-bold text-slate-900 dark:text-white bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-md border border-slate-200/80 dark:border-slate-700">
            <Landmark className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
            <span>TCMB Kurları</span>
          </span>
          <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 hidden sm:inline">
            Tarih: <strong>{data.date}</strong>
          </span>
        </div>

        {/* Currency Rates Ticker */}
        <div className="flex items-center gap-3 sm:gap-6 font-semibold">
          {/* USD Rate */}
          <div className="flex items-center gap-1.5">
            <span className="font-extrabold text-slate-900 dark:text-white bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 px-1.5 py-0.5 rounded text-[11px]">
              USD
            </span>
            <div className="flex items-center gap-1 text-[11px] sm:text-xs">
              <span className="text-slate-500 dark:text-slate-400">Alış:</span>
              <strong className="text-slate-900 dark:text-slate-100">
                {data.rates.USD.buying.toFixed(2)} ₺
              </strong>
              <span className="text-slate-300 dark:text-slate-700 mx-0.5">|</span>
              <span className="text-slate-500 dark:text-slate-400">Satış:</span>
              <strong className="text-slate-900 dark:text-slate-100">
                {data.rates.USD.selling.toFixed(2)} ₺
              </strong>
            </div>
          </div>

          {/* EUR Rate */}
          <div className="flex items-center gap-1.5">
            <span className="font-extrabold text-slate-900 dark:text-white bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 px-1.5 py-0.5 rounded text-[11px]">
              EUR
            </span>
            <div className="flex items-center gap-1 text-[11px] sm:text-xs">
              <span className="text-slate-500 dark:text-slate-400">Alış:</span>
              <strong className="text-slate-900 dark:text-slate-100">
                {data.rates.EUR.buying.toFixed(2)} ₺
              </strong>
              <span className="text-slate-300 dark:text-slate-700 mx-0.5">|</span>
              <span className="text-slate-500 dark:text-slate-400">Satış:</span>
              <strong className="text-slate-900 dark:text-slate-100">
                {data.rates.EUR.selling.toFixed(2)} ₺
              </strong>
            </div>
          </div>
        </div>

        {/* Informational Disclaimer */}
        <div className="hidden md:flex items-center gap-1 text-[10px] text-slate-400 dark:text-slate-500 italic">
          <Info className="w-3 h-3" />
          <span>Bilgi amaçlıdır.</span>
        </div>
      </div>
    </div>
  );
}
