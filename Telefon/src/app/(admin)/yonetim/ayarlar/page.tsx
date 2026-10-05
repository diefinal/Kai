"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import Image from "next/image";
import {
  Smartphone,
  ListOrdered,
  ArrowUp,
  ArrowDown,
  GripVertical,
  Save,
  CheckCircle2,
  AlertCircle,
  RotateCcw,
  Loader2,
  Package,
  Sparkles,
  Plus,
  Trash2,
  Search,
  X,
} from "lucide-react";

interface PhoneModelItem {
  id: string;
  brand: string;
  modelName: string;
  ram: string;
  storage: string;
  color?: string;
  imageUrl?: string | null;
  basePrice?: number;
  inStock?: boolean;
}

export default function AyarlarPage() {
  // --- Brand Order State ---
  const [brands, setBrands] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);

  // --- Product Order State ---
  const [models, setModels] = useState<PhoneModelItem[]>([]);
  const [productLoading, setProductLoading] = useState(true);
  const [productSaving, setProductSaving] = useState(false);
  const [productSuccessMessage, setProductSuccessMessage] = useState<string | null>(null);
  const [productErrorMessage, setProductErrorMessage] = useState<string | null>(null);
  const [productDraggedIndex, setProductDraggedIndex] = useState<number | null>(null);

  // --- Featured Products State ---
  const [featuredEnabled, setFeaturedEnabled] = useState(true);
  const [featuredModels, setFeaturedModels] = useState<PhoneModelItem[]>([]);
  const [allModels, setAllModels] = useState<PhoneModelItem[]>([]);
  const [featuredLoading, setFeaturedLoading] = useState(true);
  const [featuredSaving, setFeaturedSaving] = useState(false);
  const [featuredSuccessMessage, setFeaturedSuccessMessage] = useState<string | null>(null);
  const [featuredErrorMessage, setFeaturedErrorMessage] = useState<string | null>(null);
  const [featuredDraggedIndex, setFeaturedDraggedIndex] = useState<number | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [addSearchQuery, setAddSearchQuery] = useState("");

  // Fetch initial brand order from API
  const fetchBrandOrder = useCallback(async () => {
    try {
      setLoading(true);
      setErrorMessage(null);
      const res = await fetch("/api/admin/settings/brand-order");
      const json = await res.json();
      if (json.success && json.data && Array.isArray(json.data.brandOrder)) {
        setBrands(json.data.brandOrder);
      } else {
        setErrorMessage(json.error || "Marka sıralaması alınamadı.");
      }
    } catch (err) {
      console.error("Brand order fetch error:", err);
      setErrorMessage("Sunucu ile bağlantı kurulamadı.");
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch initial product order from API
  const fetchProductOrder = useCallback(async () => {
    try {
      setProductLoading(true);
      setProductErrorMessage(null);
      const res = await fetch("/api/admin/settings/product-order");
      const json = await res.json();
      if (json.success && json.data && Array.isArray(json.data.models)) {
        setModels(json.data.models);
      } else {
        setProductErrorMessage(json.error || "Ürün sıralaması alınamadı.");
      }
    } catch (err) {
      console.error("Product order fetch error:", err);
      setProductErrorMessage("Sunucu ile bağlantı kurulamadı.");
    } finally {
      setProductLoading(false);
    }
  }, []);

  // Fetch initial featured products settings from API
  const fetchFeaturedSettings = useCallback(async () => {
    try {
      setFeaturedLoading(true);
      setFeaturedErrorMessage(null);
      const res = await fetch("/api/admin/settings/featured-products");
      const json = await res.json();
      if (json.success && json.data) {
        setFeaturedEnabled(Boolean(json.data.enabled));
        if (Array.isArray(json.data.featuredModels)) {
          setFeaturedModels(json.data.featuredModels);
        }
        if (Array.isArray(json.data.allModels)) {
          setAllModels(json.data.allModels);
        }
      } else {
        setFeaturedErrorMessage(json.error || "Öne çıkan ürün ayarları alınamadı.");
      }
    } catch (err) {
      console.error("Featured products fetch error:", err);
      setFeaturedErrorMessage("Sunucu ile bağlantı kurulamadı.");
    } finally {
      setFeaturedLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBrandOrder();
    fetchProductOrder();
    fetchFeaturedSettings();
  }, [fetchBrandOrder, fetchProductOrder, fetchFeaturedSettings]);

  // Brand move up / down
  const moveUp = (index: number) => {
    if (index === 0) return;
    const updated = [...brands];
    const temp = updated[index - 1];
    updated[index - 1] = updated[index];
    updated[index] = temp;
    setBrands(updated);
  };

  const moveDown = (index: number) => {
    if (index === brands.length - 1) return;
    const updated = [...brands];
    const temp = updated[index + 1];
    updated[index + 1] = updated[index];
    updated[index] = temp;
    setBrands(updated);
  };

  // Brand Drag & Drop handlers
  const handleDragStart = (e: React.DragEvent<HTMLDivElement>, index: number) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>, index: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === index) return;
    const updated = [...brands];
    const draggedItem = updated[draggedIndex];
    updated.splice(draggedIndex, 1);
    updated.splice(index, 0, draggedItem);
    setDraggedIndex(index);
    setBrands(updated);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
  };

  // Save Brand Order
  const handleSaveBrandOrder = async () => {
    try {
      setSaving(true);
      setSuccessMessage(null);
      setErrorMessage(null);

      const res = await fetch("/api/admin/settings/brand-order", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ brandOrder: brands }),
      });

      const json = await res.json();
      if (json.success) {
        setSuccessMessage("Müşteri vitrini marka sıralaması başarıyla kaydedildi.");
        setTimeout(() => setSuccessMessage(null), 4000);
      } else {
        setErrorMessage(json.error || "Marka sıralaması kaydedilemedi.");
      }
    } catch (err) {
      console.error("Save brand order error:", err);
      setErrorMessage("Kaydetme sırasında bir hata oluştu.");
    } finally {
      setSaving(false);
    }
  };

  // Reset brand order to alphabetical
  const handleResetBrandAlphabetical = () => {
    const sorted = [...brands].sort((a, b) => a.localeCompare(b, "tr"));
    setBrands(sorted);
  };

  // --- Product Move Up / Down ---
  const moveProductUp = (index: number) => {
    if (index === 0) return;
    const updated = [...models];
    const temp = updated[index - 1];
    updated[index - 1] = updated[index];
    updated[index] = temp;
    setModels(updated);
  };

  const moveProductDown = (index: number) => {
    if (index === models.length - 1) return;
    const updated = [...models];
    const temp = updated[index + 1];
    updated[index + 1] = updated[index];
    updated[index] = temp;
    setModels(updated);
  };

  // Product Drag & Drop handlers
  const handleProductDragStart = (e: React.DragEvent<HTMLDivElement>, index: number) => {
    setProductDraggedIndex(index);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleProductDragOver = (e: React.DragEvent<HTMLDivElement>, index: number) => {
    e.preventDefault();
    if (productDraggedIndex === null || productDraggedIndex === index) return;
    const updated = [...models];
    const draggedItem = updated[productDraggedIndex];
    updated.splice(productDraggedIndex, 1);
    updated.splice(index, 0, draggedItem);
    setProductDraggedIndex(index);
    setModels(updated);
  };

  const handleProductDragEnd = () => {
    setProductDraggedIndex(null);
  };

  // Save Product Order
  const handleSaveProductOrder = async () => {
    try {
      setProductSaving(true);
      setProductSuccessMessage(null);
      setProductErrorMessage(null);

      const productOrder = models.map((m) => m.id);

      const res = await fetch("/api/admin/settings/product-order", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productOrder }),
      });

      const json = await res.json();
      if (json.success) {
        setProductSuccessMessage("Müşteri vitrini ürün sıralaması başarıyla kaydedildi.");
        setTimeout(() => setProductSuccessMessage(null), 4000);
      } else {
        setProductErrorMessage(json.error || "Ürün sıralaması kaydedilemedi.");
      }
    } catch (err) {
      console.error("Save product order error:", err);
      setProductErrorMessage("Kaydetme sırasında bir hata oluştu.");
    } finally {
      setProductSaving(false);
    }
  };

  // Reset product order to alphabetical by Brand then Model Name
  const handleResetProductAlphabetical = () => {
    const sorted = [...models].sort((a, b) => {
      if (a.brand !== b.brand) {
        return a.brand.localeCompare(b.brand, "tr");
      }
      return a.modelName.localeCompare(b.modelName, "tr");
    });
    setModels(sorted);
  };

  // --- Featured Products Handlers ---
  const moveFeaturedUp = (index: number) => {
    if (index === 0) return;
    const updated = [...featuredModels];
    const temp = updated[index - 1];
    updated[index - 1] = updated[index];
    updated[index] = temp;
    setFeaturedModels(updated);
  };

  const moveFeaturedDown = (index: number) => {
    if (index === featuredModels.length - 1) return;
    const updated = [...featuredModels];
    const temp = updated[index + 1];
    updated[index + 1] = updated[index];
    updated[index] = temp;
    setFeaturedModels(updated);
  };

  const handleFeaturedDragStart = (e: React.DragEvent<HTMLDivElement>, index: number) => {
    setFeaturedDraggedIndex(index);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleFeaturedDragOver = (e: React.DragEvent<HTMLDivElement>, index: number) => {
    e.preventDefault();
    if (featuredDraggedIndex === null || featuredDraggedIndex === index) return;
    const updated = [...featuredModels];
    const draggedItem = updated[featuredDraggedIndex];
    updated.splice(featuredDraggedIndex, 1);
    updated.splice(index, 0, draggedItem);
    setFeaturedDraggedIndex(index);
    setFeaturedModels(updated);
  };

  const handleFeaturedDragEnd = () => {
    setFeaturedDraggedIndex(null);
  };

  const handleAddFeaturedProduct = (model: PhoneModelItem) => {
    if (featuredModels.some((m) => m.id === model.id)) return;
    setFeaturedModels((prev) => [...prev, model]);
  };

  const handleRemoveFeaturedProduct = (id: string) => {
    setFeaturedModels((prev) => prev.filter((m) => m.id !== id));
  };

  const handleSaveFeaturedSettings = async () => {
    try {
      setFeaturedSaving(true);
      setFeaturedSuccessMessage(null);
      setFeaturedErrorMessage(null);

      const featuredProductOrder = featuredModels.map((m) => m.id);

      const res = await fetch("/api/admin/settings/featured-products", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          enabled: featuredEnabled,
          featuredProductOrder,
        }),
      });

      const json = await res.json();
      if (json.success) {
        setFeaturedSuccessMessage("Öne çıkan ürün ayarları başarıyla kaydedildi.");
        setTimeout(() => setFeaturedSuccessMessage(null), 4000);
      } else {
        setFeaturedErrorMessage(json.error || "Öne çıkan ürün ayarları kaydedilemedi.");
      }
    } catch (err) {
      console.error("Save featured settings error:", err);
      setFeaturedErrorMessage("Kaydetme sırasında bir hata oluştu.");
    } finally {
      setFeaturedSaving(false);
    }
  };

  // Filter available models for add modal search
  const availableToAddModels = useMemo(() => {
    const featuredIdSet = new Set(featuredModels.map((m) => m.id));
    const unselected = allModels.filter((m) => !featuredIdSet.has(m.id));

    if (!addSearchQuery.trim()) return unselected;
    const q = addSearchQuery.trim().toLowerCase();
    return unselected.filter(
      (m) =>
        m.brand.toLowerCase().includes(q) ||
        m.modelName.toLowerCase().includes(q) ||
        m.ram.toLowerCase().includes(q) ||
        m.storage.toLowerCase().includes(q)
    );
  }, [allModels, featuredModels, addSearchQuery]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
          Sistem Ayarları
        </h1>
        <p className="text-slate-500 text-sm mt-1">
          Uygulama konfigürasyonu, vitrin düzenlemesi ve sistem parametreleri.
        </p>
      </div>

      {/* --- Müşteri Vitrini Öne Çıkan Ürünler (YENİ BÖLÜM) --- */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-sm space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-bold text-slate-900 text-lg">Öne Çıkan Ürünler Yönetimi</h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Müşteri vitrininde (teknoreha.com) üst kısımda yer alan &quot;Öne Çıkanlar&quot; alanının görünürlüğünü ve ürün sırasını yönetin.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto">
            <button
              onClick={() => setIsAddModalOpen(true)}
              disabled={featuredLoading || featuredSaving}
              className="px-3.5 py-2 rounded-xl text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 disabled:opacity-50 transition flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4 text-emerald-600" />
              <span>Öne Çıkan Ürün Ekle</span>
            </button>

            <button
              onClick={handleSaveFeaturedSettings}
              disabled={featuredLoading || featuredSaving}
              className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition shadow-sm flex items-center gap-2 disabled:opacity-50"
            >
              {featuredSaving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Kaydediliyor...</span>
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  <span>Kaydet</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Visibility Toggle Checkbox */}
        <div className="flex items-center gap-3 bg-slate-50 p-4 rounded-xl border border-slate-200/80">
          <input
            type="checkbox"
            id="featured_enabled_toggle"
            checked={featuredEnabled}
            onChange={(e) => setFeaturedEnabled(e.target.checked)}
            className="w-4 h-4 text-emerald-600 rounded border-slate-300 focus:ring-emerald-500 cursor-pointer"
          />
          <label
            htmlFor="featured_enabled_toggle"
            className="text-sm font-bold text-slate-900 cursor-pointer select-none"
          >
            [✓] Öne Çıkanlar bölümünü müşteri vitrininde göster
          </label>
        </div>

        {/* Notifications */}
        {featuredSuccessMessage && (
          <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{featuredSuccessMessage}</span>
          </div>
        )}

        {featuredErrorMessage && (
          <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-800 text-xs font-semibold flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
            <span>{featuredErrorMessage}</span>
          </div>
        )}

        {/* Featured Models List */}
        {featuredLoading ? (
          <div className="space-y-2 py-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-14 bg-slate-100 rounded-xl animate-pulse" />
            ))}
          </div>
        ) : featuredModels.length === 0 ? (
          <div className="text-center py-8 text-slate-500 text-sm bg-slate-50 rounded-xl border border-slate-200/60 space-y-2">
            <p>Seçilmiş öne çıkan ürün bulunmamaktadır.</p>
            <button
              onClick={() => setIsAddModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-slate-300 text-xs font-bold text-slate-700 hover:bg-slate-100 transition"
            >
              <Plus className="w-3.5 h-3.5 text-emerald-600" />
              <span>Ürün Ekle</span>
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            <div className="text-xs font-semibold text-slate-400 px-1 pb-1 flex justify-between items-center">
              <span>Sıralamayı değiştirmek için sürükleyin veya ↑ ↓ butonlarını kullanın.</span>
              <span>Toplam {featuredModels.length} öne çıkan model</span>
            </div>

            {featuredModels.map((model, idx) => {
              const isFirst = idx === 0;
              const isLast = idx === featuredModels.length - 1;
              const isDragging = featuredDraggedIndex === idx;

              return (
                <div
                  key={model.id}
                  draggable
                  onDragStart={(e) => handleFeaturedDragStart(e, idx)}
                  onDragOver={(e) => handleFeaturedDragOver(e, idx)}
                  onDragEnd={handleFeaturedDragEnd}
                  className={`flex items-center justify-between p-3 rounded-xl border transition-all ${
                    isDragging
                      ? "bg-emerald-50 border-emerald-300 shadow-md opacity-60 scale-[1.01]"
                      : "bg-white border-slate-200 hover:border-slate-300 hover:shadow-xs"
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="cursor-grab active:cursor-grabbing p-1 text-slate-400 hover:text-slate-600 rounded shrink-0">
                      <GripVertical className="w-4 h-4" />
                    </div>

                    <span className="w-7 h-7 rounded-lg bg-slate-100 text-slate-700 font-extrabold text-xs flex items-center justify-center border border-slate-200/80 shrink-0">
                      {idx + 1}
                    </span>

                    {model.imageUrl ? (
                      <div className="w-9 h-9 rounded-lg bg-slate-100 relative overflow-hidden border border-slate-200 shrink-0">
                        <Image
                          src={model.imageUrl}
                          alt={model.modelName}
                          fill
                          className="object-contain p-0.5"
                        />
                      </div>
                    ) : (
                      <div className="w-9 h-9 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center shrink-0 text-slate-400">
                        <Smartphone className="w-4 h-4" />
                      </div>
                    )}

                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-emerald-600 uppercase">
                          {model.brand}
                        </span>
                        <span className="text-sm font-bold text-slate-900 truncate">
                          {model.modelName}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-slate-500">
                        <span>
                          {model.ram} / {model.storage}
                        </span>
                        <span>•</span>
                        <span
                          className={`font-semibold ${
                            model.inStock ? "text-emerald-600" : "text-amber-600"
                          }`}
                        >
                          {model.inStock ? "Stokta Var" : "3 Gün İçinde Teslim"}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 shrink-0 ml-2">
                    <button
                      onClick={() => moveFeaturedUp(idx)}
                      disabled={isFirst}
                      className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 disabled:opacity-30 disabled:hover:bg-transparent transition"
                      title="Yukarı Taşı"
                    >
                      <ArrowUp className="w-4 h-4" />
                    </button>

                    <button
                      onClick={() => moveFeaturedDown(idx)}
                      disabled={isLast}
                      className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 disabled:opacity-30 disabled:hover:bg-transparent transition"
                      title="Aşağı Taşı"
                    >
                      <ArrowDown className="w-4 h-4" />
                    </button>

                    <button
                      onClick={() => handleRemoveFeaturedProduct(model.id)}
                      className="p-1.5 rounded-lg text-red-500 hover:text-red-700 hover:bg-red-50 transition ml-1"
                      title="Öne Çıkanlardan Kaldır"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* --- Add Featured Product Modal --- */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-lg w-full border border-slate-200 dark:border-slate-800 shadow-2xl p-6 space-y-4 max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800 shrink-0">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-emerald-50 text-emerald-600">
                  <Sparkles className="w-5 h-5" />
                </div>
                <h3 className="font-bold text-slate-900 dark:text-white text-base sm:text-lg">
                  Öne Çıkan Ürün Ekle
                </h3>
              </div>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Search Input */}
            <div className="relative shrink-0">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Marka veya model ismi ara (ör. Xiaomi 17, Apple 17)..."
                value={addSearchQuery}
                onChange={(e) => setAddSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-xs sm:text-sm font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500 border border-slate-200 dark:border-slate-700"
              />
            </div>

            {/* Product List Scrollable */}
            <div className="flex-1 overflow-y-auto space-y-2 pr-1 custom-scrollbar min-h-[200px]">
              {availableToAddModels.length === 0 ? (
                <div className="text-center py-8 text-slate-400 text-xs">
                  {addSearchQuery ? "Aramaya uygun eklenebilir model bulunamadı." : "Eklenebilir tüm aktif modeller zaten seçilmiş durumda."}
                </div>
              ) : (
                availableToAddModels.map((m: PhoneModelItem) => (
                  <div
                    key={m.id}
                    className="flex items-center justify-between p-3 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-emerald-300 dark:hover:border-emerald-700 hover:bg-emerald-50/40 dark:hover:bg-emerald-950/20 transition"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      {m.imageUrl ? (
                        <div className="w-9 h-9 rounded-lg bg-slate-100 relative overflow-hidden border border-slate-200 shrink-0">
                          <Image src={m.imageUrl} alt={m.modelName} fill className="object-contain p-0.5" />
                        </div>
                      ) : (
                        <div className="w-9 h-9 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center shrink-0 text-slate-400">
                          <Smartphone className="w-4 h-4" />
                        </div>
                      )}

                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-bold text-emerald-600 uppercase">{m.brand}</span>
                          <span className="text-sm font-bold text-slate-900 dark:text-white truncate">{m.modelName}</span>
                        </div>
                        <div className="text-xs text-slate-500 dark:text-slate-400">
                          {m.ram} / {m.storage} • {m.inStock ? "Stokta Var" : "3 Gün İçinde Teslim"}
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={() => {
                        handleAddFeaturedProduct(m);
                      }}
                      className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition flex items-center gap-1 shrink-0 ml-2"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Ekle</span>
                    </button>
                  </div>
                ))
              )}
            </div>

            <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex justify-end shrink-0">
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-slate-900 dark:bg-slate-800 text-white text-xs font-bold hover:bg-slate-800 transition"
              >
                Tamam
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Müşteri Vitrini Marka Sıralaması */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-sm space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center shrink-0">
              <ListOrdered className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-bold text-slate-900 text-lg">Müşteri Vitrini Marka Sıralaması</h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Müşteri sayfasında “Markalara Göz At” ve ürün listesinde görünecek marka sırası. “Tüm Markalar” her zaman 1. sıradadır.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto">
            <button
              onClick={handleResetBrandAlphabetical}
              disabled={loading || saving || brands.length <= 1}
              className="px-3 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:text-slate-900 border border-slate-200 hover:bg-slate-50 disabled:opacity-50 transition flex items-center gap-1.5"
              title="A'dan Z'ye Sırala"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Alfabetik Sırala</span>
            </button>

            <button
              onClick={handleSaveBrandOrder}
              disabled={loading || saving}
              className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition shadow-sm flex items-center gap-2 disabled:opacity-50"
            >
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Kaydediliyor...</span>
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  <span>Kaydet</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Notifications */}
        {successMessage && (
          <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{successMessage}</span>
          </div>
        )}

        {errorMessage && (
          <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-800 text-xs font-semibold flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Brand List */}
        {loading ? (
          <div className="space-y-2 py-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-12 bg-slate-100 rounded-xl animate-pulse" />
            ))}
          </div>
        ) : brands.length === 0 ? (
          <div className="text-center py-8 text-slate-500 text-sm bg-slate-50 rounded-xl border border-slate-200/60">
            Sistemde aktif tanımlı marka bulunamadı.
          </div>
        ) : (
          <div className="space-y-2">
            <div className="text-xs font-semibold text-slate-400 px-1 pb-1">
              Markaları sürükleyerek veya ↑ ↓ butonlarıyla istediğiniz pozisyona getirebilirsiniz.
            </div>

            {brands.map((brand, idx) => {
              const isFirst = idx === 0;
              const isLast = idx === brands.length - 1;
              const isDragging = draggedIndex === idx;

              return (
                <div
                  key={brand}
                  draggable
                  onDragStart={(e) => handleDragStart(e, idx)}
                  onDragOver={(e) => handleDragOver(e, idx)}
                  onDragEnd={handleDragEnd}
                  className={`flex items-center justify-between p-3 rounded-xl border transition-all ${
                    isDragging
                      ? "bg-purple-50 border-purple-300 shadow-md opacity-60 scale-[1.01]"
                      : "bg-white border-slate-200 hover:border-slate-300 hover:shadow-xs"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="cursor-grab active:cursor-grabbing p-1 text-slate-400 hover:text-slate-600 rounded">
                      <GripVertical className="w-4 h-4" />
                    </div>

                    <span className="w-7 h-7 rounded-lg bg-slate-100 text-slate-700 font-extrabold text-xs flex items-center justify-center border border-slate-200/80">
                      {idx + 1}
                    </span>

                    <span className="text-sm font-bold text-slate-900">{brand}</span>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => moveUp(idx)}
                      disabled={isFirst}
                      className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 disabled:opacity-30 disabled:hover:bg-transparent transition"
                      title="Yukarı Taşı"
                    >
                      <ArrowUp className="w-4 h-4" />
                    </button>

                    <button
                      onClick={() => moveDown(idx)}
                      disabled={isLast}
                      className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 disabled:opacity-30 disabled:hover:bg-transparent transition"
                      title="Aşağı Taşı"
                    >
                      <ArrowDown className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Müşteri Vitrini Ürün Sıralaması */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-sm space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
              <Package className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-bold text-slate-900 text-lg">Müşteri Vitrini Ürün Sıralaması</h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Müşteri sayfasında ana ürün listesinde görünecek varsayılan ürün sırası. Sürükle & Bırak veya butonlarla sıralayabilirsiniz.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto">
            <button
              onClick={handleResetProductAlphabetical}
              disabled={productLoading || productSaving || models.length <= 1}
              className="px-3 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:text-slate-900 border border-slate-200 hover:bg-slate-50 disabled:opacity-50 transition flex items-center gap-1.5"
              title="Marka ve Modele Göre Sırala"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Alfabetik Sırala</span>
            </button>

            <button
              onClick={handleSaveProductOrder}
              disabled={productLoading || productSaving}
              className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition shadow-sm flex items-center gap-2 disabled:opacity-50"
            >
              {productSaving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Kaydediliyor...</span>
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  <span>Kaydet</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Product Notifications */}
        {productSuccessMessage && (
          <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{productSuccessMessage}</span>
          </div>
        )}

        {productErrorMessage && (
          <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-800 text-xs font-semibold flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
            <span>{productErrorMessage}</span>
          </div>
        )}

        {/* Product List */}
        {productLoading ? (
          <div className="space-y-2 py-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="h-14 bg-slate-100 rounded-xl animate-pulse" />
            ))}
          </div>
        ) : models.length === 0 ? (
          <div className="text-center py-8 text-slate-500 text-sm bg-slate-50 rounded-xl border border-slate-200/60">
            Sistemde aktif tanımlı telefon modeli bulunamadı.
          </div>
        ) : (
          <div className="space-y-2">
            <div className="text-xs font-semibold text-slate-400 px-1 pb-1 flex justify-between items-center">
              <span>Ürünleri sürükleyerek veya ↑ ↓ butonlarıyla istediğiniz pozisyona getirebilirsiniz.</span>
              <span>Toplam {models.length} model</span>
            </div>

            {models.map((model, idx) => {
              const isFirst = idx === 0;
              const isLast = idx === models.length - 1;
              const isDragging = productDraggedIndex === idx;

              return (
                <div
                  key={model.id}
                  draggable
                  onDragStart={(e) => handleProductDragStart(e, idx)}
                  onDragOver={(e) => handleProductDragOver(e, idx)}
                  onDragEnd={handleProductDragEnd}
                  className={`flex items-center justify-between p-3 rounded-xl border transition-all ${
                    isDragging
                      ? "bg-blue-50 border-blue-300 shadow-md opacity-60 scale-[1.01]"
                      : "bg-white border-slate-200 hover:border-slate-300 hover:shadow-xs"
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="cursor-grab active:cursor-grabbing p-1 text-slate-400 hover:text-slate-600 rounded shrink-0">
                      <GripVertical className="w-4 h-4" />
                    </div>

                    <span className="w-7 h-7 rounded-lg bg-slate-100 text-slate-700 font-extrabold text-xs flex items-center justify-center border border-slate-200/80 shrink-0">
                      {idx + 1}
                    </span>

                    {model.imageUrl ? (
                      <div className="w-9 h-9 rounded-lg bg-slate-100 relative overflow-hidden border border-slate-200 shrink-0">
                        <Image
                          src={model.imageUrl}
                          alt={model.modelName}
                          fill
                          className="object-contain p-0.5"
                        />
                      </div>
                    ) : (
                      <div className="w-9 h-9 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center shrink-0 text-slate-400">
                        <Smartphone className="w-4 h-4" />
                      </div>
                    )}

                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-blue-600 uppercase">
                          {model.brand}
                        </span>
                        <span className="text-sm font-bold text-slate-900 truncate">
                          {model.modelName}
                        </span>
                      </div>
                      <div className="text-xs text-slate-500">
                        {model.ram} / {model.storage}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 shrink-0 ml-2">
                    <button
                      onClick={() => moveProductUp(idx)}
                      disabled={isFirst}
                      className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 disabled:opacity-30 disabled:hover:bg-transparent transition"
                      title="Yukarı Taşı"
                    >
                      <ArrowUp className="w-4 h-4" />
                    </button>

                    <button
                      onClick={() => moveProductDown(idx)}
                      disabled={isLast}
                      className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 disabled:opacity-30 disabled:hover:bg-transparent transition"
                      title="Aşağı Taşı"
                    >
                      <ArrowDown className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
