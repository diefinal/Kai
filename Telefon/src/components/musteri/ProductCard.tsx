"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import { MessageCircle, CheckCircle2, Clock3, Smartphone, Info, Scale, Check } from "lucide-react";
import { PublicProductDTO, ColorAvailabilityDTO } from "@/types";
import { formatCurrency, createProductSlug } from "@/lib/utils";
import { generateWhatsAppLink } from "@/lib/whatsapp";
import { ColorSwatch } from "./ColorSwatch";

interface ProductCardProps {
  product: PublicProductDTO;
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
  isCompared?: boolean;
  onToggleCompare?: (product: PublicProductDTO) => void;
}

export function ProductCard({
  product,
  onOpenSpecs,
  onOpenDetail,
  isCompared = false,
  onToggleCompare,
}: ProductCardProps) {
  const [imgError, setImgError] = useState(false);

  // Normalize color availability list
  const colorsWithStock: ColorAvailabilityDTO[] = useMemo(() => {
    if (product.colorsWithStock && product.colorsWithStock.length > 0) {
      return product.colorsWithStock;
    }
    if (product.stockColors && product.stockColors.length > 0) {
      return product.stockColors.map((c) => ({ color: c, inStock: true }));
    }
    if (product.color) {
      return [{ color: product.color, inStock: product.inStock }];
    }
    return [];
  }, [product]);

  // Determine initial default selected color (first in-stock color, or first defined color)
  const defaultColor = useMemo(() => {
    const firstInStock = colorsWithStock.find((c) => c.inStock);
    if (firstInStock) return firstInStock.color;
    return colorsWithStock[0]?.color || "";
  }, [colorsWithStock]);

  const [userSelectedColor, setUserSelectedColor] = useState<string | null>(null);

  // Active selected color
  const activeColor = userSelectedColor !== null ? userSelectedColor : defaultColor;

  // Determine if active color is currently in stock
  const activeColorObj = useMemo(() => {
    if (!activeColor) return null;
    return colorsWithStock.find(
      (c) => c.color.toLowerCase() === activeColor.toLowerCase()
    );
  }, [colorsWithStock, activeColor]);

  const isColorInStock = activeColorObj ? activeColorObj.inStock : product.inStock;

  // Dynamic Image resolution with fallback hierarchy:
  // 1. Color-specific image (if assigned to activeColor)
  // 2. Main PhoneModel imageUrl
  // 3. Placeholder Icon
  const displayImageUrl = useMemo(() => {
    if (activeColorObj && activeColorObj.imageUrl) {
      return activeColorObj.imageUrl;
    }

    if (activeColor && product.colorImages && typeof product.colorImages === "object") {
      const lower = activeColor.toLowerCase();
      const matchKey = Object.keys(product.colorImages).find(
        (k) => k.toLowerCase() === lower
      );
      if (matchKey && product.colorImages[matchKey]) {
        return product.colorImages[matchKey];
      }
    }

    return product.imageUrl;
  }, [activeColor, activeColorObj, product]);

  // Dynamic WhatsApp link generation
  const whatsappLink = generateWhatsAppLink({
    brand: product.brand,
    modelName: product.modelName,
    ram: product.ram,
    storage: product.storage,
    color: activeColor || undefined,
    inStock: isColorInStock,
  });

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 hover:shadow-lg transition-all duration-300 flex flex-col p-5 justify-between group h-full">
      <div>
        {/* Header: Brand & Dynamic Color-Aware Stock Badge */}
        <div className="flex items-center justify-between gap-2 mb-3">
          <span className="text-[11px] font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-widest">
            {product.brand}
          </span>

          {isColorInStock ? (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/60">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              Stokta Var
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800/60">
              <Clock3 className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
              3 Gün İçinde Teslim
            </span>
          )}
        </div>

        {/* Product Image */}
        <Link
          href={`/urun/${createProductSlug(product.brand, product.modelName)}?ram=${encodeURIComponent(product.ram)}&storage=${encodeURIComponent(product.storage)}&color=${encodeURIComponent(activeColor || "")}`}
          onClick={(e) => {
            if (onOpenDetail) {
              e.preventDefault();
              onOpenDetail(product, product.ram, product.storage, activeColor || undefined);
            }
          }}
          className="w-full h-44 sm:h-48 bg-slate-50 dark:bg-slate-800/50 rounded-xl flex items-center justify-center p-3 relative overflow-hidden border border-slate-100 dark:border-slate-800 mb-3.5 block group"
        >
          {displayImageUrl && !imgError ? (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img
              key={displayImageUrl}
              src={displayImageUrl}
              alt={`${product.brand} ${product.modelName} ${activeColor || ""}`}
              className="max-h-full max-w-full object-contain group-hover:scale-105 transition-transform duration-300 drop-shadow-sm"
              onError={() => setImgError(true)}
            />
          ) : (
            <div className="flex flex-col items-center justify-center text-slate-300 dark:text-slate-600">
              <Smartphone className="w-12 h-12 stroke-[1.5]" />
              <span className="text-[10px] text-slate-400 dark:text-slate-500 mt-1 font-medium">Görsel Yok</span>
            </div>
          )}
        </Link>

        {/* Title */}
        <Link
          href={`/urun/${createProductSlug(product.brand, product.modelName)}?ram=${encodeURIComponent(product.ram)}&storage=${encodeURIComponent(product.storage)}&color=${encodeURIComponent(activeColor || "")}`}
          onClick={(e) => {
            if (onOpenDetail) {
              e.preventDefault();
              onOpenDetail(product, product.ram, product.storage, activeColor || undefined);
            }
          }}
          className="block"
        >
          <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors leading-snug line-clamp-1">
            {product.modelName}
          </h3>
        </Link>

        {/* Specs Pills */}
        <div className="mt-2 flex flex-wrap items-center gap-1.5 text-xs text-slate-600 dark:text-slate-300 font-medium">
          {product.ram && (
            <span className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 font-semibold text-slate-700 dark:text-slate-300">
              {product.ram} RAM
            </span>
          )}
          <span className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 font-semibold text-slate-700 dark:text-slate-300">
            {product.storage}
          </span>
        </div>

        {/* Color Swatch / Chips */}
        {colorsWithStock.length > 0 && (
          <div className="mt-3">
            <ColorSwatch
              colorsWithStock={colorsWithStock}
              selectedColor={activeColor}
              onSelectColor={(col) => setUserSelectedColor(col)}
            />
            {activeColor && (
              <div className="mt-2 text-xs font-medium text-slate-500 dark:text-slate-400">
                Seçili Renk:{" "}
                <span className="font-semibold text-slate-800 dark:text-slate-200">
                  {activeColor}
                </span>
              </div>
            )}
          </div>
        )}

        {/* Auxiliary Feature Row: Specs Modal & Compare Toggle */}
        <div className="mt-3.5 pt-2.5 border-t border-slate-100 dark:border-slate-800/60 flex items-center justify-between gap-2">
          {onOpenSpecs && (
            <button
              onClick={() =>
                onOpenSpecs(
                  product,
                  activeColor,
                  displayImageUrl,
                  isColorInStock,
                  whatsappLink
                )
              }
              className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-600 dark:text-slate-300 hover:text-emerald-600 dark:hover:text-emerald-400 transition"
            >
              <Info className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              <span>Teknik Özellikler</span>
            </button>
          )}

          {onToggleCompare && (
            <button
              onClick={() => onToggleCompare(product)}
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold transition border ${
                isCompared
                  ? "bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-300 dark:border-emerald-700"
                  : "bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600"
              }`}
            >
              {isCompared ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 stroke-[2.5]" />
                  <span>Seçildi</span>
                </>
              ) : (
                <>
                  <Scale className="w-3.5 h-3.5 text-slate-400" />
                  <span>Karşılaştır</span>
                </>
              )}
            </button>
          )}
        </div>

        {product.description && (
          <p className="mt-2.5 text-xs text-slate-500 dark:text-slate-400 line-clamp-2 leading-relaxed">
            {product.description}
          </p>
        )}
      </div>

      {/* Footer Area: Price & Dynamic WhatsApp CTA */}
      <div className="mt-5 pt-3.5 border-t border-slate-100 dark:border-slate-800/80">
        <div className="mb-3 flex items-baseline justify-between">
          <span className="text-[11px] font-medium text-slate-400 dark:text-slate-500">Satış Fiyatı</span>
          <span className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
            {formatCurrency(product.basePrice)}
          </span>
        </div>

        <a
          href={whatsappLink}
          target="_blank"
          rel="noopener noreferrer"
          className={`w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-xs sm:text-sm font-bold text-white transition-all shadow-sm ${
            isColorInStock
              ? "bg-emerald-600 hover:bg-emerald-500 active:scale-[0.98] shadow-emerald-600/20"
              : "bg-slate-800 hover:bg-slate-700 dark:bg-slate-800 dark:hover:bg-slate-700 active:scale-[0.98]"
          }`}
        >
          <MessageCircle className="w-4 h-4 shrink-0" />
          <span>
            {isColorInStock ? "WhatsApp'tan Bilgi Al" : "3 Günde Teslim Talebi"}
          </span>
        </a>
      </div>
    </div>
  );
}
