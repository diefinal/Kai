"use client";

import { useEffect, useState, useMemo } from "react";
import {
  Tag,
  Search,
  CheckCircle,
  RefreshCw,
  AlertCircle,
  Edit2,
  Boxes,
  RotateCcw,
  X,
  Smartphone,
  Check,
} from "lucide-react";
import { formatCurrency, parseColorList } from "@/lib/utils";

interface ColorPriceItem {
  id?: string;
  variantId: string;
  color: string;
  customerPrice: number;
}

interface PhoneModelVariantItem {
  id: string;
  phoneModelId: string;
  ram: string;
  storage: string;
  price: number;
  customerPrice?: number | null;
  isActive: boolean;
  colorPrices?: ColorPriceItem[];
}

interface PhoneModelItem {
  id: string;
  brand: string;
  modelName: string;
  ram: string;
  storage: string;
  color: string;
  description: string | null;
  imageUrl: string | null;
  basePrice: number;
  isActive: boolean;
  variants: PhoneModelVariantItem[];
  devices: {
    id: string;
    ram: string;
    storage: string;
    color: string;
    status: string;
    salePrice: number;
    variantId?: string | null;
  }[];
}

interface TableRowData {
  modelId: string;
  variantId: string;
  brand: string;
  modelName: string;
  ram: string;
  storage: string;
  color: string;
  internalSalePrice: number;
  effectivePrice: number;
  customerPrice: number | null;
  colorCustomerPrice: number | null;
  priceSource: "TRACKING_SALE_PRICE" | "VARIANT_CUSTOMER_PRICE" | "COLOR_CUSTOMER_PRICE";
  stockCount: number;
  imageUrl: string | null;
  modelColors: string[];
  variant: PhoneModelVariantItem;
  model: PhoneModelItem;
}

