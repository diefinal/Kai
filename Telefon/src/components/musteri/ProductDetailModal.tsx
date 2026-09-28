"use client";

import React, { useEffect, useState, useMemo } from "react";
import {
  X,
  Smartphone,
  ShieldCheck,
  Clock,
  MessageCircle,
  Share2,
  CheckCircle2,
  SlidersHorizontal,
  ChevronDown,
  ChevronUp,
  Sparkles,
  Scale,
  Check,
} from "lucide-react";
import { APP_CONFIG } from "@/lib/constants";
import { getColorSwatchStyle } from "@/lib/colorUtils";
import { ColorAvailabilityDTO, NormalizedPhoneSpecs, PublicProductDTO } from "@/types";
import { ProductReservationModal } from "@/components/musteri/ProductReservationModal";

interface ProductDetailData {
  id: string;
  brand: string;
  modelName: string;
  ram: string;
  storage: string;
  color: string;
  availableRams: string[];
  availableStorages: string[];
  availableStoragesPerRam?: Record<string, string[]>;
  colorsWithStock: ColorAvailabilityDTO[];
  colorImages?: Record<string, string> | null;
  specs?: NormalizedPhoneSpecs | null;
  description?: string | null;
  imageUrl?: string | null;
  basePrice: number;
  inStock: boolean;
  overallInStock: boolean;
  stockCount: number;
  deliveryBadge: string;
}

interface ProductDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  slug: string | null;
  initialRam?: string;
  initialStorage?: string;
  initialColor?: string;
  comparedProducts?: PublicProductDTO[];
  onToggleCompare?: (product: PublicProductDTO) => void;
}

