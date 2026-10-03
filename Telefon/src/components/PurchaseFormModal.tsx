"use client";

import { useEffect, useState, useMemo } from "react";
import {
  X,
  Plus,
  AlertCircle,
  CheckCircle,
  Calendar,
} from "lucide-react";
import { formatCurrency, parseColorList } from "@/lib/utils";
import { isValidIMEI } from "@/lib/validations";

interface StockModelItem {
  id: string;
  brand: string;
  modelName: string;
  ram: string;
  storage: string;
  color: string;
  basePrice: number;
}

interface CariItem {
  id: string;
  name: string;
  phone: string | null;
  type: string;
}

interface PurchaseFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  preselectModelId?: string;
}

const RAM_OPTIONS = ["4 GB", "6 GB", "8 GB", "12 GB", "16 GB", "24 GB"];
const STORAGE_OPTIONS = ["32 GB", "64 GB", "128 GB", "256 GB", "512 GB", "1 TB"];
const DEFAULT_COLOR_PRESETS = [
  "Siyah",
  "Beyaz",
  "Mavi",
  "Kırmızı",
  "Yeşil",
  "Mor",
  "Turuncu",
  "Gri",
  "Altın",
  "Gümüş",
  "Pembe",
  "Bronz",
];

export function PurchaseFormModal({
  isOpen,
  onClose,
  onSuccess,
  preselectModelId,
}: PurchaseFormModalProps) {
  const [stocks, setStocks] = useState<StockModelItem[]>([]);
  const [cariler, setCariler] = useState<CariItem[]>([]);
  const [loading, setLoading] = useState(true);

  // New Stock / Purchase Form State
  const [selectedModelId, setSelectedModelId] = useState("");
  const [selectedSupplierId, setSelectedSupplierId] = useState("");
  const [purchaseDate, setPurchaseDate] = useState(
    () => new Date().toISOString().split("T")[0]
  );
  const [quantity, setQuantity] = useState<number>(1);
  const [unitPurchasePrice, setUnitPurchasePrice] = useState<string>("");
  const [unitSalePrice, setUnitSalePrice] = useState<string>("");
  const [stockNotes, setStockNotes] = useState<string>("");
  const [showImeiInputs, setShowImeiInputs] = useState<boolean>(false);
  const [imeiList, setImeiList] = useState<string[]>([""]);

  // Variant selectors
  const [selectedRam, setSelectedRam] = useState<string>("");
  const [selectedStorage, setSelectedStorage] = useState<string>("");
  const [selectedColor, setSelectedColor] = useState<string>("");

  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Quick Cari Form Modal State
  const [isQuickCariOpen, setIsQuickCariOpen] = useState(false);
  const [cariName, setCariName] = useState("");
  const [cariPhone, setCariPhone] = useState("");
  const [cariType, setCariType] = useState<"SUPPLIER" | "BOTH">("SUPPLIER");
  const [quickCariSubmitting, setQuickCariSubmitting] = useState(false);
  const [quickCariError, setQuickCariError] = useState<string | null>(null);

  // Lock body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isOpen]);

  // Fetch stocks & suppliers on mount/open
  useEffect(() => {
    if (!isOpen) return;

    async function loadInitialData() {
      try {
        setLoading(true);
        const [stockRes, cariRes] = await Promise.all([
          fetch("/api/admin/stocks"),
          fetch("/api/admin/cariler?type=SUPPLIER"),
        ]);

        const stockJson = await stockRes.json();
        const cariJson = await cariRes.json();

        let stockList: StockModelItem[] = [];
        let supplierList: CariItem[] = [];

        if (stockJson.success && Array.isArray(stockJson.data)) {
          stockList = stockJson.data;
          setStocks(stockList);
        }

        if (cariJson.success && Array.isArray(cariJson.data)) {
          supplierList = cariJson.data;
          setCariler(supplierList);
        }

        // Initialize defaults
        const defaultModelId =
          preselectModelId || (stockList.length > 0 ? stockList[0].id : "");
        setSelectedModelId(defaultModelId);
        setSelectedSupplierId(supplierList.length > 0 ? supplierList[0].id : "");
        setPurchaseDate(new Date().toISOString().split("T")[0]);

        const foundModel = stockList.find((s) => s.id === defaultModelId);
        if (foundModel) {
          setUnitSalePrice(String(foundModel.basePrice));
          setSelectedRam(foundModel.ram || "");
          setSelectedStorage(foundModel.storage || "");
          const parsedCols = parseColorList(foundModel.color);
          setSelectedColor(parsedCols[0] || "Siyah");
        } else {
          setUnitSalePrice("");
          setSelectedRam("");
          setSelectedStorage("");
          setSelectedColor("");
        }

        setQuantity(1);
        setUnitPurchasePrice("");
        setStockNotes("");
        setShowImeiInputs(false);
        setImeiList([""]);
        setFormError(null);
        setFormSuccess(null);
      } catch (err) {
        console.error("Modal verileri yüklenirken hata:", err);
      } finally {
        setLoading(false);
      }
    }

    loadInitialData();
  }, [isOpen, preselectModelId]);

  // Unique base models for the dropdown (deduplicated by brand+modelName)
  const uniqueBaseModels = useMemo(() => {
    const seen = new Map<string, StockModelItem>();
    for (const s of stocks) {
      const key = `${s.brand}|||${s.modelName}`;
      if (!seen.has(key)) {
        seen.set(key, s);
      }
    }
    return Array.from(seen.values());
  }, [stocks]);

  const selectedModelObj = useMemo(() => {
    return stocks.find((s) => s.id === selectedModelId);
  }, [stocks, selectedModelId]);

  // Color options: PhoneModel colors parsed into single color choices + default presets deduplicated
  const availableColorOptions = useMemo(() => {
    const colorMap = new Map<string, string>();

    // Add model colors from all matching models
    if (selectedModelObj) {
      stocks
        .filter(
          (s) =>
            s.brand === selectedModelObj.brand &&
            s.modelName === selectedModelObj.modelName
        )
        .forEach((s) => {
          if (s.color && s.color.trim()) {
            const parsed = parseColorList(s.color);
            parsed.forEach((c) => {
              colorMap.set(c.toLowerCase(), c);
            });
          }
        });
    }

    // Add default presets
    DEFAULT_COLOR_PRESETS.forEach((c) => {
      if (!colorMap.has(c.toLowerCase())) {
        colorMap.set(c.toLowerCase(), c);
      }
    });

    return Array.from(colorMap.values());
  }, [stocks, selectedModelObj]);

  const handleModelChange = (modelId: string) => {
    setSelectedModelId(modelId);
    const foundModel = stocks.find((s) => s.id === modelId);
    if (foundModel) {
      setUnitSalePrice(String(foundModel.basePrice));
      if (foundModel.ram) setSelectedRam(foundModel.ram);
      if (foundModel.storage) setSelectedStorage(foundModel.storage);
      if (foundModel.color) {
        const parsedCols = parseColorList(foundModel.color);
        setSelectedColor(parsedCols[0] || "Siyah");
      }
    }
  };

  const handleQuantityChange = (val: number) => {
    const qty = Math.max(1, isNaN(val) ? 1 : val);
    setQuantity(qty);
    setImeiList((prev) => {
      const next = [...prev];
      if (next.length < qty) {
        while (next.length < qty) next.push("");
      } else if (next.length > qty) {
        next.splice(qty);
      }
      return next;
    });
  };

  const handleSubmitStock = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setFormSuccess(null);

    if (!selectedModelId) {
      setFormError("Lütfen bir telefon modeli seçiniz.");
      return;
    }
    if (!selectedSupplierId) {
      setFormError("Lütfen bir tedarikçi/cari seçiniz.");
      return;
    }

    const qty = Number(quantity);
    if (!qty || qty < 1) {
      setFormError("Adet en az 1 olmalıdır.");
      return;
    }

    const pPrice = Number(unitPurchasePrice);
    if (isNaN(pPrice) || pPrice <= 0 || unitPurchasePrice === "") {
      setFormError(
        "Lütfen geçerli bir birim alış fiyatı giriniz (0'dan büyük olmalıdır)."
      );
      return;
    }

    const sPrice = Number(unitSalePrice);
    if (isNaN(sPrice) || sPrice < 0 || unitSalePrice === "") {
      setFormError("Lütfen geçerli bir hedef satış fiyatı giriniz.");
      return;
    }

    if (!selectedRam) {
      setFormError("Lütfen RAM seçiniz.");
      return;
    }
    if (!selectedStorage) {
      setFormError("Lütfen hafıza seçiniz.");
      return;
    }
    if (!selectedColor || !selectedColor.trim()) {
      setFormError("Lütfen renk bilgisi seçiniz veya yazınız.");
      return;
    }

    // IMEI Validations
    const seenIMEIs = new Set<string>();
    const cleanedImeis: Array<string | null> = [];

    for (let i = 0; i < qty; i++) {
      const rawImei = imeiList[i]?.trim() || "";
      if (rawImei !== "") {
        if (!isValidIMEI(rawImei)) {
          setFormError(
            `${i + 1}. sıradaki IMEI (${rawImei}) geçersizdir. IMEI 14-16 haneli alfanümerik olmalıdır.`
          );
          return;
        }
        if (seenIMEIs.has(rawImei)) {
          setFormError(
            `Listede aynı IMEI (${rawImei}) birden fazla kez yazılmış.`
          );
          return;
        }
        seenIMEIs.add(rawImei);
        cleanedImeis.push(rawImei);
      } else {
        cleanedImeis.push(null);
      }
    }

    setSubmitting(true);

    try {
      const res = await fetch("/api/admin/purchases", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          modelId: selectedModelId,
          supplierId: selectedSupplierId,
          purchaseDate,
          quantity: qty,
          unitPurchasePrice: pPrice,
          unitSalePrice: sPrice,
          ram: selectedRam,
          storage: selectedStorage,
          color: selectedColor.trim(),
          imeis: cleanedImeis,
          notes: stockNotes.trim() || null,
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        setFormError(json.error || "Alış girişi yapılırken hata oluştu.");
      } else {
        setFormSuccess(json.message || "Alış girişi başarıyla kaydedildi.");
        setTimeout(() => {
          onSuccess();
        }, 600);
      }
    } catch {
      setFormError("Sunucu ile bağlantı hatası oluştu.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleQuickCariSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setQuickCariError(null);

    if (!cariName.trim()) {
      setQuickCariError("Lütfen cari adını giriniz.");
      return;
    }

    setQuickCariSubmitting(true);
    try {
      const res = await fetch("/api/admin/cariler", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: cariName.trim(),
          phone: cariPhone.trim() || null,
          type: cariType,
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        setQuickCariError(json.error || "Cari kaydedilemedi.");
      } else {
        setCariler((prev) => [...prev, json.data]);
        setSelectedSupplierId(json.data.id);
        setCariName("");
        setCariPhone("");
        setIsQuickCariOpen(false);
      }
    } catch {
      setQuickCariError("Sunucu ile bağlantı kurulamadı.");
    } finally {
      setQuickCariSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-start sm:items-center justify-center p-2 sm:p-4 overflow-hidden">
      <div className="bg-white rounded-2xl sm:rounded-3xl max-w-2xl w-full shadow-2xl border border-slate-200 flex flex-col max-h-[95dvh] sm:max-h-[90vh] overflow-hidden my-auto">
        <div className="px-5 py-4 sm:px-7 sm:py-5 border-b border-slate-100 flex items-center justify-between bg-white shrink-0">
          <div>
            <h2 className="text-lg sm:text-xl font-bold text-slate-900 leading-tight">
              Yeni Alış Yap / Stok Girişi
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Tedarikçiden alınan ürün bilgileri, alış/satış fiyatı ve stok adetini belirleyin.
            </p>
          </div>
          <button
            onClick={onClose}
            type="button"
            className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-4 custom-scrollbar">

        {loading ? (
          <div className="py-12 text-center text-slate-400 text-sm">
            Form hazırlanıyor...
          </div>
        ) : (
          <>
            {formError && (
              <div className="mt-4 p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2.5">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            {formSuccess && (
              <div className="mt-4 p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs flex items-center gap-2.5">
                <CheckCircle className="w-4 h-4 flex-shrink-0" />
                <span>{formSuccess}</span>
              </div>
            )}

            <form onSubmit={handleSubmitStock} className="mt-5 space-y-4">
              {/* Model Seçimi */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                  Telefon Modeli Seçin *
                </label>
                <select
                  value={selectedModelId}
                  onChange={(e) => handleModelChange(e.target.value)}
                  required
                  className="w-full py-2.5 px-3 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900 font-medium"
                >
                  <option value="">-- Bir Telefon Modeli Seçiniz --</option>
                  {uniqueBaseModels.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.brand} {s.modelName} (Varsayılan:{" "}
                      {formatCurrency(s.basePrice)})
                    </option>
                  ))}
                </select>
              </div>

              {/* RAM / Hafıza / Renk Bağımsız Seçimi */}
              {selectedModelObj && (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                      RAM *
                    </label>
                    <select
                      value={selectedRam}
                      onChange={(e) => setSelectedRam(e.target.value)}
                      required
                      className="w-full py-2.5 px-3 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900"
                    >
                      <option value="">-- RAM Seçin --</option>
                      {RAM_OPTIONS.map((r) => (
                        <option key={r} value={r}>
                          {r}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                      Hafıza *
                    </label>
                    <select
                      value={selectedStorage}
                      onChange={(e) => setSelectedStorage(e.target.value)}
                      required
                      className="w-full py-2.5 px-3 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900"
                    >
                      <option value="">-- Hafıza Seçin --</option>
                      {STORAGE_OPTIONS.map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                      Renk *
                    </label>
                    <div className="flex flex-col gap-1.5">
                      <select
                        value={
                          availableColorOptions.includes(selectedColor)
                            ? selectedColor
                            : "CUSTOM"
                        }
                        onChange={(e) => {
                          if (e.target.value !== "CUSTOM") {
                            setSelectedColor(e.target.value);
                          }
                        }}
                        className="w-full py-2.5 px-3 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900"
                      >
                        <option value="">-- Renk Seçin --</option>
                        {availableColorOptions.map((c) => (
                          <option key={c} value={c}>
                            {c}
                          </option>
                        ))}
                        <option value="CUSTOM">Özel Renk Yaz...</option>
                      </select>
                      <input
                        type="text"
                        placeholder="Örn: Titanyum Çöl, Gece Yarısı"
                        value={selectedColor}
                        onChange={(e) => setSelectedColor(e.target.value)}
                        required
                        className="w-full py-2 px-3 rounded-xl border border-slate-300 text-xs focus:outline-none focus:ring-2 focus:ring-slate-900 bg-slate-50/50"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Tedarikçi Seçimi & Hızlı Cari Ekle */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">
                      Tedarikçi / Cari *
                    </label>
                    <button
                      type="button"
                      onClick={() => setIsQuickCariOpen(true)}
                      className="text-xs font-semibold text-emerald-600 hover:underline flex items-center gap-1"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>+ Cari Ekle</span>
                    </button>
                  </div>
                  <select
                    value={selectedSupplierId}
                    onChange={(e) => setSelectedSupplierId(e.target.value)}
                    required
                    className="w-full py-2.5 px-3 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900"
                  >
                    <option value="">-- Tedarikçi Seçiniz --</option>
                    {cariler.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} {c.phone ? `(${c.phone})` : ""}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Alış Tarihi */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                    Alış Tarihi *
                  </label>
                  <div className="relative">
                    <Calendar className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="date"
                      required
                      value={purchaseDate}
                      onChange={(e) => setPurchaseDate(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900"
                    />
                  </div>
                </div>
              </div>

              {/* Adet, Birim Alış ve Hedef Satış Fiyatı */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                    Adet *
                  </label>
                  <input
                    type="number"
                    min="1"
                    step="1"
                    required
                    placeholder="1"
                    value={quantity}
                    onChange={(e) =>
                      handleQuantityChange(parseInt(e.target.value, 10))
                    }
                    className="w-full py-2.5 px-3 rounded-xl border border-slate-300 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-slate-900"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                    Birim Alış Fiyatı (TL) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    placeholder="70000"
                    value={unitPurchasePrice}
                    onChange={(e) => setUnitPurchasePrice(e.target.value)}
                    className="w-full py-2.5 px-3 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                    Hedef Satış Fiyatı (TL) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    placeholder="80000"
                    value={unitSalePrice}
                    onChange={(e) => setUnitSalePrice(e.target.value)}
                    className="w-full py-2.5 px-3 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900"
                  />
                </div>
              </div>

              {/* Toplam Maliyet & Finansal Özet Banner */}
              {unitPurchasePrice && Number(unitPurchasePrice) > 0 && (
                <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-xs flex items-center justify-between">
                  <span className="text-emerald-800 font-medium">
                    Toplam Alış Tutarı ({quantity} Adet ×{" "}
                    {formatCurrency(Number(unitPurchasePrice))}):
                  </span>
                  <span className="text-emerald-950 font-bold text-sm">
                    {formatCurrency(quantity * Number(unitPurchasePrice))}
                  </span>
                </div>
              )}

              {/* Opsiyonel IMEI Alanı */}
              <div className="pt-2 border-t border-slate-100">
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
                    IMEI Numaraları (İsteğe Bağlı)
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowImeiInputs((prev) => !prev)}
                    className="text-xs font-semibold text-slate-600 hover:text-slate-900 underline"
                  >
                    {showImeiInputs
                      ? "IMEI Alanlarını Gizle"
                      : "IMEI Gir / Düzenle"}
                  </button>
                </div>

                {showImeiInputs && (
                  <div className="space-y-2 max-h-40 overflow-y-auto p-2 rounded-xl bg-slate-50 border border-slate-200">
                    <p className="text-[11px] text-slate-500 mb-1">
                      Her cihaz için opsiyonel 15 haneli IMEI numarasını yazabilirsiniz. Boş bırakılabilir.
                    </p>
                    {Array.from({ length: quantity }).map((_, idx) => (
                      <div key={idx} className="flex items-center gap-2">
                        <span className="text-xs font-mono text-slate-400 w-6">
                          #{idx + 1}
                        </span>
                        <input
                          type="text"
                          maxLength={16}
                          placeholder={`Cihaz ${idx + 1} IMEI (Opsiyonel)`}
                          value={imeiList[idx] || ""}
                          onChange={(e) => {
                            const val = e.target.value;
                            setImeiList((prev) => {
                              const next = [...prev];
                              next[idx] = val;
                              return next;
                            });
                          }}
                          className="flex-1 py-1.5 px-3 rounded-lg border border-slate-300 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-slate-900 bg-white"
                        />
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Notlar */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                  Notlar (İsteğe Bağlı)
                </label>
                <input
                  type="text"
                  placeholder="Kutu faturası, seri no, garanti notu vb..."
                  value={stockNotes}
                  onChange={(e) => setStockNotes(e.target.value)}
                  className="w-full py-2 px-3 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900"
                />
              </div>

              {/* Action Buttons */}
              <div className="pt-4 flex gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="w-1/2 py-3 px-4 rounded-xl border border-slate-300 text-slate-700 text-sm font-semibold hover:bg-slate-50 transition"
                >
                  İptal
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="w-1/2 py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold transition shadow-sm disabled:opacity-50"
                >
                  {submitting ? "Kaydediliyor..." : "Alış Kaydını Tamamla"}
                </button>
              </div>
            </form>
          </>
        )}
        </div>
      </div>

      {/* Quick Cari Form Modal */}
      {isQuickCariOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-bold text-slate-900">Hızlı Tedarikçi / Cari Ekle</h3>
              <button
                onClick={() => setIsQuickCariOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {quickCariError && (
              <div className="mt-3 p-2.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{quickCariError}</span>
              </div>
            )}

            <form onSubmit={handleQuickCariSubmit} className="mt-4 space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Cari Unvanı / Adı Soyadı *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Örn: Genpa İletişim A.Ş., Ahmet Yılmaz"
                  value={cariName}
                  onChange={(e) => setCariName(e.target.value)}
                  className="w-full py-2 px-3 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Telefon Numarası (İsteğe Bağlı)
                </label>
                <input
                  type="text"
                  placeholder="05xx xxx xx xx"
                  value={cariPhone}
                  onChange={(e) => setCariPhone(e.target.value)}
                  className="w-full py-2 px-3 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Cari Tipi
                </label>
                <select
                  value={cariType}
                  onChange={(e) =>
                    setCariType(e.target.value as "SUPPLIER" | "BOTH")
                  }
                  className="w-full py-2 px-3 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900"
                >
                  <option value="SUPPLIER">Sadece Tedarikçi (Satıcı)</option>
                  <option value="BOTH">Hem Tedarikçi Hem Müşteri (Hibrit)</option>
                </select>
              </div>

              <div className="pt-3 flex gap-2">
                <button
                  type="button"
                  onClick={() => setIsQuickCariOpen(false)}
                  className="w-1/2 py-2 rounded-xl border border-slate-300 text-slate-700 text-xs font-semibold hover:bg-slate-50"
                >
                  İptal
                </button>
                <button
                  type="submit"
                  disabled={quickCariSubmitting}
                  className="w-1/2 py-2 rounded-xl bg-slate-900 text-white text-xs font-semibold hover:bg-slate-800 disabled:opacity-50"
                >
                  {quickCariSubmitting ? "Kaydediliyor..." : "Cariyi Kaydet"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
