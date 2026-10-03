"use client";

import React from "react";
import { Smartphone } from "lucide-react";

interface BrandSelectorProps {
  brands: string[];
  selectedBrand: string;
  onSelectBrand: (brand: string) => void;
}

export function BrandSelector({ brands, selectedBrand, onSelectBrand }: BrandSelectorProps) {
  if (!brands || brands.length <= 1) return null;

  return (
    <div className="space-y-2.5">
      <div className="flex items-center justify-between">
        <h2 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <Smartphone className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          <span>Markalara Göz At</span>
        </h2>
        {selectedBrand !== "ALL" && (
          <button
            onClick={() => onSelectBrand("ALL")}
            className="text-xs text-emerald-600 dark:text-emerald-400 hover:underline font-semibold"
          >
            Sıfırla
          </button>
        )}
      </div>

      <div className="flex items-center gap-2 overflow-x-auto pb-2 pt-0.5 no-scrollbar -mx-4 px-4 sm:mx-0 sm:px-0">
        {brands.map((brand) => {
          const isSelected = selectedBrand === brand;
          return (
            <button
              key={brand}
              onClick={() => onSelectBrand(brand)}
              className={`px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold whitespace-nowrap transition-all duration-200 border shrink-0 flex items-center gap-1.5 ${
                isSelected
                  ? "bg-slate-900 text-white dark:bg-emerald-600 dark:text-white border-slate-900 dark:border-emerald-600 shadow-md scale-[1.02]"
                  : "bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 border-slate-200 dark:border-slate-700"
              }`}
            >
              <span>{brand === "ALL" ? "Tüm Markalar" : brand}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
