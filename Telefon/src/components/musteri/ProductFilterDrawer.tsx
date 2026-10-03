"use client";

import React, { useState } from "react";
import { SlidersHorizontal, X, RotateCcw, Check } from "lucide-react";

export interface FilterState {
  brand: string;
  ram: string;
  storage: string;
  minPrice: string;
  maxPrice: string;
  stockStatus: "ALL" | "IN_STOCK" | "THREE_DAY";
  sortBy: "RECOMMENDED" | "NEWEST" | "PRICE_ASC" | "PRICE_DESC" | "STOCK_FIRST";
}

interface ProductFilterDrawerProps {
  filters: FilterState;
  availableBrands: string[];
  availableRams: string[];
  availableStorages: string[];
  activeFilterCount: number;
  onChangeFilter: <K extends keyof FilterState>(key: K, value: FilterState[K]) => void;
  onResetFilters: () => void;
}

export function ProductFilterDrawer({
  filters,
  availableBrands,
  availableRams,
  availableStorages,
  activeFilterCount,
  onChangeFilter,
  onResetFilters,
}: ProductFilterDrawerProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      {/* Desktop Filter Bar & Mobile Filter Trigger Button */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => setIsOpen(true)}
          className={`px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 border transition ${
            activeFilterCount > 0
              ? "bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800"
              : "bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700"
          }`}
        >
          <SlidersHorizontal className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          <span>Filtrele</span>
          {activeFilterCount > 0 && (
            <span className="w-5 h-5 rounded-full bg-emerald-600 text-white text-[11px] font-bold flex items-center justify-center">
              {activeFilterCount}
            </span>
          )}
        </button>

        {activeFilterCount > 0 && (
          <button
            onClick={onResetFilters}
            className="px-3 py-2 rounded-xl text-xs font-semibold text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 flex items-center gap-1.5 transition"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Temizle</span>
          </button>
        )}
      </div>

      {/* Drawer Overlay & Bottom Sheet Modal */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-900/60 backdrop-blur-sm transition-opacity">
          <div
            className="w-full sm:max-w-lg bg-white dark:bg-slate-900 rounded-t-3xl sm:rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 max-h-[85vh] flex flex-col overflow-hidden animate-in slide-in-from-bottom duration-300"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="p-4 sm:p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <SlidersHorizontal className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
                  Ürün Filtreleri
                </h3>
                {activeFilterCount > 0 && (
                  <span className="px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-300 text-xs font-bold">
                    {activeFilterCount} Aktif
                  </span>
                )}
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Filter Content */}
            <div className="p-5 overflow-y-auto space-y-6 flex-1">
              {/* Stok Durumu */}
              <div>
                <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block mb-2.5">
                  Stok Durumu
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: "ALL", label: "Tümü" },
                    { id: "IN_STOCK", label: "Stokta Var" },
                    { id: "THREE_DAY", label: "3 Günde Teslim" },
                  ].map((st) => (
                    <button
                      key={st.id}
                      onClick={() => onChangeFilter("stockStatus", st.id as FilterState["stockStatus"])}
                      className={`py-2 px-2.5 rounded-xl text-xs font-bold transition border ${
                        filters.stockStatus === st.id
                          ? "bg-emerald-600 text-white border-emerald-600"
                          : "bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700"
                      }`}
                    >
                      {st.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Marka */}
              {availableBrands.length > 1 && (
                <div>
                  <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block mb-2.5">
                    Marka
                  </label>
                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={() => onChangeFilter("brand", "ALL")}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition ${
                        filters.brand === "ALL"
                          ? "bg-slate-900 dark:bg-white text-white dark:text-slate-900 border-slate-900 dark:border-white"
                          : "bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700"
                      }`}
                    >
                      Tümü
                    </button>
                    {availableBrands.filter(b => b !== "ALL").map((b) => (
                      <button
                        key={b}
                        onClick={() => onChangeFilter("brand", b)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition ${
                          filters.brand === b
                            ? "bg-slate-900 dark:bg-white text-white dark:text-slate-900 border-slate-900 dark:border-white"
                            : "bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700"
                        }`}
                      >
                        {b}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* RAM */}
              {availableRams.length > 0 && (
                <div>
                  <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block mb-2.5">
                    RAM Bellek
                  </label>
                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={() => onChangeFilter("ram", "")}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition ${
                        !filters.ram
                          ? "bg-emerald-600 text-white border-emerald-600"
                          : "bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700"
                      }`}
                    >
                      Tümü
                    </button>
                    {availableRams.map((ramVal) => (
                      <button
                        key={ramVal}
                        onClick={() => onChangeFilter("ram", ramVal)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition ${
                          filters.ram === ramVal
                            ? "bg-emerald-600 text-white border-emerald-600"
                            : "bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700"
                        }`}
                      >
                        {ramVal}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Hafıza (Storage) */}
              {availableStorages.length > 0 && (
                <div>
                  <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block mb-2.5">
                    Dahili Hafıza
                  </label>
                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={() => onChangeFilter("storage", "")}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition ${
                        !filters.storage
                          ? "bg-emerald-600 text-white border-emerald-600"
                          : "bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700"
                      }`}
                    >
                      Tümü
                    </button>
                    {availableStorages.map((stVal) => (
                      <button
                        key={stVal}
                        onClick={() => onChangeFilter("storage", stVal)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition ${
                          filters.storage === stVal
                            ? "bg-emerald-600 text-white border-emerald-600"
                            : "bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700"
                        }`}
                      >
                        {stVal}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Fiyat Aralığı */}
              <div>
                <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block mb-2.5">
                  Fiyat Aralığı (₺)
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <span className="text-[11px] text-slate-400 block mb-1">En Az</span>
                    <input
                      type="number"
                      placeholder="Min TL"
                      value={filters.minPrice}
                      onChange={(e) => onChangeFilter("minPrice", e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                  <div>
                    <span className="text-[11px] text-slate-400 block mb-1">En Çok</span>
                    <input
                      type="number"
                      placeholder="Max TL"
                      value={filters.maxPrice}
                      onChange={(e) => onChangeFilter("maxPrice", e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Action Footer */}
            <div className="p-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-3 bg-slate-50 dark:bg-slate-900/50">
              <button
                onClick={() => {
                  onResetFilters();
                }}
                className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800 transition"
              >
                Sıfırla
              </button>

              <button
                onClick={() => setIsOpen(false)}
                className="flex-1 py-2.5 px-5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-md transition"
              >
                <Check className="w-4 h-4" />
                <span>Sonuçları Göster</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
