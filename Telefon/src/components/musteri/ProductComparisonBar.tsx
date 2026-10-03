"use client";

import React from "react";
import { Scale, X, ArrowRight } from "lucide-react";
import { PublicProductDTO } from "@/types";

interface ProductComparisonBarProps {
  comparedProducts: PublicProductDTO[];
  onRemoveProduct: (productId: string) => void;
  onClearAll: () => void;
  onOpenComparisonModal: () => void;
}

export function ProductComparisonBar({
  comparedProducts,
  onRemoveProduct,
  onClearAll,
  onOpenComparisonModal,
}: ProductComparisonBarProps) {
  if (comparedProducts.length === 0) return null;

  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-40 w-[95%] max-w-2xl bg-white/95 dark:bg-slate-900/95 border border-slate-200 dark:border-slate-800 shadow-2xl rounded-2xl p-3 sm:p-4 backdrop-blur-md animate-in slide-in-from-bottom-5 duration-200 text-slate-900 dark:text-white">
      <div className="flex items-center justify-between gap-3">
        {/* Left: Info & Chips */}
        <div className="flex items-center gap-2 overflow-hidden flex-1">
          <div className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 shrink-0">
            <Scale className="w-4 h-4 sm:w-5 sm:h-5" />
          </div>

          <div className="min-w-0">
            <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
              Karşılaştırma ({comparedProducts.length}/3)
            </div>

            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
              {comparedProducts.map((p) => (
                <span
                  key={p.id}
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-xs font-medium text-slate-700 dark:text-slate-200 shrink-0 border border-slate-200/60 dark:border-slate-700/60"
                >
                  <span className="truncate max-w-[90px] sm:max-w-[130px]">
                    {p.modelName}
                  </span>
                  <button
                    onClick={() => onRemoveProduct(p.id)}
                    className="p-0.5 text-slate-400 hover:text-rose-500 rounded transition"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={onClearAll}
            className="px-2.5 py-2 text-xs font-semibold text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 transition"
          >
            Temizle
          </button>

          <button
            onClick={onOpenComparisonModal}
            disabled={comparedProducts.length < 2}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-white transition shadow-sm ${
              comparedProducts.length >= 2
                ? "bg-emerald-600 hover:bg-emerald-500 active:scale-[0.97]"
                : "bg-slate-300 dark:bg-slate-800 text-slate-500 dark:text-slate-500 cursor-not-allowed"
            }`}
          >
            <span>Karşılaştır</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
