"use client";

import React, { useEffect } from "react";
import { X, MessageCircle, CheckCircle2, Clock3, Smartphone, ExternalLink, Cpu, Layers } from "lucide-react";
import { PublicProductDTO } from "@/types";
import { formatCurrency } from "@/lib/utils";
import { getProductSpecs } from "@/data/productSpecs";

interface ProductSpecsModalProps {
  isOpen: boolean;
  onClose: () => void;
  product: PublicProductDTO | null;
  selectedColor: string | null;
  selectedColorImage: string | null;
  isColorInStock: boolean;
  whatsappLink: string;
}

export function ProductSpecsModal({
  isOpen,
  onClose,
  product,
  selectedColor,
  selectedColorImage,
  isColorInStock,
  whatsappLink,
}: ProductSpecsModalProps) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    if (isOpen) {
      document.body.style.overflow = "hidden";
      window.addEventListener("keydown", handleKeyDown);
    }
    return () => {
      document.body.style.overflow = "unset";
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen || !product) return null;

  const specs = getProductSpecs(product.modelName, product.ram, product.storage, product.specs);
  const displayImage = selectedColorImage || product.imageUrl;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 w-full max-w-2xl max-h-[90vh] rounded-3xl shadow-2xl flex flex-col overflow-hidden text-slate-900 dark:text-white"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Header */}
        <div className="p-4 sm:p-5 border-b border-slate-100 dark:border-slate-800 flex items-start justify-between gap-3 bg-slate-50/50 dark:bg-slate-900/50">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[11px] font-extrabold uppercase tracking-widest text-slate-400 dark:text-slate-500">
                {product.brand}
              </span>
              {isColorInStock ? (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
                  <CheckCircle2 className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                  Stokta Var
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800">
                  <Clock3 className="w-3 h-3 text-amber-600 dark:text-amber-400" />
                  3 Gün İçinde Teslim
                </span>
              )}
            </div>
            <h2 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white leading-tight">
              {product.brand} {product.modelName}
            </h2>
            <div className="flex flex-wrap items-center gap-2 mt-1.5 text-xs text-slate-500 dark:text-slate-400">
              {product.ram && (
                <span className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 font-semibold text-slate-700 dark:text-slate-300">
                  {product.ram} RAM
                </span>
              )}
              <span className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 font-semibold text-slate-700 dark:text-slate-300">
                {product.storage}
              </span>
              {selectedColor && (
                <span className="px-2 py-0.5 rounded bg-emerald-50 dark:bg-emerald-950/40 font-semibold text-emerald-700 dark:text-emerald-300 border border-emerald-200/50 dark:border-emerald-800/40">
                  Seçili Renk: {selectedColor}
                </span>
              )}
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
            aria-label="Kapat"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Scrollable Content */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-6 flex-1">
          {/* Product Overview Card */}
          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4 p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800">
            <div className="w-28 h-28 sm:w-32 sm:h-32 bg-white dark:bg-slate-800 rounded-xl p-2 flex items-center justify-center border border-slate-200 dark:border-slate-700 shrink-0">
              {displayImage ? (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img
                  src={displayImage}
                  alt={`${product.brand} ${product.modelName}`}
                  className="max-h-full max-w-full object-contain drop-shadow-sm"
                />
              ) : (
                <Smartphone className="w-10 h-10 text-slate-400" />
              )}
            </div>

            <div className="flex-1 text-center sm:text-left space-y-2">
              <div className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wide">
                TeknoReha Satış Fiyatı
              </div>
              <div className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
                {formatCurrency(product.basePrice)}
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                Tüm teknik özellikler aşağıda doğrulanmış olarak sunulmaktadır. WhatsApp üzerinden anında sipariş verebilir veya bilgi alabilirsiniz.
              </p>
            </div>
          </div>

          {/* Categorized Specs List */}
          {specs ? (
            <div className="space-y-5">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
                <h3 className="text-sm font-extrabold text-slate-900 dark:text-white flex items-center gap-1.5 uppercase tracking-wider">
                  <Cpu className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  Teknik Özellik Detayları
                </h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {specs.categories.map((cat, idx) => (
                  <div
                    key={idx}
                    className="p-4 rounded-2xl bg-white dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 shadow-sm space-y-2.5"
                  >
                    <h4 className="text-xs font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-2 border-b border-slate-100 dark:border-slate-700/60 pb-2">
                      <span className="text-base">{cat.icon}</span>
                      <span>{cat.title}</span>
                    </h4>

                    <dl className="space-y-2 text-xs">
                      {cat.items.map((item, itemIdx) => (
                        <div key={itemIdx} className="flex items-baseline justify-between gap-2">
                          <dt className="text-slate-500 dark:text-slate-400 font-medium shrink-0">
                            {item.label}
                          </dt>
                          <dd className="font-semibold text-slate-900 dark:text-slate-100 text-right">
                            {item.value}
                          </dd>
                        </div>
                      ))}
                    </dl>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="p-8 text-center bg-slate-50 dark:bg-slate-800/30 rounded-2xl border border-slate-200/80 dark:border-slate-800 space-y-2">
              <Layers className="w-8 h-8 text-slate-400 mx-auto" />
              <p className="text-xs sm:text-sm font-semibold text-slate-600 dark:text-slate-300">
                Teknik özellik bilgisi henüz bulunmuyor
              </p>
              <p className="text-xs text-slate-400 dark:text-slate-500">
                Bu cihaz için doğrulanmış harici teknik veri henüz sistemimize tanımlanmamıştır. Detaylı bilgi için WhatsApp&apos;tan iletişime geçebilirsiniz.
              </p>
            </div>
          )}

          {/* Footer source note */}
          {specs && (
            <div className="pt-2 flex items-center justify-between text-[11px] text-slate-400 dark:text-slate-500 border-t border-slate-100 dark:border-slate-800">
              <span className="flex items-center gap-1">
                <ExternalLink className="w-3 h-3 text-slate-400" />
                Teknik özellik kaynağı: <strong className="font-semibold text-slate-600 dark:text-slate-400">{specs.source}</strong>
              </span>
              <span>Son güncelleme: {specs.lastUpdated}</span>
            </div>
          )}
        </div>

        {/* Bottom Action Footer */}
        <div className="p-4 bg-slate-50/80 dark:bg-slate-900/80 border-t border-slate-100 dark:border-slate-800">
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
    </div>
  );
}