export default function MusteriFiyatlariPage() {
  const [models, setModels] = useState<PhoneModelItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters & Search
  const [search, setSearch] = useState("");
  const [brandFilter, setBrandFilter] = useState("ALL");
  const [ramFilter, setRamFilter] = useState("ALL");
  const [storageFilter, setStorageFilter] = useState("ALL");
  const [colorFilter, setColorFilter] = useState("");
  const [onlyInStock, setOnlyInStock] = useState(false);

  // Edit Modal State
  const [editingVariantData, setEditingVariantData] = useState<{
    model: PhoneModelItem;
    variant: PhoneModelVariantItem;
    targetColor?: string;
  } | null>(null);

  const [formVariantCustomerPrice, setFormVariantCustomerPrice] = useState<string>("");
  const [formColorOverrides, setFormColorOverrides] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Load Customer Prices Data
  const fetchData = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/admin/customer-prices");
      const json = await res.json();
      if (json.success && Array.isArray(json.data)) {
        setModels(json.data);
      }
    } catch (err) {
      console.error("Müşteri fiyatları yüklenirken hata:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Compute Flattened Combination Table Rows
  const tableRows = useMemo(() => {
    const rows: TableRowData[] = [];

    models.forEach((m) => {
      const definedColors = parseColorList(m.color);
      const activeColors = definedColors.length > 0 ? definedColors : ["Siyah"];

      m.variants.forEach((v) => {
        // Stock count per color
        const inStockDevices = m.devices.filter(
          (d) =>
            d.status === "IN_STOCK" &&
            (d.variantId === v.id ||
              (d.ram.toLowerCase() === v.ram.toLowerCase() &&
                d.storage.toLowerCase() === v.storage.toLowerCase()))
        );

        const minDevicePrice =
          inStockDevices.length > 0
            ? Math.min(...inStockDevices.map((d) => Number(d.salePrice)).filter((p) => p > 0))
            : 0;

        const internalSalePrice =
          minDevicePrice > 0
            ? minDevicePrice
            : Number(v.price) > 0
            ? Number(v.price)
            : Number(m.basePrice) > 0
            ? Number(m.basePrice)
            : 10000;

        const variantCustomerPriceVal =
          v.customerPrice != null && Number(v.customerPrice) > 0
            ? Number(v.customerPrice)
            : null;

        activeColors.forEach((colorName) => {
          const colorClean = colorName.trim();
          const colorMatch = v.colorPrices?.find(
            (cp) => cp.color.trim().toLowerCase() === colorClean.toLowerCase()
          );

          const colorCustomerPriceVal =
            colorMatch && Number(colorMatch.customerPrice) > 0
              ? Number(colorMatch.customerPrice)
              : null;

          let effectivePrice = internalSalePrice;
          let priceSource: "TRACKING_SALE_PRICE" | "VARIANT_CUSTOMER_PRICE" | "COLOR_CUSTOMER_PRICE" =
            "TRACKING_SALE_PRICE";

          if (colorCustomerPriceVal !== null) {
            effectivePrice = colorCustomerPriceVal;
            priceSource = "COLOR_CUSTOMER_PRICE";
          } else if (variantCustomerPriceVal !== null) {
            effectivePrice = variantCustomerPriceVal;
            priceSource = "VARIANT_CUSTOMER_PRICE";
          }

          const colorDevicesCount = inStockDevices.filter((d) =>
            d.color.toLowerCase().includes(colorClean.toLowerCase())
          ).length;

          rows.push({
            modelId: m.id,
            variantId: v.id,
            brand: m.brand,
            modelName: m.modelName,
            ram: v.ram,
            storage: v.storage,
            color: colorClean,
            internalSalePrice,
            effectivePrice,
            customerPrice: variantCustomerPriceVal,
            colorCustomerPrice: colorCustomerPriceVal,
            priceSource,
            stockCount: colorDevicesCount,
            imageUrl: m.imageUrl,
            modelColors: activeColors,
            variant: v,
            model: m,
          });
        });
      });
    });

    return rows;
  }, [models]);

  // Unique Brands for Filter
  const availableBrands = useMemo(() => {
    const brandSet = new Set<string>();
    models.forEach((m) => brandSet.add(m.brand));
    return Array.from(brandSet).sort();
  }, [models]);

  // Filtered Rows
  const filteredRows = useMemo(() => {
    return tableRows.filter((r) => {
      const matchBrand = brandFilter === "ALL" || r.brand === brandFilter;
      const matchRam = ramFilter === "ALL" || r.ram === ramFilter;
      const matchStorage = storageFilter === "ALL" || r.storage === storageFilter;
      const matchColor =
        !colorFilter || r.color.toLowerCase().includes(colorFilter.trim().toLowerCase());
      const matchStock = !onlyInStock || r.stockCount > 0;

      const q = search.trim().toLowerCase();
      const matchSearch =
        !q ||
        r.brand.toLowerCase().includes(q) ||
        r.modelName.toLowerCase().includes(q) ||
        r.color.toLowerCase().includes(q) ||
        r.ram.toLowerCase().includes(q) ||
        r.storage.toLowerCase().includes(q);

      return matchBrand && matchRam && matchStorage && matchColor && matchStock && matchSearch;
    });
  }, [tableRows, brandFilter, ramFilter, storageFilter, colorFilter, onlyInStock, search]);

  // Open Edit Modal for a Variant / Color
  const handleOpenEditModal = (row: TableRowData) => {
    setEditingVariantData({
      model: row.model,
      variant: row.variant,
      targetColor: row.color,
    });

    setFormVariantCustomerPrice(
      row.variant.customerPrice ? String(row.variant.customerPrice) : ""
    );

    const initialColorOverrides: Record<string, string> = {};
    row.modelColors.forEach((c) => {
      const match = row.variant.colorPrices?.find(
        (cp) => cp.color.trim().toLowerCase() === c.trim().toLowerCase()
      );
      initialColorOverrides[c] = match ? String(match.customerPrice) : "";
    });

    setFormColorOverrides(initialColorOverrides);
    setFormError(null);
    setFormSuccess(null);
  };

  // Save Customer Prices Handler
  const handleSavePrices = async (resetAll = false) => {
    if (!editingVariantData) return;
    setSaving(true);
    setFormError(null);
    setFormSuccess(null);

    try {
      const payload: {
        variantId: string;
        customerPrice?: number | null;
        colorOverrides?: { color: string; customerPrice: number | null }[];
        resetAll?: boolean;
      } = {
        variantId: editingVariantData.variant.id,
        resetAll,
      };

      if (!resetAll) {
        payload.customerPrice = formVariantCustomerPrice
          ? Number(formVariantCustomerPrice)
          : null;

        payload.colorOverrides = Object.entries(formColorOverrides).map(([color, val]) => ({
          color,
          customerPrice: val ? Number(val) : null,
        }));
      }

      const res = await fetch("/api/admin/customer-prices", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        setFormError(json.error || "Fiyat kaydedilirken hata oluştu.");
      } else {
        setFormSuccess(
          resetAll
            ? "Müşteri vitrin fiyatı sıfırlandı. İç satış fiyatı takip edilecek."
            : "Müşteri vitrin fiyatları başarıyla kaydedildi."
        );
        await fetchData();
        setTimeout(() => {
          setEditingVariantData(null);
        }, 600);
      }
    } catch (err: unknown) {
      setFormError(err instanceof Error ? err.message : "Bağlantı hatası oluştu.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 rounded-2xl bg-purple-100 text-purple-700">
              <Tag className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
                Müşteri Ekranı Fiyatları
              </h1>
              <p className="text-slate-500 text-sm mt-0.5">
                Müşteri vitrininde (teknoreha.com) gösterilecek fiyatları RAM, Hafıza ve Renk bazında bağımsız olarak yönetin.
              </p>
            </div>
          </div>
        </div>

        <button
          onClick={fetchData}
          disabled={loading}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl text-sm font-semibold transition shadow-xs disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          <span>Yenile</span>
        </button>
      </div>

      {/* Filter & Search Controls */}
      <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3">
          {/* Search */}
          <div className="lg:col-span-2 relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Marka, model veya renk ara..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900"
            />
          </div>

          {/* Marka Filter */}
          <div>
            <select
              value={brandFilter}
              onChange={(e) => setBrandFilter(e.target.value)}
              className="w-full py-2 px-3 rounded-xl border border-slate-300 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-slate-900"
            >
              <option value="ALL">Tüm Markalar</option>
              {availableBrands.map((b) => (
                <option key={b} value={b}>
                  {b}
                </option>
              ))}
            </select>
          </div>

          {/* RAM Filter */}
          <div>
            <select
              value={ramFilter}
              onChange={(e) => setRamFilter(e.target.value)}
              className="w-full py-2 px-3 rounded-xl border border-slate-300 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-slate-900"
            >
              <option value="ALL">Tüm RAM&apos;ler</option>
              <option value="4 GB">4 GB</option>
              <option value="6 GB">6 GB</option>
              <option value="8 GB">8 GB</option>
              <option value="12 GB">12 GB</option>
              <option value="16 GB">16 GB</option>
              <option value="24 GB">24 GB</option>
            </select>
          </div>

          {/* Hafıza Filter */}
          <div>
            <select
              value={storageFilter}
              onChange={(e) => setStorageFilter(e.target.value)}
              className="w-full py-2 px-3 rounded-xl border border-slate-300 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-slate-900"
            >
              <option value="ALL">Tüm Hafızalar</option>
              <option value="64 GB">64 GB</option>
              <option value="128 GB">128 GB</option>
              <option value="256 GB">256 GB</option>
              <option value="512 GB">512 GB</option>
              <option value="1 TB">1 TB</option>
            </select>
          </div>

          {/* Stok Filtresi */}
          <div className="flex items-center">
            <label className="inline-flex items-center gap-2 cursor-pointer select-none text-xs font-semibold text-slate-700">
              <input
                type="checkbox"
                checked={onlyInStock}
                onChange={(e) => setOnlyInStock(e.target.checked)}
                className="w-4 h-4 rounded border-slate-300 text-slate-900 focus:ring-slate-900"
              />
              <span>Yalnızca Stoktakiler</span>
            </label>
          </div>
        </div>

        <div className="flex items-center justify-between text-xs text-slate-500 pt-2 border-t border-slate-100">
          <span>Toplam {filteredRows.length} ürün kombinasyonu listeleniyor</span>
          <div className="flex items-center gap-3">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 font-medium">
              <span className="w-2 h-2 rounded-full bg-slate-400"></span>
              Satış Fiyatı Takip Eden
            </span>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-purple-50 text-purple-700 font-medium border border-purple-200">
              <span className="w-2 h-2 rounded-full bg-purple-500"></span>
              Varyant Fiyatı
            </span>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 font-medium border border-emerald-200">
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
              Renge Özel Fiyat
            </span>
          </div>
        </div>
      </div>

      {/* Main Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-slate-400 flex flex-col items-center gap-3">
            <RefreshCw className="w-8 h-8 animate-spin text-slate-400" />
            <span className="text-sm font-medium">Müşteri vitrin fiyatları yükleniyor...</span>
          </div>
        ) : filteredRows.length === 0 ? (
          <div className="p-12 text-center text-slate-400 space-y-2">
            <Tag className="w-10 h-10 mx-auto text-slate-300" />
            <p className="font-semibold text-slate-700">Hiç ürün bulunamadı.</p>
            <p className="text-xs text-slate-400">Filtre kriterlerinizi değiştirmeyi veya temizlemeyi deneyin.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  <th className="py-3.5 px-4">Marka & Model</th>
                  <th className="py-3.5 px-4">RAM / Hafıza</th>
                  <th className="py-3.5 px-4">Renk</th>
                  <th className="py-3.5 px-4">İç Satış Fiyatı</th>
                  <th className="py-3.5 px-4">Müşteri Ekranı Fiyatı</th>
                  <th className="py-3.5 px-4">Fiyat Kaynağı / Durum</th>
                  <th className="py-3.5 px-4">Stok</th>
                  <th className="py-3.5 px-4 text-right">İşlem</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {filteredRows.map((row, idx) => (
                  <tr key={`${row.variantId}-${row.color}-${idx}`} className="hover:bg-slate-50/60 transition">
                    {/* Marka & Model */}
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center overflow-hidden flex-shrink-0 border border-slate-200">
                          {row.imageUrl ? (
                            // eslint-disable-next-next/no-img-element
                            <img
                              src={row.imageUrl}
                              alt={`${row.brand} ${row.modelName}`}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <Smartphone className="w-5 h-5 text-slate-400" />
                          )}
                        </div>
                        <div>
                          <span className="font-bold text-slate-900 block leading-tight">
                            {row.brand} {row.modelName}
                          </span>
                        </div>
                      </div>
                    </td>

                    {/* RAM / Hafıza */}
                    <td className="py-3.5 px-4">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-slate-100 border border-slate-200 text-xs font-bold text-slate-800">
                        {row.ram} / {row.storage}
                      </span>
                    </td>

                    {/* Renk */}
                    <td className="py-3.5 px-4">
                      <span className="font-medium text-slate-800 text-xs">{row.color}</span>
                    </td>

                    {/* İç Satış Fiyatı */}
                    <td className="py-3.5 px-4 font-semibold text-slate-600 text-xs">
                      {formatCurrency(row.internalSalePrice)}
                    </td>

                    {/* Müşteri Ekranı Fiyatı */}
                    <td className="py-3.5 px-4">
                      <span className="font-extrabold text-slate-900 text-sm">
                        {formatCurrency(row.effectivePrice)}
                      </span>
                    </td>

                    {/* Fiyat Kaynağı / Rozet */}
                    <td className="py-3.5 px-4">
                      {row.priceSource === "COLOR_CUSTOMER_PRICE" ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          <Check className="w-3 h-3 text-emerald-600" />
                          Renge Özel Fiyat
                        </span>
                      ) : row.priceSource === "VARIANT_CUSTOMER_PRICE" ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-purple-50 text-purple-700 border border-purple-200">
                          Varyant Vitrin Fiyatı
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-600">
                          Satış Fiyatı Takip Ediyor
                        </span>
                      )}
                    </td>

                    {/* Stok */}
                    <td className="py-3.5 px-4">
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-xs font-semibold ${
                          row.stockCount > 0
                            ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                            : "bg-slate-100 text-slate-500"
                        }`}
                      >
                        <Boxes className="w-3 h-3" />
                        {row.stockCount > 0 ? `${row.stockCount} adet` : "0 Stok"}
                      </span>
                    </td>

                    {/* İşlem */}
                    <td className="py-3.5 px-4 text-right">
                      <button
                        onClick={() => handleOpenEditModal(row)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold transition shadow-xs"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                        <span>Fiyat Düzenle</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Edit Customer Price Modal */}
      {editingVariantData && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-xl w-full p-6 sm:p-8 shadow-2xl border border-slate-200 relative my-8 max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setEditingVariantData(null)}
              className="absolute top-6 right-6 p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 mb-2">
              <div className="p-2.5 rounded-2xl bg-purple-100 text-purple-700">
                <Tag className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-slate-900 tracking-tight">
                  {editingVariantData.model.brand} {editingVariantData.model.modelName}
                </h2>
                <p className="text-xs text-slate-500">
                  {editingVariantData.variant.ram} / {editingVariantData.variant.storage} Varyant Fiyat Yönetimi
                </p>
              </div>
            </div>

            {formError && (
              <div className="mt-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            {formSuccess && (
              <div className="mt-4 p-3 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-xl text-xs flex items-center gap-2">
                <CheckCircle className="w-4 h-4" />
                <span>{formSuccess}</span>
              </div>
            )}

            <div className="mt-6 space-y-6">
              {/* Internal Sale Price Banner */}
              <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 flex items-center justify-between text-xs">
                <div>
                  <span className="text-slate-500 block font-medium">Yönetim İç Satış Fiyatı</span>
                  <span className="text-xs text-slate-400">Kar/zarar ve muhasebede kullanılan fiyat</span>
                </div>
                <span className="text-sm font-extrabold text-slate-900">
                  {formatCurrency(Number(editingVariantData.variant.price))}
                </span>
              </div>

              {/* 1. Varyant Seviyesi Vitrin Fiyatı (Tüm Renkler İçin) */}
              <div className="p-4 rounded-2xl bg-purple-50/50 border border-purple-100 space-y-2">
                <label className="block text-xs font-bold text-purple-900 uppercase tracking-wider">
                  Varyant Vitrin Fiyatı (Tüm Renkler İçin Genel Fiyat)
                </label>
                <p className="text-[11px] text-purple-700">
                  Boş bırakılırsa İç Satış Fiyatını ({formatCurrency(Number(editingVariantData.variant.price))}) takip eder.
                </p>
                <input
                  type="number"
                  placeholder={`Örn: ${Number(editingVariantData.variant.price) + 1500}`}
                  value={formVariantCustomerPrice}
                  onChange={(e) => setFormVariantCustomerPrice(e.target.value)}
                  className="w-full py-2.5 px-3 rounded-xl border border-purple-200 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-purple-600 bg-white"
                />
              </div>

              {/* 2. Renge Özel Vitrin Fiyat Overrides */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                    Renge Özel Vitrin Fiyatı Overrides (Opsiyonel)
                  </span>
                  <span className="text-[11px] text-slate-400 font-medium">
                    Farklı renklere özel vitrin fiyatı verebilirsiniz
                  </span>
                </div>

                <div className="space-y-2.5">
                  {parseColorList(editingVariantData.model.color).map((cName) => (
                    <div
                      key={cName}
                      className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200 gap-3"
                    >
                      <span className="text-xs font-bold text-slate-800">{cName}</span>
                      <div className="w-44">
                        <input
                          type="number"
                          placeholder="Boş = Varyant Fiyatı"
                          value={formColorOverrides[cName] || ""}
                          onChange={(e) =>
                            setFormColorOverrides({
                              ...formColorOverrides,
                              [cName]: e.target.value,
                            })
                          }
                          className="w-full py-1.5 px-2.5 rounded-lg border border-slate-300 text-xs font-bold text-slate-900 bg-white focus:ring-2 focus:ring-slate-900"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-between pt-4 border-t border-slate-100 gap-3">
                <button
                  type="button"
                  onClick={() => handleSavePrices(true)}
                  disabled={saving}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200 text-xs font-bold transition disabled:opacity-50"
                  title="Tüm özel vitrin fiyatı override'larını kaldırıp iç satış fiyatını takip etmeye başlar."
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Satış Fiyatına Sıfırla</span>
                </button>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setEditingVariantData(null)}
                    className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 text-xs font-semibold transition"
                  >
                    İptal
                  </button>

                  <button
                    type="button"
                    onClick={() => handleSavePrices(false)}
                    disabled={saving}
                    className="inline-flex items-center gap-2 px-5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition shadow-sm disabled:opacity-50"
                  >
                    {saving ? (
                      <RefreshCw className="w-4 h-4 animate-spin" />
                    ) : (
                      <Check className="w-4 h-4" />
                    )}
                    <span>Fiyatları Kaydet</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
