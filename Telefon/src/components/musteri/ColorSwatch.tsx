"use client";

import React from "react";
import { Check } from "lucide-react";
import { getColorSwatchStyle } from "@/lib/colorUtils";
import { ColorAvailabilityDTO } from "@/types";

interface ColorSwatchProps {
  colorsWithStock?: ColorAvailabilityDTO[];
  colors?: string[]; // Fallback
  selectedColor?: string;
  onSelectColor: (color: string) => void;
}

export function ColorSwatch({
  colorsWithStock,
  colors,
  selectedColor,
  onSelectColor,
}: ColorSwatchProps) {
  // Normalize color list to ColorAvailabilityDTO[]
  const itemList: ColorAvailabilityDTO[] = colorsWithStock && colorsWithStock.length > 0
    ? colorsWithStock
    : colors && colors.length > 0
    ? colors.map((c) => ({ color: c, inStock: true }))
    : [];

  if (itemList.length === 0) return null;

  return (
    <div className="flex flex-wrap items-center gap-2 mt-1">
      {itemList.map((item) => {
        const colorName = item.color;
        const inStock = item.inStock;
        const style = getColorSwatchStyle(colorName);
        const isSelected = selectedColor?.toLowerCase() === colorName.toLowerCase();

        if (style) {
          return (
            <button
              key={colorName}
              type="button"
              onClick={() => onSelectColor(isSelected ? "" : colorName)}
              className={`relative group/swatch inline-flex items-center justify-center w-6 h-6 rounded-full transition-all duration-200 focus:outline-none shrink-0 ${
                isSelected
                  ? "ring-2 ring-emerald-500 dark:ring-emerald-400 ring-offset-2 dark:ring-offset-slate-900 scale-110 z-10"
                  : "hover:scale-110 opacity-90 hover:opacity-100"
              }`}
              style={{
                background: style.bg,
                border: style.border ? `1px solid ${style.border}` : "none",
              }}
            >
              {isSelected && (
                <Check
                  className={`w-3.5 h-3.5 ${
                    style.isDark ? "text-white" : "text-slate-900"
                  }`}
                />
              )}

              {/* Tooltip on desktop hover ONLY for this single swatch */}
              <span className="absolute -top-7 left-1/2 -translate-x-1/2 pointer-events-none opacity-0 group-hover/swatch:opacity-100 transition-opacity duration-150 text-[10px] font-semibold bg-slate-900 text-white px-2 py-0.5 rounded whitespace-nowrap shadow-md z-30 hidden sm:block">
                {colorName} {!inStock ? "(3 Gün)" : ""}
              </span>
            </button>
          );
        }

        // Unrecognized color fallback to text chip
        return (
          <button
            key={colorName}
            type="button"
            onClick={() => onSelectColor(isSelected ? "" : colorName)}
            className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition border shrink-0 ${
              isSelected
                ? "bg-emerald-600 text-white border-emerald-600 shadow-sm"
                : "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-200 dark:hover:bg-slate-700"
            }`}
          >
            {colorName}
          </button>
        );
      })}
    </div>
  );
}
