"use client";

import React from "react";
import { Sparkles, ChevronRight } from "lucide-react";
import { PublicProductDTO } from "@/types";
import { ProductCard } from "./ProductCard";

interface FeaturedProductsSectionProps {
  products: PublicProductDTO[];
  enabled?: boolean;
  onScrollToAll?: () => void;
  onOpenSpecs?: (
    product: PublicProductDTO,
    color: string | null,
    colorImage: string | null,
    inStock: boolean,
    whatsappLink: string
  ) => void;
  onOpenDetail?: (
    product: PublicProductDTO,
    ram?: string,
    storage?: string,
    color?: string
  ) => void;
  comparedProducts?: PublicProductDTO[];
  onToggleCompare?: (product: PublicProductDTO) => void;
}

export function FeaturedProductsSection({
  products,
  enabled = true,
  onScrollToAll,
  onOpenSpecs,
  onOpenDetail,
  comparedProducts = [],
  onToggleCompare,
}: FeaturedProductsSectionProps) {
  // If feature is disabled by admin OR no featured products are selected, do NOT render the section
  if (enabled === false || !products || products.length === 0) {
    return null;
  }

  return (
    <section className="space-y-3.5 pt-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-emerald-100 dark:bg-emerald-950/70 text-emerald-600 dark:text-emerald-400">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-base sm:text-lg font-extrabold text-slate-900 dark:text-white leading-none">
              Öne Çıkanlar
            </h2>
            <p className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Hemen teslim stoktaki modeller
            </p>
          </div>
        </div>

        {onScrollToAll && (
          <button
            onClick={onScrollToAll}
            className="text-xs font-bold text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 flex items-center gap-0.5 transition"
          >
            <span>Tümünü Gör</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Horizontal Carousel */}
      <div className="flex gap-4 overflow-x-auto pb-4 pt-1 custom-scrollbar snap-x snap-mandatory -mx-4 px-4 sm:mx-0 sm:px-0">
        {products.map((prod) => {
          const isCompared = comparedProducts.some((p) => p.id === prod.id);
          return (
            <div
              key={`featured-${prod.id}-${prod.ram}-${prod.storage}`}
              className="w-[280px] sm:w-[300px] shrink-0 snap-start"
            >
              <ProductCard
                product={prod}
                onOpenSpecs={onOpenSpecs}
                onOpenDetail={onOpenDetail}
                isCompared={isCompared}
                onToggleCompare={onToggleCompare}
              />
            </div>
          );
        })}
      </div>
    </section>
  );
}
