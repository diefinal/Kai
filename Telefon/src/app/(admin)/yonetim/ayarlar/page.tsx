"use client";

import React, { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import {
  Database,
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
} from "lucide-react";
import { APP_CONFIG } from "@/lib/constants";

interface PhoneModelItem {
  id: string;
  brand: string;
  modelName: string;
  ram: string;
  storage: string;
  color?: string;
  imageUrl?: string | null;
  basePrice?: number;
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

  useEffect(() => {
    fetchBrandOrder();
    fetchProductOrder();
  }, [fetchBrandOrder, fetchProductOrder]);

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
              <div key={i} className="h-16 bg-slate-100 rounded-xl animate-pulse" />
            ))}
          </div>
        ) : models.length === 0 ? (
          <div className="text-center py-8 text-slate-500 text-sm bg-slate-50 rounded-xl border border-slate-200/60">
            Sistemde aktif tanımlı telefon modeli bulunamadı.
          </div>
        ) : (
          <div className="space-y-2 max-h-[600px] overflow-y-auto pr-1">
            <div className="text-xs font-semibold text-slate-400 px-1 pb-1">
              Ürünleri sürükleyerek veya ↑ ↓ butonlarıyla istediğiniz pozisyona getirebilirsiniz.
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

                    {/* Small Product Thumbnail */}
                    <div className="w-10 h-10 rounded-lg bg-slate-100 border border-slate-200/80 flex items-center justify-center overflow-hidden shrink-0 relative">
                      {model.imageUrl ? (
                        <Image
                          src={model.imageUrl}
                          alt={model.modelName}
                          fill
                          sizes="40px"
                          className="object-contain p-1"
                        />
                      ) : (
                        <Smartphone className="w-5 h-5 text-slate-400" />
                      )}
                    </div>

                    <div className="min-w-0 flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
                      <span className="px-2 py-0.5 rounded-md bg-purple-50 text-purple-700 text-[11px] font-bold border border-purple-200/60 shrink-0 self-start sm:self-auto">
                        {model.brand}
                      </span>
                      <span className="text-sm font-bold text-slate-900 truncate">
                        {model.modelName}
                      </span>
                      <span className="text-xs text-slate-500 font-medium">
                        ({model.ram} • {model.storage})
                      </span>
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

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Genel Bilgiler */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-sm space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <Smartphone className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-semibold text-slate-900">Uygulama Bilgileri</h2>
              <p className="text-xs text-slate-400">Temel sistem tanımları</p>
            </div>
          </div>
          <div className="space-y-3 pt-2 text-sm">
            <div className="flex justify-between py-2 border-b border-slate-100">
              <span className="text-slate-500">Uygulama Adı</span>
              <span className="font-medium text-slate-900">{APP_CONFIG.name}</span>
            </div>
            <div className="flex justify-between py-2 border-b border-slate-100">
              <span className="text-slate-500">Sürüm</span>
              <span className="font-medium text-slate-900">v0.1.0</span>
            </div>
          </div>
        </div>

        {/* Güvenlik & Veritabanı */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-sm space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-semibold text-slate-900">Altyapı & Güvenlik</h2>
              <p className="text-xs text-slate-400">Bağlantı ve oturum durumu</p>
            </div>
          </div>
          <div className="space-y-3 pt-2 text-sm">
            <div className="flex justify-between py-2 border-b border-slate-100">
              <span className="text-slate-500">Veritabanı Motoru</span>
              <span className="font-medium text-emerald-600 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                PostgreSQL (Supabase)
              </span>
            </div>
            <div className="flex justify-between py-2 border-b border-slate-100">
              <span className="text-slate-500">Oturum Koruması</span>
              <span className="font-medium text-slate-900">JWT (Jose / HS256)</span>
            </div>
            <div className="flex justify-between py-2">
              <span className="text-slate-500">Şifreleme Standardı</span>
              <span className="font-medium text-slate-900">Bcrypt (10 Salt Round)</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
