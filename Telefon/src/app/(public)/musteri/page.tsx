"use client";

import React, { useEffect, useState, useMemo, useCallback, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Search, SlidersHorizontal, ArrowUpDown, CheckCircle2 } from "lucide-react";
import { PublicProductDTO, PublicAdDTO } from "@/types";
import { AdHeroSlider } from "@/components/AdHeroSlider";
import { AdInFeedBanner } from "@/components/AdInFeedBanner";
import { BrandSelector } from "@/components/musteri/BrandSelector";
import { ProductCard } from "@/components/musteri/ProductCard";
import { ProductFilterDrawer, FilterState } from "@/components/musteri/ProductFilterDrawer";
import { FeaturedProductsSection } from "@/components/musteri/FeaturedProductsSection";
import { TrustContactSection } from "@/components/musteri/TrustContactSection";
import { ProductSpecsModal } from "@/components/musteri/ProductSpecsModal";
import { ProductDetailModal } from "@/components/musteri/ProductDetailModal";
import { ProductComparisonBar } from "@/components/musteri/ProductComparisonBar";
import { ProductComparisonModal } from "@/components/musteri/ProductComparisonModal";
import { createProductSlug } from "@/lib/utils";

interface SpecsModalState {
  product: PublicProductDTO;
  selectedColor: string | null;
  selectedColorImage: string | null;
  isColorInStock: boolean;
  whatsappLink: string;
}

