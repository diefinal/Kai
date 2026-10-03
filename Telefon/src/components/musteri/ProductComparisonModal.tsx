"use client";

import React, { useEffect } from "react";
import { X, Scale, CheckCircle2, Clock3, Smartphone, MessageCircle, AlertCircle } from "lucide-react";
import { PublicProductDTO } from "@/types";
import { formatCurrency } from "@/lib/utils";
import { getProductSpecs } from "@/data/productSpecs";
import { generateWhatsAppLink } from "@/lib/whatsapp";

interface ProductComparisonModalProps {
  isOpen: boolean;
  onClose: () => void;
  comparedProducts: PublicProductDTO[];
}

export function ProductComparisonModal({
  isOpen,
  onClose,
  comparedProducts,
}: ProductComparisonModalProps) {
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

  if (!isOpen || comparedProducts.length < 2) return null;

  // Resolve specs for each product with variant RAM & Storage override
  const productSpecsList = comparedProducts.map((p) => ({
    product: p,
    specs: getProductSpecs(p.modelName, p.ram, p.storage, p.specs),
  }));

  // Define standardized categories to render
  const categoryHeaders = [
    { key: "Ekran", title: "📱 Ekran" },
    { key: "Performans", title: "⚡ Performans" },
    { key: "Kamera", title: "📷 Kamera" },
    { key: "Batarya & Şarj", title: "🔋 Batarya" },
    { key: "Bağlantılar", title: "📡 Bağlantılar" },
    { key: "Tasarım & Dayanıklılık", title: "📐 Tasarım" },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-950/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 w-full max-w-5xl max-h-[92vh] rounded-3xl shadow-2xl flex flex-col overflow-hidden text-slate-900 dark:text-white"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Top Bar */}
        <div className="p-4 sm:p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between gap-3 bg-slate-50/50 dark:bg-slate-900/50">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400">
              <Scale className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
                Cihaz Karşılaştırması
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Seçilen {comparedProducts.length} modelin fiyat, stok ve teknik özellik karşılaştırması
              </p>
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

        {/* Scrollable Matrix Table */}
        <div className="p-4 sm:p-6 overflow-x-auto overflow-y-auto flex-1">
          <table className="w-full min-w-[640px] border-collapse text-xs sm:text-sm">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800">
                <th className="py-3 px-4 text-left font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider text-[11px] w-1/4">
                  Özellik / Detay
                </th>
                {comparedProducts.map((p) => (
                  <th key={p.id} className="py-3 px-4 text-center w-1/3">
                    <div className="flex flex-col items-center space-y-2">
                      <div className="w-20 h-20 bg-slate-50 dark:bg-slate-800 rounded-xl p-2 flex items-center justify-center border border-slate-100 dark:border-slate-700">
                        {p.imageUrl ? (
                          /* eslint-disable-next-line @next/next/no-img-element */
                          <img
                            src={p.imageUrl}
                            alt={p.modelName}
                            className="max-h-full max-w-full object-contain drop-shadow-sm"
                          />
                        ) : (
                          <Smartphone className="w-8 h-8 text-slate-400" />
                        )}
                      </div>
                      <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                        {p.brand}
                      </span>
                      <span className="font-extrabold text-sm text-slate-900 dark:text-white leading-tight">
                        {p.modelName}
                      </span>
                    </div>
                  </th>
                ))}
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {/* Row: Memory & Storage */}
              <tr className="bg-slate-50/50 dark:bg-slate-800/30">
                <td className="py-3 px-4 font-semibold text-slate-600 dark:text-slate-300">
                  Bellek / Depolama
                </td>
                {comparedProducts.map((p) => (
                  <td key={p.id} className="py-3 px-4 text-center font-semibold text-slate-800 dark:text-slate-200">
                    {p.ram ? `${p.ram} RAM / ` : ""}{p.storage}
                  </td>
                ))}
              </tr>

              {/* Row: TeknoReha Price */}
              <tr>
                <td className="py-3.5 px-4 font-semibold text-slate-600 dark:text-slate-300">
                  Bizim Satış Fiyatımız
                </td>
                {comparedProducts.map((p) => (
                  <td key={p.id} className="py-3.5 px-4 text-center">
                    <span className="text-base sm:text-lg font-black text-slate-900 dark:text-white">
                      {formatCurrency(p.basePrice)}
                    </span>
                  </td>
                ))}
              </tr>

              {/* Row: Stock Status */}
              <tr className="bg-slate-50/50 dark:bg-slate-800/30">
                <td className="py-3 px-4 font-semibold text-slate-600 dark:text-slate-300">
                  Stok Durumu
                </td>
                {comparedProducts.map((p) => (
                  <td key={p.id} className="py-3 px-4 text-center">
                    {p.inStock ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                        Stokta Var
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800">
                        <Clock3 className="w-3.5 h-3.5 text-amber-600" />
                        3 Gün İçinde Teslim
                      </span>
                    )}
                  </td>
                ))}
              </tr>

              {/* Categorized Specifications Rows */}
              {categoryHeaders.map((catHeader) => (
                <React.Fragment key={catHeader.key}>
                  {/* Category Section Header */}
                  <tr className="bg-slate-100 dark:bg-slate-800/80 font-bold">
                    <td
                      colSpan={comparedProducts.length + 1}
                      className="py-2.5 px-4 text-xs font-extrabold text-emerald-600 dark:text-emerald-400 tracking-wider"
                    >
                      {catHeader.title}
                    </td>
                  </tr>

                  {/* Specifications Render */}
                  {(() => {
                    return (
                      <tr>
                        <td className="py-3 px-4 font-medium text-slate-500 dark:text-slate-400 align-top">
                          Detaylı Özellikler
                        </td>
                        {productSpecsList.map((item) => {
                          const foundCat = item.specs?.categories.find((c) =>
                            c.title.toLowerCase().includes(catHeader.key.toLowerCase())
                          );

                          return (
                            <td
                              key={item.product.id}
                              className="py-3 px-4 align-top text-center"
                            >
                              {foundCat ? (
                                <ul className="space-y-1.5 text-xs text-slate-700 dark:text-slate-200 font-medium">
                                  {foundCat.items.map((subItem, sIdx) => (
                                    <li key={sIdx} className="leading-snug">
                                      <span className="text-slate-400 dark:text-slate-500 font-normal">
                                        {subItem.label}:{" "}
                                      </span>
                                      <span className="font-semibold">{subItem.value}</span>
                                    </li>
                                  ))}
                                </ul>
                              ) : (
                                <div className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 text-xs font-semibold">
                                  <AlertCircle className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                                  <span>Teknik özellik bilgisi henüz bulunmuyor</span>
                                </div>
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })()}
                </React.Fragment>
              ))}

              {/* Row: WhatsApp Action */}
              <tr className="bg-slate-50/50 dark:bg-slate-800/30">
                <td className="py-4 px-4 font-semibold text-slate-600 dark:text-slate-300">
                  Sipariş / Bilgi
                </td>
                {comparedProducts.map((p) => {
                  const link = generateWhatsAppLink({
                    brand: p.brand,
                    modelName: p.modelName,
                    ram: p.ram,
                    storage: p.storage,
                    inStock: p.inStock,
                  });

                  return (
                    <td key={p.id} className="py-4 px-4 text-center">
                      <a
                        href={link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-500 transition shadow-sm"
                      >
                        <MessageCircle className="w-3.5 h-3.5" />
                        <span>Sipariş Et</span>
                      </a>
                    </td>
                  );
                })}
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
