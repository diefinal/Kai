"use client";

import React, { useState, useEffect, useCallback } from "react";
import { ReportDateFilter } from "@/components/reports/ReportDateFilter";
import { DateFilterPreset } from "@/lib/reports/date-utils";
import { OverviewTab } from "@/components/reports/OverviewTab";
import { SalesTab } from "@/components/reports/SalesTab";
import { ProfitTab } from "@/components/reports/ProfitTab";
import StockTab from "@/components/reports/StockTab";
import CariTaksitTab from "@/components/reports/CariTaksitTab";

type ReportTab = "overview" | "sales" | "profit" | "stock" | "cariler-taksit";

type OverviewDataType = React.ComponentProps<typeof OverviewTab>["data"];
type SalesDataType = React.ComponentProps<typeof SalesTab>["data"];
type ProfitDataType = React.ComponentProps<typeof ProfitTab>["data"];
type StockDataType = React.ComponentProps<typeof StockTab>["data"];
type CariTaksitDataType = React.ComponentProps<typeof CariTaksitTab>["data"];

export default function RaporlarPage() {
  const [activeTab, setActiveTab] = useState<ReportTab>("overview");

  // Date Filter State (default: "THIS_MONTH")
  const [preset, setPreset] = useState<DateFilterPreset>("THIS_MONTH");
  const [customStartDate, setCustomStartDate] = useState<string>("");
  const [customEndDate, setCustomEndDate] = useState<string>("");

  // Filters for tabs
  const [brandFilter, setBrandFilter] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [page, setPage] = useState<number>(1);

  // Tab Data States
  const [overviewData, setOverviewData] = useState<OverviewDataType>(null);
  const [salesData, setSalesData] = useState<SalesDataType>(null);
  const [profitData, setProfitData] = useState<ProfitDataType>(null);
  const [stockData, setStockData] = useState<StockDataType>(null);
  const [cariTaksitData, setCariTaksitData] = useState<CariTaksitDataType>(null);

  const [loading, setLoading] = useState<boolean>(true);

  // Build query string
  const buildQueryParams = useCallback(
    (extraParams: Record<string, string | number> = {}) => {
      const params = new URLSearchParams();
      params.set("preset", preset);
      if (preset === "CUSTOM") {
        if (customStartDate) params.set("startDate", customStartDate);
        if (customEndDate) params.set("endDate", customEndDate);
      }
      if (brandFilter) params.set("brand", brandFilter);
      if (searchQuery) params.set("search", searchQuery);

      Object.entries(extraParams).forEach(([key, val]) => {
        if (val !== undefined && val !== "") {
          params.set(key, String(val));
        }
      });
      return params.toString();
    },
    [preset, customStartDate, customEndDate, brandFilter, searchQuery]
  );

  // Fetch data for active tab
  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      if (activeTab === "overview") {
        const res = await fetch(`/api/admin/reports/overview?${buildQueryParams()}`);
        if (res.ok) {
          const json = await res.json();
          setOverviewData(json.data as OverviewDataType);
        }
      } else if (activeTab === "sales") {
        const res = await fetch(`/api/admin/reports/sales?${buildQueryParams({ page })}`);
        if (res.ok) {
          const json = await res.json();
          setSalesData(json.data as SalesDataType);
        }
      } else if (activeTab === "profit") {
        const res = await fetch(`/api/admin/reports/profit?${buildQueryParams()}`);
        if (res.ok) {
          const json = await res.json();
          setProfitData(json.data as ProfitDataType);
        }
      } else if (activeTab === "stock") {
        const res = await fetch(`/api/admin/reports/stock?${buildQueryParams()}`);
        if (res.ok) {
          const json = await res.json();
          setStockData(json.data as StockDataType);
        }
      } else if (activeTab === "cariler-taksit") {
        const res = await fetch(`/api/admin/reports/cariler-taksit?${buildQueryParams()}`);
        if (res.ok) {
          const json = await res.json();
          setCariTaksitData(json.data as CariTaksitDataType);
        }
      }
    } catch (err) {
      console.error("Rapor verisi çekilirken hata oluştu:", err);
    } finally {
      setLoading(false);
    }
  }, [activeTab, buildQueryParams, page]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Excel Export Handler
  const handleExport = (exportTab: ReportTab = activeTab) => {
    const q = buildQueryParams({ tab: exportTab });
    window.open(`/api/admin/reports/export?${q}`, "_blank");
  };

  const tabs: { id: ReportTab; label: string }[] = [
    { id: "overview", label: "Genel Bakış" },
    { id: "sales", label: "Satış" },
    { id: "profit", label: "Kâr" },
    { id: "stock", label: "Stok" },
    { id: "cariler-taksit", label: "Cari & Taksit" },
  ];

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white tracking-tight">
          Raporlar
        </h1>
        <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">
          Satış, kârlılık, stok ve finansal durumunuzu analiz edin.
        </p>
      </div>

      {/* Date Filter Bar */}
      <ReportDateFilter
        preset={preset}
        onPresetChange={(newPreset: DateFilterPreset) => {
          setPreset(newPreset);
          setPage(1);
        }}
        startDate={customStartDate}
        onStartDateChange={(start: string) => {
          setCustomStartDate(start);
          setPage(1);
        }}
        endDate={customEndDate}
        onEndDateChange={(end: string) => {
          setCustomEndDate(end);
          setPage(1);
        }}
      />

      {/* Navigation Tabs */}
      <div className="border-b border-gray-200 dark:border-gray-700">
        <nav className="-mb-px flex space-x-6 overflow-x-auto" aria-label="Tabs">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => {
                setActiveTab(tab.id);
                setPage(1);
              }}
              className={`whitespace-nowrap py-3 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === tab.id
                  ? "border-emerald-600 text-emerald-600 dark:border-emerald-400 dark:text-emerald-400 font-semibold"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-200"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="mt-4">
        {activeTab === "overview" && (
          <OverviewTab
            data={loading ? null : overviewData}
          />
        )}

        {activeTab === "sales" && (
          <SalesTab
            data={loading ? null : salesData}
            brand={brandFilter}
            onBrandChange={(b: string) => {
              setBrandFilter(b);
              setPage(1);
            }}
            search={searchQuery}
            onSearchChange={(q: string) => {
              setSearchQuery(q);
              setPage(1);
            }}
            page={page}
            onPageChange={(p: number) => setPage(p)}
            onExportExcel={() => handleExport("sales")}
          />
        )}

        {activeTab === "profit" && (
          <ProfitTab
            data={loading ? null : profitData}
            brand={brandFilter}
            onBrandChange={(b: string) => setBrandFilter(b)}
            search={searchQuery}
            onSearchChange={(q: string) => setSearchQuery(q)}
            onExportExcel={() => handleExport("profit")}
          />
        )}

        {activeTab === "stock" && (
          <StockTab
            data={loading ? null : stockData}
            loading={loading}
            onExport={() => handleExport("stock")}
          />
        )}

        {activeTab === "cariler-taksit" && (
          <CariTaksitTab
            data={loading ? null : cariTaksitData}
            loading={loading}
            onExport={() => handleExport("cariler-taksit")}
          />
        )}
      </div>
    </div>
  );
}