function MusteriPageContent() {
  const searchParams = useSearchParams();
  const [products, setProducts] = useState<PublicProductDTO[]>([]);
  const [ads, setAds] = useState<PublicAdDTO[]>([]);
  const [loading, setLoading] = useState(true);

  // Product Detail Modal State
  const [detailState, setDetailState] = useState<{
    slug: string;
    ram?: string;
    storage?: string;
    color?: string;
  } | null>(null);

  // Specs Modal state
  const [specsState, setSpecsState] = useState<SpecsModalState | null>(null);
  const [isSpecsOpen, setIsSpecsOpen] = useState(false);

  // Comparison State
  const [comparedProducts, setComparedProducts] = useState<PublicProductDTO[]>([]);
  const [isComparisonOpen, setIsComparisonOpen] = useState(false);

  // Search & Filter State
  const [search, setSearch] = useState("");
  const [filters, setFilters] = useState<FilterState>({
    brand: "ALL",
    ram: "",
    storage: "",
    minPrice: "",
    maxPrice: "",
    stockStatus: "ALL",
    sortBy: "RECOMMENDED",
  });

  // Load data from API
  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        const [productsRes, adsRes] = await Promise.all([
          fetch("/api/public/products"),
          fetch("/api/public/ads"),
        ]);

        const productsJson = await productsRes.json();
        const adsJson = await adsRes.json();

        if (productsJson.success && Array.isArray(productsJson.data)) {
          setProducts(productsJson.data);
        }

        if (adsJson.success && Array.isArray(adsJson.data)) {
          setAds(adsJson.data);
        }
      } catch (err) {
        console.error("Veriler yüklenirken hata:", err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  // Parse URL query params dynamically via useSearchParams
  useEffect(() => {
    if (!searchParams) return;
    const stokParam = searchParams.get("stok");
    const brandParam = searchParams.get("brand");
    const ramParam = searchParams.get("ram");
    const storageParam = searchParams.get("storage");
    const searchParam = searchParams.get("search");
    const productParam = searchParams.get("product") || searchParams.get("urun");

    setFilters((prev) => ({
      ...prev,
      stockStatus: stokParam === "true" ? "IN_STOCK" : (stokParam === "false" ? "ALL" : prev.stockStatus),
      brand: brandParam || prev.brand,
      ram: ramParam || prev.ram,
      storage: storageParam || prev.storage,
    }));

    if (searchParam !== null) {
      setSearch(searchParam);
    }

    if (productParam) {
      setDetailState({
        slug: productParam,
        ram: ramParam || undefined,
        storage: storageParam || undefined,
        color: searchParams.get("color") || undefined,
      });
    }
  }, [searchParams]);

  // Open Product Detail Modal handler
  const handleOpenDetail = useCallback(
    (
      product: PublicProductDTO,
      ram?: string,
      storage?: string,
      color?: string
    ) => {
      const slug = createProductSlug(product.brand, product.modelName);
      setDetailState({
        slug,
        ram: ram || product.ram,
        storage: storage || product.storage,
        color: color || product.color,
      });
    },
    []
  );

  const heroAds = useMemo(() => ads.filter((a) => a.position === "HERO_SLIDER"), [ads]);
  const inFeedAds = useMemo(() => ads.filter((a) => a.position === "IN_FEED"), [ads]);

  // Extract dynamic Brands, RAMs, and Storages from products
  const brands = useMemo(() => {
    const set = new Set<string>();
    products.forEach((p) => {
      if (p.brand) set.add(p.brand);
    });
    return ["ALL", ...Array.from(set)];
  }, [products]);

  const availableRams = useMemo(() => {
    const set = new Set<string>();
    products.forEach((p) => {
      if (p.ram) set.add(p.ram);
    });
    return Array.from(set).sort((a, b) => parseInt(a) - parseInt(b));
  }, [products]);

  const availableStorages = useMemo(() => {
    const set = new Set<string>();
    products.forEach((p) => {
      if (p.storage) set.add(p.storage);
    });
    return Array.from(set).sort((a, b) => parseInt(a) - parseInt(b));
  }, [products]);

  // Handle ad model click
  const handleSelectPhoneModel = useCallback((modelId: string) => {
    const targetProduct = products.find((p) => p.id === modelId);
    if (targetProduct) {
      setFilters((prev) => ({
        ...prev,
        brand: targetProduct.brand,
        ram: targetProduct.ram || prev.ram,
        storage: targetProduct.storage || prev.storage,
      }));
      setSearch(targetProduct.modelName);
    }
  }, [products]);

  // Specs Modal Trigger
  const handleOpenSpecs = useCallback(
    (
      product: PublicProductDTO,
      selectedColor: string | null,
      selectedColorImage: string | null,
      isColorInStock: boolean,
      whatsappLink: string
    ) => {
      setSpecsState({
        product,
        selectedColor,
        selectedColorImage,
        isColorInStock,
        whatsappLink,
      });
      setIsSpecsOpen(true);
    },
    []
  );

  // Comparison Handlers
  const handleToggleCompare = useCallback((product: PublicProductDTO) => {
    setComparedProducts((prev) => {
      const exists = prev.some((p) => p.id === product.id);
      if (exists) {
        return prev.filter((p) => p.id !== product.id);
      }
      if (prev.length >= 3) {
        // Limit to 3 items
        return prev;
      }
      return [...prev, product];
    });
  }, []);

  const handleRemoveComparedProduct = useCallback((productId: string) => {
    setComparedProducts((prev) => prev.filter((p) => p.id !== productId));
  }, []);

  const handleClearComparedProducts = useCallback(() => {
    setComparedProducts([]);
  }, []);

  // Filter & Sort Pipeline
  const filteredProducts = useMemo(() => {
    const result = products.filter((p) => {
      // Brand filter
      if (filters.brand !== "ALL" && p.brand !== filters.brand) return false;

      // RAM filter
      if (filters.ram && p.ram !== filters.ram) return false;

      // Storage filter
      if (filters.storage && p.storage !== filters.storage) return false;

      // Stock Status filter
      if (filters.stockStatus === "IN_STOCK" && !p.inStock) return false;
      if (filters.stockStatus === "THREE_DAY" && p.inStock) return false;

      // Price filter
      if (filters.minPrice && p.basePrice < parseFloat(filters.minPrice)) return false;
      if (filters.maxPrice && p.basePrice > parseFloat(filters.maxPrice)) return false;

      // Search query
      if (search.trim()) {
        const q = search.trim().toLowerCase();
        const matchesBrand = p.brand.toLowerCase().includes(q);
        const matchesModel = p.modelName.toLowerCase().includes(q);
        const matchesRam = p.ram ? p.ram.toLowerCase().includes(q) : false;
        const matchesStorage = p.storage.toLowerCase().includes(q);
        const matchesColor = p.color ? p.color.toLowerCase().includes(q) : false;
        const matchesStockColors = p.stockColors
          ? p.stockColors.some((c) => c.toLowerCase().includes(q))
          : false;

        if (
          !matchesBrand &&
          !matchesModel &&
          !matchesRam &&
          !matchesStorage &&
          !matchesColor &&
          !matchesStockColors
        ) {
          return false;
        }
      }

      return true;
    });

    // Sorting
    switch (filters.sortBy) {
      case "PRICE_ASC":
        result.sort((a, b) => a.basePrice - b.basePrice);
        break;
      case "PRICE_DESC":
        result.sort((a, b) => b.basePrice - a.basePrice);
        break;
      case "STOCK_FIRST":
        result.sort((a, b) => (b.inStock ? 1 : 0) - (a.inStock ? 1 : 0));
        break;
      case "NEWEST":
        result.sort((a, b) => b.id.localeCompare(a.id));
        break;
      case "RECOMMENDED":
      default:
        // Default API order (Brand then ModelName)
        break;
    }

    return result;
  }, [products, filters, search]);

  // Calculate active filter count for badge
  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (filters.brand !== "ALL") count++;
    if (filters.ram) count++;
    if (filters.storage) count++;
    if (filters.minPrice) count++;
    if (filters.maxPrice) count++;
    if (filters.stockStatus !== "ALL") count++;
    return count;
  }, [filters]);

  const handleFilterChange = <K extends keyof FilterState>(key: K, value: FilterState[K]) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  const handleResetFilters = () => {
    setSearch("");
    setFilters({
      brand: "ALL",
      ram: "",
      storage: "",
      minPrice: "",
      maxPrice: "",
      stockStatus: "ALL",
      sortBy: "RECOMMENDED",
    });
  };

  const scrollToAllProducts = () => {
    const elem = document.getElementById("urunler");
    if (elem) {
      elem.scrollIntoView({ behavior: "smooth" });
    }
  };

  return (
    <div className="space-y-6 sm:space-y-8 pb-16">
      {/* 1. Hero Ad Slider (Hidden completely if no active hero ads exist) */}
      {heroAds.length > 0 && (
        <AdHeroSlider ads={heroAds} onSelectPhoneModel={handleSelectPhoneModel} />
      )}

      {/* 2. Brands Bar (Markalara Göz At) */}
      <BrandSelector
        brands={brands}
        selectedBrand={filters.brand}
        onSelectBrand={(brand) => handleFilterChange("brand", brand)}
      />

      {/* 3. Search + Filter + Sort Controls */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-3 sm:p-4 shadow-sm space-y-3">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          {/* Global Search Bar */}
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Telefon veya marka ara (ör. iPhone 17, 256 GB)..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 text-xs sm:text-sm font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500 border border-slate-200 dark:border-slate-700"
            />
          </div>

          <div className="flex items-center justify-between sm:justify-end gap-2">
            {/* Filter Drawer Trigger */}
            <ProductFilterDrawer
              filters={filters}
              availableBrands={brands}
              availableRams={availableRams}
              availableStorages={availableStorages}
              activeFilterCount={activeFilterCount}
              onChangeFilter={handleFilterChange}
              onResetFilters={handleResetFilters}
            />

            {/* Sorting Dropdown */}
            <div className="relative flex items-center gap-1 bg-slate-50 dark:bg-slate-800 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-200">
              <ArrowUpDown className="w-3.5 h-3.5 text-slate-400" />
              <select
                value={filters.sortBy}
                onChange={(e) =>
                  handleFilterChange("sortBy", e.target.value as FilterState["sortBy"])
                }
                className="bg-transparent focus:outline-none cursor-pointer pr-1"
              >
                <option value="RECOMMENDED">Önerilen</option>
                <option value="NEWEST">Yeni Eklenenler</option>
                <option value="PRICE_ASC">Fiyat: Düşükten Yüksekğe</option>
                <option value="PRICE_DESC">Fiyat: Yüksekten Düşüğe</option>
                <option value="STOCK_FIRST">Stoktakiler Önce</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* 4. Öne Çıkanlar Section (Horizontal Carousel) */}
      {!loading && products.length > 0 && (
        <FeaturedProductsSection
          products={products}
          onScrollToAll={scrollToAllProducts}
          onOpenSpecs={handleOpenSpecs}
          onOpenDetail={handleOpenDetail}
          comparedProducts={comparedProducts}
          onToggleCompare={handleToggleCompare}
        />
      )}

      {/* 5. Tüm Ürünler Grid */}
      <section id="urunler" className="space-y-4 pt-2">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <SlidersHorizontal className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <span>{filters.stockStatus === "IN_STOCK" ? "Stoktaki Ürünler" : "Tüm Ürünler"}</span>
            {!loading && (
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                ({filteredProducts.length} model)
              </span>
            )}
          </h2>

          {/* Quick Stock Filter Pills */}
          <div className="flex items-center gap-1.5 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold self-start sm:self-auto">
            <button
              onClick={() => handleFilterChange("stockStatus", "ALL")}
              className={`px-3 py-1.5 rounded-lg transition ${
                filters.stockStatus === "ALL"
                  ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs font-extrabold"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              Tüm Ürünler
            </button>
            <button
              onClick={() => handleFilterChange("stockStatus", "IN_STOCK")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition ${
                filters.stockStatus === "IN_STOCK"
                  ? "bg-emerald-600 text-white shadow-xs font-extrabold"
                  : "text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/40"
              }`}
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Sadece Stoktakiler</span>
            </button>
          </div>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
            {[1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 animate-pulse h-80 flex flex-col justify-between"
              >
                <div className="space-y-3">
                  <div className="w-1/3 h-4 bg-slate-200 dark:bg-slate-800 rounded" />
                  <div className="w-3/4 h-6 bg-slate-200 dark:bg-slate-800 rounded" />
                  <div className="w-1/2 h-4 bg-slate-200 dark:bg-slate-800 rounded" />
                </div>
                <div className="space-y-3">
                  <div className="w-2/3 h-6 bg-slate-200 dark:bg-slate-800 rounded" />
                  <div className="w-full h-11 bg-slate-200 dark:bg-slate-800 rounded-xl" />
                </div>
              </div>
            ))}
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="text-center py-16 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-8 space-y-3">
            <p className="text-slate-500 dark:text-slate-400 text-sm sm:text-base font-medium">
              Aradığınız kriterlere uygun telefon modeli bulunamadı.
            </p>
            <button
              onClick={handleResetFilters}
              className="px-4 py-2 rounded-xl bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-500 transition shadow"
            >
              Filtreleri Temizle
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
            {filteredProducts.map((product, index) => {
              const showInFeedAd = inFeedAds.length > 0 && index > 0 && index % 4 === 0;
              const inFeedAdToDisplay = showInFeedAd
                ? inFeedAds[(Math.floor(index / 4) - 1) % inFeedAds.length]
                : null;

              const isCompared = comparedProducts.some((p) => p.id === product.id);

              return (
                <React.Fragment key={`${product.id}-${product.ram}-${product.storage}`}>
                  {inFeedAdToDisplay && (
                    <AdInFeedBanner
                      ad={inFeedAdToDisplay}
                      onSelectPhoneModel={handleSelectPhoneModel}
                    />
                  )}
                  <ProductCard
                    product={product}
                    onOpenSpecs={handleOpenSpecs}
                    onOpenDetail={handleOpenDetail}
                    isCompared={isCompared}
                    onToggleCompare={handleToggleCompare}
                  />
                </React.Fragment>
              );
            })}
          </div>
        )}
      </section>

      {/* 6. Güven & İletişim Area */}
      <TrustContactSection />

      {/* Main Product Detail Overlay Modal */}
      <ProductDetailModal
        isOpen={!!detailState}
        onClose={() => setDetailState(null)}
        slug={detailState?.slug || null}
        initialRam={detailState?.ram}
        initialStorage={detailState?.storage}
        initialColor={detailState?.color}
        comparedProducts={comparedProducts}
        onToggleCompare={handleToggleCompare}
      />

      {/* Technical Specifications Modal */}
      {specsState && (
        <ProductSpecsModal
          isOpen={isSpecsOpen}
          onClose={() => setIsSpecsOpen(false)}
          product={specsState.product}
          selectedColor={specsState.selectedColor}
          selectedColorImage={specsState.selectedColorImage}
          isColorInStock={specsState.isColorInStock}
          whatsappLink={specsState.whatsappLink}
        />
      )}

      {/* Comparison Bottom Floating Bar */}
      <ProductComparisonBar
        comparedProducts={comparedProducts}
        onRemoveProduct={handleRemoveComparedProduct}
        onClearAll={handleClearComparedProducts}
        onOpenComparisonModal={() => setIsComparisonOpen(true)}
      />

      {/* Product Comparison Matrix Modal */}
      <ProductComparisonModal
        isOpen={isComparisonOpen}
        onClose={() => setIsComparisonOpen(false)}
        comparedProducts={comparedProducts}
      />
    </div>
  );
}

export default function MusteriPage() {
  return (
    <Suspense fallback={<div className="py-20 text-center text-slate-400">Yükleniyor...</div>}>
      <MusteriPageContent />
    </Suspense>
  );
}