export function ProductDetailModal({
  isOpen,
  onClose,
  slug,
  initialRam,
  initialStorage,
  initialColor,
  comparedProducts = [],
  onToggleCompare,
}: ProductDetailModalProps) {
  const [product, setProduct] = useState<ProductDetailData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Selected variant state
  const [selectedRam, setSelectedRam] = useState<string>("");
  const [selectedStorage, setSelectedStorage] = useState<string>("");
  const [selectedColor, setSelectedColor] = useState<string>("");

  // Reservation Modal state
  const [isReservationOpen, setIsReservationOpen] = useState(false);

  // Specs accordion open/close state
  const [isSpecsExpanded, setIsSpecsExpanded] = useState(false);

  // Share link copied feedback
  const [copied, setCopied] = useState(false);

  // Reset & Load data when modal opens or slug/variants change
  useEffect(() => {
    if (!isOpen || !slug) {
      setProduct(null);
      return;
    }

    async function fetchProduct() {
      try {
        setLoading(true);
        setError(null);

        const query = new URLSearchParams();
        if (selectedRam) query.set("ram", selectedRam);
        else if (initialRam) query.set("ram", initialRam);

        if (selectedStorage) query.set("storage", selectedStorage);
        else if (initialStorage) query.set("storage", initialStorage);

        if (selectedColor) query.set("color", selectedColor);
        else if (initialColor) query.set("color", initialColor);

        const qStr = query.toString();
        const res = await fetch(
          `/api/public/products/${slug}${qStr ? `?${qStr}` : ""}`
        );
        const json = await res.json();

        if (json.success && json.data) {
          setProduct(json.data);
          if (!selectedRam) setSelectedRam(json.data.ram);
          if (!selectedStorage) setSelectedStorage(json.data.storage);
          if (!selectedColor) setSelectedColor(json.data.color);
        } else {
          setError(json.error || "Ürün detayları yüklenemedi.");
        }
      } catch (err) {
        console.error("Modal ürün yükleme hatası:", err);
        setError("Ürün detayları yüklenirken sunucu hatası oluştu.");
      } finally {
        setLoading(false);
      }
    }

    fetchProduct();
  }, [isOpen, slug, selectedRam, selectedStorage, selectedColor, initialRam, initialStorage, initialColor]);

  // Lock body scroll and handle ESC key
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };

    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = "unset";
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, onClose]);

  // Reset internal states on open
  useEffect(() => {
    if (isOpen) {
      setIsSpecsExpanded(false);
      setCopied(false);
      if (initialRam) setSelectedRam(initialRam);
      if (initialStorage) setSelectedStorage(initialStorage);
      if (initialColor) setSelectedColor(initialColor);
    } else {
      setSelectedRam("");
      setSelectedStorage("");
      setSelectedColor("");
    }
  }, [isOpen, initialRam, initialStorage, initialColor]);

  // Variant change handler inside modal
  const handleVariantChange = (ram?: string, storage?: string, color?: string) => {
    if (ram !== undefined) setSelectedRam(ram);
    if (storage !== undefined) setSelectedStorage(storage);
    if (color !== undefined) setSelectedColor(color);
  };

  const handleShare = () => {
    if (typeof window !== "undefined" && product) {
      const shareUrl = `${window.location.origin}/urun/${slug}`;
      navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  const whatsappMessage = useMemo(() => {
    if (!product) return "";
    const text = `Merhaba TeknoReha, ${product.brand} ${product.modelName} (${product.ram} / ${product.storage} - ${product.color}) cihazı hakkında bilgi almak istiyorum. Fiyat: ${product.basePrice.toLocaleString("tr-TR")} ₺`;
    return `https://wa.me/${APP_CONFIG.whatsappCleanNumber}?text=${encodeURIComponent(text)}`;
  }, [product]);

  const publicProductDTO: PublicProductDTO | null = useMemo(() => {
    if (!product) return null;
    return {
      id: product.id,
      brand: product.brand,
      modelName: product.modelName,
      ram: product.ram,
      storage: product.storage,
      color: product.color,
      stockColors: product.colorsWithStock.filter((c) => c.inStock).map((c) => c.color),
      colorsWithStock: product.colorsWithStock,
      colorImages: product.colorImages,
      specs: product.specs,
      description: product.description || null,
      imageUrl: product.imageUrl || null,
      basePrice: product.basePrice,
      inStock: product.inStock,
      stockCount: product.stockCount,
      deliveryBadge: product.deliveryBadge,
    };
  }, [product]);

  const isCompared = useMemo(() => {
    if (!product || !comparedProducts) return false;
    return comparedProducts.some((p) => p.id === product.id);
  }, [product, comparedProducts]);

  if (!isOpen) return null;

  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div
      onClick={handleBackdropClick}
      className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5 animate-in fade-in duration-200"
    >
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl w-full max-w-[1020px] max-h-[90vh] flex flex-col overflow-hidden relative transition-colors">
        {/* Top Header Bar */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-800/40">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 bg-emerald-100/70 dark:bg-emerald-950/80 px-2.5 py-0.5 rounded-md">
              {product?.brand || "TeknoReha"}
            </span>
            <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white leading-tight">
              {product?.modelName || "Ürün Detayı"}
            </h2>
            {product && (
              <span className="text-xs text-slate-400 dark:text-slate-500 font-medium hidden sm:inline">
                ({product.ram} / {product.storage} - {product.color})
              </span>
            )}
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-400 flex items-center justify-center transition"
            aria-label="Kapat"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable Content Body */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-7 space-y-6 custom-scrollbar">
          {loading ? (
            <div className="py-20 flex flex-col items-center justify-center space-y-3">
              <div className="w-10 h-10 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin" />
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                Ürün Detayları Yükleniyor...
              </span>
            </div>
          ) : error || !product ? (
            <div className="py-16 text-center space-y-3">
              <Smartphone className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto" />
              <p className="text-sm font-bold text-slate-800 dark:text-slate-200">
                {error || "Ürün Bulunamadı"}
              </p>
            </div>
          ) : (
            <>
              {/* 2-Column Grid */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                {/* Left Column: Product Image Showcase (~42% width) */}
                <div className="lg:col-span-5 bg-slate-50/80 dark:bg-slate-800/40 rounded-2xl border border-slate-100 dark:border-slate-800/80 p-5 flex flex-col items-center justify-center relative min-h-[260px] sm:min-h-[320px]">
                  {/* Stock Badge Overlay */}
                  <div className="absolute top-3 left-3 z-10">
                    <span
                      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold shadow-xs ${
                        product.inStock
                          ? "bg-emerald-100/90 text-emerald-800 dark:bg-emerald-950/90 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800"
                          : "bg-blue-100/90 text-blue-800 dark:bg-blue-950/90 dark:text-blue-300 border border-blue-200 dark:border-blue-800"
                      }`}
                    >
                      {product.inStock ? (
                        <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                      ) : (
                        <Clock className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                      )}
                      {product.deliveryBadge}
                    </span>
                  </div>

                  {product.imageUrl ? (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img
                      src={product.imageUrl}
                      alt={`${product.brand} ${product.modelName} ${product.color}`}
                      className="max-h-[240px] sm:max-h-[270px] w-auto object-contain transition-all duration-300 transform hover:scale-105 drop-shadow-md"
                    />
                  ) : (
                    <div className="w-28 h-28 bg-slate-100 dark:bg-slate-800 rounded-2xl flex items-center justify-center text-slate-400">
                      <Smartphone className="w-12 h-12" />
                    </div>
                  )}

                  {/* Selected Color Caption */}
                  <div className="mt-4 text-center">
                    <span className="text-xs font-medium text-slate-500 dark:text-slate-400 inline-flex items-center justify-center gap-1.5">
                      <span>Seçilen Renk:</span>
                      {(() => {
                        const style = getColorSwatchStyle(product.color);
                        return style ? (
                          <span
                            className="w-3 h-3 rounded-full inline-block shadow-xs shrink-0"
                            style={{
                              background: style.bg,
                              border: style.border
                                ? `1px solid ${style.border}`
                                : "1px solid rgba(0,0,0,0.15)",
                            }}
                          />
                        ) : null;
                      })()}
                      <strong className="text-slate-900 dark:text-white font-bold">
                        {product.color}
                      </strong>
                    </span>
                  </div>
                </div>

                {/* Right Column: Price, Variants & CTAs (~58% width) */}
                <div className="lg:col-span-7 space-y-4">
                  {/* Compact Price & Stock Row */}
                  <div className="flex items-center gap-3.5 flex-wrap py-2.5 px-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700/70">
                    <div className="flex items-baseline gap-1">
                      <span className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white">
                        {product.basePrice.toLocaleString("tr-TR")}
                      </span>
                      <span className="text-base font-extrabold text-emerald-600 dark:text-emerald-400">
                        ₺
                      </span>
                    </div>
                    <span className="text-slate-300 dark:text-slate-700">|</span>
                    <div className="flex items-center gap-1.5 text-xs font-bold">
                      <span
                        className={`w-2 h-2 rounded-full ${
                          product.inStock ? "bg-emerald-500 animate-pulse" : "bg-blue-400"
                        }`}
                      />
                      <span
                        className={
                          product.inStock
                            ? "text-emerald-700 dark:text-emerald-300"
                            : "text-blue-600 dark:text-blue-300"
                        }
                      >
                        {product.inStock
                          ? `${product.stockCount} Adet Stokta`
                          : "3 Gün İçinde Teslim"}
                      </span>
                    </div>
                  </div>

                  {/* Variant Selectors Section */}
                  <div className="space-y-3 pt-1">
                    {/* RAM Selectors */}
                    {product.availableRams.length > 0 && (
                      <div className="space-y-1.5">
                        <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                          RAM Kapasitesi
                        </label>
                        <div className="flex flex-wrap gap-1.5">
                          {product.availableRams.map((r) => {
                            const isSelected = r === product.ram;
                            return (
                              <button
                                key={r}
                                onClick={() => {
                                  const validStorages =
                                    product.availableStoragesPerRam?.[r] ||
                                    product.availableStorages;
                                  const nextStorage =
                                    validStorages.includes(product.storage)
                                      ? product.storage
                                      : validStorages[0] || product.storage;
                                  handleVariantChange(r, nextStorage, "");
                                }}
                                className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition ${
                                  isSelected
                                    ? "bg-slate-900 text-white border-slate-900 dark:bg-emerald-600 dark:border-emerald-600 dark:text-white shadow-xs"
                                    : "bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-slate-400"
                                }`}
                              >
                                {r}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Storage Selectors */}
                    {product.availableStorages.length > 0 && (
                      <div className="space-y-1.5">
                        <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                          Dahili Hafıza
                        </label>
                        <div className="flex flex-wrap gap-1.5">
                          {(() => {
                            const validStorages =
                              product.availableStoragesPerRam?.[product.ram] ||
                              product.availableStorages;
                            return validStorages.map((st) => {
                              const isSelected = st === product.storage;
                              return (
                                <button
                                  key={st}
                                  onClick={() =>
                                    handleVariantChange(undefined, st, "")
                                  }
                                  className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition ${
                                    isSelected
                                      ? "bg-slate-900 text-white border-slate-900 dark:bg-emerald-600 dark:border-emerald-600 dark:text-white shadow-xs"
                                      : "bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-slate-400"
                                  }`}
                                >
                                  {st}
                                </button>
                              );
                            });
                          })()}
                        </div>
                      </div>
                    )}

                    {/* Color Selectors */}
                    {product.colorsWithStock.length > 0 && (
                      <div className="space-y-1.5">
                        <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                          Renk Seçenekleri
                        </label>
                        <div className="flex flex-wrap gap-1.5">
                          {product.colorsWithStock.map((item) => {
                            const isSelected =
                              item.color.toLowerCase() === product.color.toLowerCase();
                            const style = getColorSwatchStyle(item.color);
                            return (
                              <button
                                key={item.color}
                                type="button"
                                onClick={() =>
                                  handleVariantChange(undefined, undefined, item.color)
                                }
                                className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold border transition ${
                                  isSelected
                                    ? "bg-emerald-50 dark:bg-emerald-950/80 border-emerald-600 text-emerald-900 dark:text-emerald-300 ring-2 ring-emerald-500/20 shadow-xs"
                                    : "bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-slate-400"
                                }`}
                              >
                                {style ? (
                                  <span
                                    className="w-3.5 h-3.5 rounded-full shrink-0 shadow-xs inline-block"
                                    style={{
                                      background: style.bg,
                                      border: style.border
                                        ? `1px solid ${style.border}`
                                        : "1px solid rgba(0,0,0,0.15)",
                                    }}
                                  />
                                ) : (
                                  <span className="w-3.5 h-3.5 rounded-full bg-slate-300 dark:bg-slate-600 border border-slate-400 dark:border-slate-500 shrink-0 inline-block" />
                                )}
                                <span>{item.color}</span>
                                <span
                                  className={`text-[10px] px-1.5 py-0.2 rounded font-semibold ${
                                    item.inStock
                                      ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-300"
                                      : "bg-slate-200 text-slate-600 dark:bg-slate-700 dark:text-slate-300"
                                  }`}
                                >
                                  {item.inStock ? `${item.stockCount ?? "Stokta"}` : "3 Gün"}
                                </span>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Action Buttons (CTAs) */}
                  <div className="space-y-2.5 pt-3 border-t border-slate-100 dark:border-slate-800">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      {/* Primary Action: Ürünü Ayırt / Sipariş Ver */}
                      <button
                        onClick={() => setIsReservationOpen(true)}
                        className="w-full py-3.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs sm:text-sm transition shadow-sm flex items-center justify-center gap-2"
                      >
                        <Sparkles className="w-4 h-4" />
                        <span>
                          {product.inStock
                            ? "Ürünü Ayırt / Sipariş Ver"
                            : "Sipariş Ver / Ayırt"}
                        </span>
                      </button>

                      {/* Secondary Action: WhatsApp'tan Bilgi Al */}
                      <a
                        href={whatsappMessage}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-full py-3.5 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 dark:bg-slate-800 dark:hover:bg-slate-700 text-white font-bold text-xs sm:text-sm transition shadow-sm flex items-center justify-center gap-2"
                      >
                        <MessageCircle className="w-4 h-4 text-emerald-400" />
                        <span>WhatsApp&apos;tan Bilgi Al</span>
                      </a>
                    </div>

                    {/* Secondary Utilities Row: Share Link & Compare */}
                    <div className="flex items-center justify-between gap-2 pt-1 text-xs">
                      <button
                        onClick={handleShare}
                        className="inline-flex items-center gap-1.5 text-slate-600 dark:text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 font-semibold transition"
                      >
                        {copied ? (
                          <>
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                            <span className="text-emerald-600 font-bold">Kopyalandı!</span>
                          </>
                        ) : (
                          <>
                            <Share2 className="w-3.5 h-3.5" />
                            <span>Bağlantıyı Paylaş</span>
                          </>
                        )}
                      </button>

                      {onToggleCompare && publicProductDTO && (
                        <button
                          onClick={() => onToggleCompare(publicProductDTO)}
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg font-semibold transition text-xs ${
                            isCompared
                              ? "bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300"
                              : "text-slate-600 dark:text-slate-400 hover:text-purple-600"
                          }`}
                        >
                          {isCompared ? (
                            <>
                              <Check className="w-3.5 h-3.5 text-purple-600" />
                              <span>Karşılaştırmada</span>
                            </>
                          ) : (
                            <>
                              <Scale className="w-3.5 h-3.5" />
                              <span>Karşılaştır</span>
                            </>
                          )}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Teknik Özellikler Accordion Section */}
              {product.specs && (
                <div className="pt-4 border-t border-slate-200/80 dark:border-slate-800">
                  <button
                    type="button"
                    onClick={() => setIsSpecsExpanded(!isSpecsExpanded)}
                    className="w-full p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200/80 dark:border-slate-700/80 text-slate-900 dark:text-white font-bold text-xs sm:text-sm flex items-center justify-between transition group"
                  >
                    <div className="flex items-center gap-2">
                      <SlidersHorizontal className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                      <span>Teknik Özellikler & Detaylar</span>
                    </div>
                    <div className="flex items-center gap-1 text-xs text-slate-500 font-medium">
                      <span>{isSpecsExpanded ? "Gizle" : "Göster"}</span>
                      {isSpecsExpanded ? (
                        <ChevronUp className="w-4 h-4 text-slate-400" />
                      ) : (
                        <ChevronDown className="w-4 h-4 text-slate-400 group-hover:translate-y-0.5 transition-transform" />
                      )}
                    </div>
                  </button>

                  {/* Accordion Content */}
                  {isSpecsExpanded && (
                    <div className="mt-3 p-4 sm:p-6 rounded-2xl bg-slate-50/60 dark:bg-slate-800/30 border border-slate-200/60 dark:border-slate-800 space-y-4 animate-in fade-in duration-200 text-xs">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {product.specs.displaySize && (
                          <div className="p-3 bg-white dark:bg-slate-800 rounded-xl border border-slate-100 dark:border-slate-700/60">
                            <span className="text-[10px] text-slate-400 font-bold uppercase block">Ekran</span>
                            <span className="font-bold text-slate-800 dark:text-slate-200">{product.specs.displaySize}</span>
                            {product.specs.displayTechnology && (
                              <span className="text-[11px] text-slate-500 block">{product.specs.displayTechnology}</span>
                            )}
                          </div>
                        )}

                        {product.specs.chipset && (
                          <div className="p-3 bg-white dark:bg-slate-800 rounded-xl border border-slate-100 dark:border-slate-700/60">
                            <span className="text-[10px] text-slate-400 font-bold uppercase block">İşlemci / Chipset</span>
                            <span className="font-bold text-slate-800 dark:text-slate-200">{product.specs.chipset}</span>
                          </div>
                        )}

                        {product.specs.mainCamera && (
                          <div className="p-3 bg-white dark:bg-slate-800 rounded-xl border border-slate-100 dark:border-slate-700/60">
                            <span className="text-[10px] text-slate-400 font-bold uppercase block">Arka Kamera</span>
                            <span className="font-bold text-slate-800 dark:text-slate-200">{product.specs.mainCamera}</span>
                          </div>
                        )}

                        {product.specs.frontCamera && (
                          <div className="p-3 bg-white dark:bg-slate-800 rounded-xl border border-slate-100 dark:border-slate-700/60">
                            <span className="text-[10px] text-slate-400 font-bold uppercase block">Ön Kamera</span>
                            <span className="font-bold text-slate-800 dark:text-slate-200">{product.specs.frontCamera}</span>
                          </div>
                        )}

                        {product.specs.batteryCapacity && (
                          <div className="p-3 bg-white dark:bg-slate-800 rounded-xl border border-slate-100 dark:border-slate-700/60">
                            <span className="text-[10px] text-slate-400 font-bold uppercase block">Batarya & Şarj</span>
                            <span className="font-bold text-slate-800 dark:text-slate-200">{product.specs.batteryCapacity}</span>
                            {product.specs.fastCharging && (
                              <span className="text-[11px] text-slate-500 block">Hızlı Şarj: {product.specs.fastCharging}</span>
                            )}
                          </div>
                        )}

                        {product.specs.operatingSystem && (
                          <div className="p-3 bg-white dark:bg-slate-800 rounded-xl border border-slate-100 dark:border-slate-700/60">
                            <span className="text-[10px] text-slate-400 font-bold uppercase block">İşletim Sistemi</span>
                            <span className="font-bold text-slate-800 dark:text-slate-200">{product.specs.operatingSystem}</span>
                          </div>
                        )}
                      </div>

                      {product.specs.source && (
                        <div className="text-[10px] text-slate-400 pt-2 border-t border-slate-200/40 dark:border-slate-700/40">
                          Kaynak: {product.specs.source} • Güncelleme: {product.specs.lastUpdated}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Reservation Modal */}
      {publicProductDTO && (
        <ProductReservationModal
          isOpen={isReservationOpen}
          onClose={() => setIsReservationOpen(false)}
          product={publicProductDTO}
        />
      )}
    </div>
  );
}
