"use client";

import { useEffect, useState, useMemo, useRef } from "react";
import {
  Smartphone,
  Plus,
  Search,
  CheckCircle,
  XCircle,
  Edit2,
  Boxes,
  X,
  UploadCloud,
  Trash2,
  RefreshCw,
  AlertCircle,
  Cpu,
  Layers,
} from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { BrandCombobox } from "@/components/BrandCombobox";
import { NormalizedPhoneSpecs } from "@/types";
import { AdminSpecsPreviewModal, SpecsPreviewData } from "@/components/AdminSpecsPreviewModal";
import { AdminManualSpecsModal } from "@/components/AdminManualSpecsModal";

interface PhoneModelVariantItem {
  id?: string;
  phoneModelId?: string;
  ram: string;
  storage: string;
  price: number;
  customerPrice?: number | null;
  isActive: boolean;
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
  colorImages?: Record<string, string> | null;
  specs?: NormalizedPhoneSpecs | null;
  basePrice: number;
  isActive: boolean;
  inStockCount: number;
  reservedCount: number;
  soldCount: number;
  totalDeviceCount: number;
  variants?: PhoneModelVariantItem[];
}

const BRAND_PRESETS = ["Apple", "Samsung", "Xiaomi", "Infinix", "Huawei", "Google", "OnePlus"];
const RAM_PRESETS = ["4 GB", "6 GB", "8 GB", "12 GB", "16 GB", "24 GB"];
const STORAGE_PRESETS = ["64 GB", "128 GB", "256 GB", "512 GB", "1 TB"];
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];

export default function TelefonlarPage() {
  const [models, setModels] = useState<PhoneModelItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [brandFilter, setBrandFilter] = useState("ALL");
  const [activeFilter, setActiveFilter] = useState("ALL"); // ALL, ACTIVE, PASSIVE

  // Modal State
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingModel, setEditingModel] = useState<PhoneModelItem | null>(null);

  // Form State
  const [formData, setFormData] = useState<{
    brand: string;
    modelName: string;
    color: string;
    description: string;
    isActive: boolean;
    specs: NormalizedPhoneSpecs | null;
    variants: PhoneModelVariantItem[];
  }>({
    brand: "Apple",
    modelName: "",
    color: "Siyah",
    description: "",
    isActive: true,
    specs: null,
    variants: [],
  });

  // Variant Add/Edit Sub-state inside Form
  const [newRam, setNewRam] = useState("8 GB");
  const [newStorage, setNewStorage] = useState("256 GB");
  const [newPrice, setNewPrice] = useState("");
  const [newCustomerPrice, setNewCustomerPrice] = useState("");
  const [editingVariantIndex, setEditingVariantIndex] = useState<number | null>(null);

  // Delete Confirm Modal State (Product & Variant)
  const [deleteProductConfirm, setDeleteProductConfirm] = useState<PhoneModelItem | null>(null);
  const [deleteVariantConfirm, setDeleteVariantConfirm] = useState<{
    model: PhoneModelItem | null;
    variant: PhoneModelVariantItem;
    index: number;
  } | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Specs Search, Preview & Manual Edit State
  const [searchingSpecs, setSearchingSpecs] = useState(false);
  const [isSpecsPreviewOpen, setIsSpecsPreviewOpen] = useState(false);
  const [isManualSpecsOpen, setIsManualSpecsOpen] = useState(false);
  const [specsPreviewData, setSpecsPreviewData] = useState<SpecsPreviewData | null>(null);

  // Epey / MobileAPI Specs Search Handler
  const handleSearchSpecs = async () => {
    if (!formData.modelName.trim()) {
      setFormError("Lütfen teknik özellikleri aramak için önce Model Adı giriniz.");
      return;
    }
    setSearchingSpecs(true);
    setFormError(null);
    setFormSuccess(null);
    try {
      const res = await fetch(
        `/api/admin/models/specs-search?brand=${encodeURIComponent(formData.brand)}&modelName=${encodeURIComponent(formData.modelName)}`
      );
      const json = await res.json();
      if (json.success && json.data) {
        setSpecsPreviewData(json.data);
        setIsSpecsPreviewOpen(true);
      } else {
        setFormError(json.error || `"${formData.brand} ${formData.modelName}" için teknik özellik sonucu bulunamadı.`);
      }
    } catch {
      setFormError("Teknik özellik aranırken sunucu ile bağlantı kurulamadı.");
    } finally {
      setSearchingSpecs(false);
    }
  };

  const handleConfirmSpecs = (specs: NormalizedPhoneSpecs) => {
    setFormData((prev) => ({ ...prev, specs }));
    setIsSpecsPreviewOpen(false);
    setFormSuccess("MobileAPI.dev teknik özellikleri başarıyla aktarıldı.");
  };

  const handleSaveManualSpecs = (specs: NormalizedPhoneSpecs) => {
    setFormData((prev) => ({ ...prev, specs }));
    setIsManualSpecsOpen(false);
    setFormSuccess("Teknik özellikler başarıyla kaydedildi (Kaynak: Manuel).");
  };

  // Image Upload State
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [removeImage, setRemoveImage] = useState(false);
  const [colorImagesMap, setColorImagesMap] = useState<Record<string, string>>({});

  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitStatusText, setSubmitStatusText] = useState<string>("");

  // Load Models
  const fetchModels = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/admin/models");
      const json = await res.json();
      if (json.success && Array.isArray(json.data)) {
        setModels(json.data);
      }
    } catch (err) {
      console.error("Modeller yüklenirken hata:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchModels();
  }, []);

  // Filtered List
  const filteredModels = useMemo(() => {
    return models.filter((m) => {
      const matchBrand = brandFilter === "ALL" || m.brand === brandFilter;
      const matchActive =
        activeFilter === "ALL" ||
        (activeFilter === "ACTIVE" && m.isActive) ||
        (activeFilter === "PASSIVE" && !m.isActive);

      const q = search.toLowerCase();
      const matchSearch =
        !search ||
        m.brand.toLowerCase().includes(q) ||
        m.modelName.toLowerCase().includes(q) ||
        m.color.toLowerCase().includes(q) ||
        m.variants?.some((v) => v.ram.toLowerCase().includes(q) || v.storage.toLowerCase().includes(q));

      return matchBrand && matchActive && matchSearch;
    });
  }, [models, brandFilter, activeFilter, search]);

  const allAvailableBrands = useMemo(() => {
    const brandMap = new Map<string, string>();
    BRAND_PRESETS.forEach((b) => {
      brandMap.set(b.toLowerCase(), b);
    });
    models.forEach((m) => {
      if (m.brand && m.brand.trim()) {
        const lower = m.brand.trim().toLowerCase();
        if (!brandMap.has(lower)) {
          brandMap.set(lower, m.brand.trim());
        }
      }
    });
    return Array.from(brandMap.values());
  }, [models]);

  const uniqueBrands = useMemo(() => {
    return ["ALL", ...allAvailableBrands];
  }, [allAvailableBrands]);

  // Open Add Modal
  const handleOpenAdd = () => {
    setEditingModel(null);
    setFormData({
      brand: "Apple",
      modelName: "",
      color: "Siyah,Beyaz",
      description: "",
      isActive: true,
      specs: null,
      variants: [
        { ram: "8 GB", storage: "256 GB", price: 54000, isActive: true },
      ],
    });
    setNewRam("8 GB");
    setNewStorage("256 GB");
    setNewPrice("");
    setNewCustomerPrice("");
    setEditingVariantIndex(null);
    setSelectedFile(null);
    setPreviewUrl(null);
    setRemoveImage(false);
    setColorImagesMap({});
    if (fileInputRef.current) fileInputRef.current.value = "";
    setFormError(null);
    setFormSuccess(null);
    setIsAddModalOpen(true);
  };

  // Open Edit Modal
  const handleOpenEdit = (model: PhoneModelItem) => {
    setEditingModel(model);
    const existingVariants = model.variants && model.variants.length > 0
      ? model.variants
      : [{ ram: model.ram || "8 GB", storage: model.storage || "256 GB", price: model.basePrice, isActive: true }];

    setFormData({
      brand: model.brand,
      modelName: model.modelName,
      color: model.color,
      description: model.description || "",
      isActive: model.isActive,
      specs: model.specs || null,
      variants: existingVariants,
    });
    setNewRam("8 GB");
    setNewStorage("256 GB");
    setNewPrice("");
    setNewCustomerPrice("");
    setEditingVariantIndex(null);
    setSelectedFile(null);
    setPreviewUrl(model.imageUrl || null);
    setRemoveImage(false);
    setColorImagesMap(model.colorImages || {});
    if (fileInputRef.current) fileInputRef.current.value = "";
    setFormError(null);
    setFormSuccess(null);
    setIsAddModalOpen(true);
  };

  // Add or Update Variant in Local Form State
  const handleAddOrUpdateVariant = () => {
    setFormError(null);
    const priceNum = Number(newPrice);
    if (isNaN(priceNum) || priceNum <= 0) {
      setFormError("Varyant için geçerli bir satış fiyatı giriniz (0'dan büyük olmalıdır).");
      return;
    }
    const custPriceNum = newCustomerPrice ? Number(newCustomerPrice) : null;
    if (custPriceNum !== null && (isNaN(custPriceNum) || custPriceNum < 0)) {
      setFormError("Müşteri Vitrin Fiyatı geçerli bir sayı olmalıdır.");
      return;
    }

    if (editingVariantIndex !== null) {
      // Update existing variant
      setFormData((prev) => {
        const next = [...prev.variants];
        next[editingVariantIndex] = {
          ...next[editingVariantIndex],
          ram: newRam,
          storage: newStorage,
          price: priceNum,
          customerPrice: custPriceNum && custPriceNum > 0 ? custPriceNum : null,
        };
        return { ...prev, variants: next };
      });
      setEditingVariantIndex(null);
    } else {
      // Check duplicate combination in local state
      const exists = formData.variants.some(
        (v) => v.ram.toLowerCase() === newRam.toLowerCase() && v.storage.toLowerCase() === newStorage.toLowerCase()
      );
      if (exists) {
        setFormError(`Bu RAM (${newRam}) ve Hafıza (${newStorage}) varyantı zaten listede ekli.`);
        return;
      }
      setFormData((prev) => ({
        ...prev,
        variants: [
          ...prev.variants,
          {
            ram: newRam,
            storage: newStorage,
            price: priceNum,
            customerPrice: custPriceNum && custPriceNum > 0 ? custPriceNum : null,
            isActive: true,
          },
        ],
      }));
    }

    setNewPrice("");
    setNewCustomerPrice("");
  };

  // Prepare editing a variant inline
  const handleEditVariantInline = (index: number) => {
    const target = formData.variants[index];
    if (!target) return;
    setEditingVariantIndex(index);
    setNewRam(target.ram);
    setNewStorage(target.storage);
    setNewPrice(String(target.price));
    setNewCustomerPrice(target.customerPrice ? String(target.customerPrice) : "");
  };

  // Prompt Variant Delete Confirmation Modal
  const handlePromptDeleteVariant = (variant: PhoneModelVariantItem, index: number) => {
    setDeleteVariantConfirm({
      model: editingModel,
      variant,
      index,
    });
  };

  // Confirm Variant Delete
  const handleConfirmDeleteVariant = async () => {
    if (!deleteVariantConfirm) return;
    const { model, variant, index } = deleteVariantConfirm;

    if (model?.id && variant.id) {
      // Delete via API
      setDeleting(true);
      try {
        const res = await fetch(`/api/admin/models/${model.id}?variantId=${variant.id}`, {
          method: "DELETE",
        });
        const json = await res.json();
        if (!res.ok || !json.success) {
          alert(json.error || "Varyant silinirken hata oluştu.");
        } else {
          if (json.isSoftDelete) {
            alert(json.message);
          }
          await fetchModels();
          // Remove from local form state
          setFormData((prev) => ({
            ...prev,
            variants: prev.variants.filter((_, idx) => idx !== index),
          }));
        }
      } catch (err) {
        console.error("Varyant silme hatası:", err);
        alert("Varyant silinirken sunucu hatası oluştu.");
      } finally {
        setDeleting(false);
        setDeleteVariantConfirm(null);
      }
    } else {
      // Local state remove (unsaved model/variant)
      setFormData((prev) => ({
        ...prev,
        variants: prev.variants.filter((_, idx) => idx !== index),
      }));
      setDeleteVariantConfirm(null);
    }
  };

  // Prompt Product Delete Confirmation Modal
  const handlePromptDeleteProduct = (model: PhoneModelItem) => {
    setDeleteProductConfirm(model);
  };

  // Confirm Product Delete
  const handleConfirmDeleteProduct = async () => {
    if (!deleteProductConfirm) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/admin/models/${deleteProductConfirm.id}`, {
        method: "DELETE",
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        alert(json.error || "Ürün silinirken hata oluştu.");
      } else {
        if (json.isSoftDelete) {
          alert(json.message);
        }
        await fetchModels();
      }
    } catch (err) {
      console.error("Ürün silme hatası:", err);
      alert("Ürün silinirken sunucu hatası oluştu.");
    } finally {
      setDeleting(false);
      setDeleteProductConfirm(null);
    }
  };

  // File Picker Handler
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!ALLOWED_TYPES.includes(file.type)) {
      setFormError("Geçersiz dosya formatı. Lütfen JPG, PNG veya WEBP formatında bir fotoğraf seçin.");
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    if (file.size > MAX_FILE_SIZE) {
      setFormError("Seçilen fotoğraf 5 MB'den büyüktür. Lütfen daha küçük bir dosya seçin.");
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    setFormError(null);
    setSelectedFile(file);
    setPreviewUrl(URL.createObjectURL(file));
    setRemoveImage(false);
  };

  // Remove Photo Handler
  const handleRemovePhoto = () => {
    setSelectedFile(null);
    setPreviewUrl(null);
    setRemoveImage(true);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  // Submit Add / Edit
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setFormSuccess(null);

    if (formData.variants.length === 0) {
      setFormError("Lütfen ürüne en az bir RAM / Hafıza / Fiyat varyantı ekleyiniz.");
      return;
    }

    if (!formData.color.trim()) {
      setFormError("Lütfen renk bilgisini giriniz.");
      return;
    }

    setSubmitting(true);
    let uploadedImageUrl: string | null = null;
    let uploadedImagePath: string | null = null;

    try {
      if (selectedFile) {
        setSubmitStatusText("Fotoğraf Storage'a yükleniyor...");
        const uploadData = new FormData();
        uploadData.append("file", selectedFile);

        const uploadRes = await fetch("/api/admin/upload", {
          method: "POST",
          body: uploadData,
        });

        const uploadJson = await uploadRes.json();
        if (!uploadRes.ok || !uploadJson.success) {
          setFormError(uploadJson.error || "Görsel yüklenemedi. Lütfen tekrar deneyin.");
          setSubmitting(false);
          setSubmitStatusText("");
          return;
        }

        uploadedImageUrl = uploadJson.data.url;
        uploadedImagePath = uploadJson.data.path;
      }

      let finalImageUrl: string | null = null;
      if (uploadedImageUrl) {
        finalImageUrl = uploadedImageUrl;
      } else if (removeImage) {
        finalImageUrl = null;
      } else if (editingModel) {
        finalImageUrl = editingModel.imageUrl;
      }

      setSubmitStatusText(editingModel ? "Model güncelleniyor..." : "Yeni model kaydediliyor...");
      const url = editingModel
        ? `/api/admin/models/${editingModel.id}`
        : "/api/admin/models";
      const method = editingModel ? "PUT" : "POST";

      const firstVar = formData.variants[0];

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          brand: formData.brand,
          modelName: formData.modelName,
          ram: firstVar.ram,
          storage: firstVar.storage,
          color: formData.color,
          basePrice: firstVar.price,
          description: formData.description,
          imageUrl: finalImageUrl,
          colorImages: colorImagesMap,
          specs: formData.specs,
          isActive: formData.isActive,
          variants: formData.variants,
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        if (uploadedImagePath || uploadedImageUrl) {
          fetch("/api/admin/upload", {
            method: "DELETE",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ path: uploadedImagePath || uploadedImageUrl }),
          }).catch((err) => console.warn("Orphan görsel temizleme uyarısı:", err));
        }

        setFormError(json.error || "İşlem sırasında hata oluştu.");
      } else {
        setFormSuccess(editingModel ? "Model başarıyla güncellendi." : "Yeni model başarıyla eklendi.");
        await fetchModels();
        setTimeout(() => {
          setIsAddModalOpen(false);
        }, 500);
      }
    } catch (err: unknown) {
      if (uploadedImagePath || uploadedImageUrl) {
        fetch("/api/admin/upload", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ path: uploadedImagePath || uploadedImageUrl }),
        }).catch((e) => console.warn("Orphan görsel temizleme uyarısı:", e));
      }
      setFormError(err instanceof Error ? err.message : "Sunucu ile bağlantı kurulamadı.");
    } finally {
      setSubmitting(false);
      setSubmitStatusText("");
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
            Ürünler
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            Sisteme kayıtlı ürünleri tanımlayın, RAM/Hafıza varyantlarını ve vitrin görsellerini yönetin.
          </p>
        </div>

        <button
          onClick={handleOpenAdd}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-sm font-semibold transition shadow-sm"
        >
          <Plus className="w-4 h-4" />
          <span>Yeni Ürün Ekle</span>
        </button>
      </div>

      {/* Filter / Search Bar */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm flex flex-col md:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
          <input
            type="text"
            placeholder="Model adı, marka, hafıza veya renk ara..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-slate-900"
          />
        </div>

        {/* Brand Filter */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 md:pb-0">
          {uniqueBrands.map((b) => (
            <button
              key={b}
              onClick={() => setBrandFilter(b)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition ${
                brandFilter === b
                  ? "bg-slate-900 text-white"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              {b === "ALL" ? "Tüm Markalar" : b}
            </button>
          ))}
        </div>

        {/* Active/Passive Filter */}
        <div className="flex items-center gap-1 border-l border-slate-200 pl-3">
          <button
            onClick={() => setActiveFilter("ALL")}
            className={`px-2.5 py-1.5 rounded-lg text-xs font-medium transition ${
              activeFilter === "ALL" ? "bg-slate-200 text-slate-900" : "text-slate-500 hover:text-slate-900"
            }`}
          >
            Tümü
          </button>
          <button
            onClick={() => setActiveFilter("ACTIVE")}
            className={`px-2.5 py-1.5 rounded-lg text-xs font-medium transition ${
              activeFilter === "ACTIVE" ? "bg-emerald-100 text-emerald-800 font-semibold" : "text-slate-500 hover:text-slate-900"
            }`}
          >
            Aktif
          </button>
          <button
            onClick={() => setActiveFilter("PASSIVE")}
            className={`px-2.5 py-1.5 rounded-lg text-xs font-medium transition ${
              activeFilter === "PASSIVE" ? "bg-slate-200 text-slate-800 font-semibold" : "text-slate-500 hover:text-slate-900"
            }`}
          >
            Pasif
          </button>
        </div>
      </div>

      {/* Models Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-slate-400 text-sm">Modeller yükleniyor...</div>
        ) : filteredModels.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <Smartphone className="w-10 h-10 text-slate-300 mx-auto" />
            <p className="text-slate-600 font-medium">Henüz kayıtlı ürün bulunamadı.</p>
            <p className="text-xs text-slate-400">
              Yeni bir ürün tanımlamak için &quot;+ Yeni Ürün Ekle&quot; butonuna tıklayabilirsiniz.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200 text-xs uppercase font-semibold text-slate-500 tracking-wider">
                  <th className="py-3.5 px-4">Görsel & Model Tanımı</th>
                  <th className="py-3.5 px-4">Varyantlar (RAM / Hafıza / Satış Fiyatı)</th>
                  <th className="py-3.5 px-4">Renkler</th>
                  <th className="py-3.5 px-4">Mevcut Stok</th>
                  <th className="py-3.5 px-4">Durum</th>
                  <th className="py-3.5 px-4 text-right">İşlemler</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredModels.map((m) => {
                  const displayVariants = m.variants && m.variants.length > 0
                    ? m.variants
                    : [{ ram: m.ram || "8 GB", storage: m.storage || "256 GB", price: m.basePrice, isActive: true }];

                  return (
                    <tr key={m.id} className="hover:bg-slate-50/60 transition">
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-11 h-11 rounded-xl bg-slate-100 border border-slate-200 overflow-hidden flex items-center justify-center flex-shrink-0 relative">
                            {m.imageUrl ? (
                              /* eslint-disable-next-line @next/next/no-img-element */
                              <img
                                src={m.imageUrl}
                                alt={`${m.brand} ${m.modelName}`}
                                className="w-full h-full object-cover"
                                onError={(e) => {
                                  (e.target as HTMLImageElement).style.display = "none";
                                }}
                              />
                            ) : (
                              <Smartphone className="w-5 h-5 text-slate-400" />
                            )}
                          </div>
                          <div>
                            <span className="font-semibold text-slate-900 block leading-tight">
                              {m.brand} {m.modelName}
                            </span>
                            {m.description && (
                              <span className="text-xs text-slate-400 line-clamp-1">
                                {m.description}
                              </span>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="flex flex-wrap gap-1.5">
                          {displayVariants.map((v, idx) => (
                            <div
                              key={v.id || idx}
                              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-slate-100 border border-slate-200 text-xs"
                            >
                              <span className="font-bold text-slate-800">
                                {v.ram} / {v.storage}
                              </span>
                              <span className="text-emerald-700 font-extrabold">
                                {formatCurrency(v.price)}
                              </span>
                            </div>
                          ))}
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-xs text-slate-600">
                        {m.color}
                      </td>
                      <td className="py-3.5 px-4">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${
                            m.inStockCount > 0
                              ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                              : "bg-amber-50 text-amber-700 border border-amber-200"
                          }`}
                        >
                          <Boxes className="w-3.5 h-3.5" />
                          {m.inStockCount > 0 ? `${m.inStockCount} adet stokta` : "Stok Yok"}
                        </span>
                      </td>
                      <td className="py-3.5 px-4">
                        {m.isActive ? (
                          <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-600">
                            <CheckCircle className="w-3.5 h-3.5" />
                            Aktif (Vitrinde)
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-xs font-medium text-slate-400">
                            <XCircle className="w-3.5 h-3.5" />
                            Pasif
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleOpenEdit(m)}
                            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 text-xs font-medium text-slate-700 transition"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                            <span>Düzenle</span>
                          </button>
                          <button
                            onClick={() => handlePromptDeleteProduct(m)}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-red-200 hover:bg-red-50 text-xs font-medium text-red-600 transition"
                            title="Ürünü Sil"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span>Sil</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add / Edit Model Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 sm:p-8 shadow-2xl border border-slate-200 relative my-8 max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setIsAddModalOpen(false)}
              className="absolute top-6 right-6 p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition"
            >
              <X className="w-5 h-5" />
            </button>

            <h2 className="text-xl font-bold text-slate-900 tracking-tight">
              {editingModel ? "Ürünü Düzenle" : "Yeni Ürün Ekle"}
            </h2>
            <p className="text-xs text-slate-500 mt-1 mb-6">
              Marka, ürün bilgileri, RAM/Hafıza/Fiyat varyantları ve görselleri yönetin.
            </p>

            {formError && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs flex items-start gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <span>{formError}</span>
              </div>
            )}

            {formSuccess && (
              <div className="mb-4 p-3 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-xl text-xs flex items-center gap-2">
                <CheckCircle className="w-4 h-4" />
                <span>{formSuccess}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Marka & Model Adı */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                    Marka *
                  </label>
                  <BrandCombobox
                    value={formData.brand}
                    onChange={(val) => setFormData({ ...formData, brand: val })}
                    availableBrands={allAvailableBrands}
                    required
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">
                      Model Adı *
                    </label>
                    <button
                      type="button"
                      onClick={handleSearchSpecs}
                      disabled={searchingSpecs || !formData.modelName.trim()}
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 transition disabled:opacity-50"
                    >
                      <Search className="w-3 h-3" />
                      <span>{searchingSpecs ? "Aranıyor..." : "Özellik Bul"}</span>
                    </button>
                  </div>
                  <input
                    type="text"
                    placeholder="Örn: 17, S26 Ultra"
                    required
                    value={formData.modelName}
                    onChange={(e) => setFormData({ ...formData, modelName: e.target.value })}
                    className="w-full py-2.5 px-3 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900"
                  />
                </div>
              </div>

              {/* Renk Bilgisi */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                  Mevcut Renkler (Virgül veya Bölü İle Ayırın) *
                </label>
                <input
                  type="text"
                  placeholder="Örn: Siyah, Beyaz, Mavi, Yeşil, Pembe"
                  required
                  value={formData.color}
                  onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                  className="w-full py-2.5 px-3 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900"
                />
              </div>

              {/* VARYANT YÖNETİM ALANI (RAM / HAFIZA / SATIŞ FİYATI / VITRİN FİYATI) */}
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-4">
                <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                  <div className="flex items-center gap-2">
                    <Layers className="w-4 h-4 text-emerald-600" />
                    <span className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                      RAM / Hafıza / Satış & Vitrin Fiyat Varyantları
                    </span>
                  </div>
                  <span className="text-xs text-slate-500 font-medium">
                    {formData.variants.length} Varyant Ekli
                  </span>
                </div>

                {/* Varyant Listesi Tablosu */}
                {formData.variants.length > 0 && (
                  <div className="space-y-2">
                    {formData.variants.map((v, idx) => (
                      <div
                        key={v.id || idx}
                        className="flex flex-wrap items-center justify-between p-3 rounded-xl bg-white border border-slate-200 shadow-xs gap-2"
                      >
                        <div className="flex items-center gap-2.5 flex-wrap">
                          <span className="w-6 h-6 rounded-full bg-slate-100 text-slate-700 text-xs font-bold flex items-center justify-center">
                            {idx + 1}
                          </span>
                          <span className="text-xs font-semibold text-slate-900">
                            {v.ram} RAM
                          </span>
                          <span className="text-slate-300">|</span>
                          <span className="text-xs font-semibold text-slate-700">
                            {v.storage} Hafıza
                          </span>
                          <span className="text-slate-300">|</span>
                          <span className="text-xs font-bold text-emerald-700" title="Yönetim/Finans Satış Fiyatı">
                            Satış: {formatCurrency(v.price)}
                          </span>
                          <span className="text-slate-300">|</span>
                          <span
                            className={`text-xs font-bold px-2 py-0.5 rounded ${
                              v.customerPrice
                                ? "bg-purple-50 text-purple-700 border border-purple-200"
                                : "bg-slate-100 text-slate-600"
                            }`}
                            title="Müşteri Vitrin Fiyatı"
                          >
                            Vitrin: {v.customerPrice ? formatCurrency(v.customerPrice) : `${formatCurrency(v.price)} (Varsayılan)`}
                          </span>
                        </div>

                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => handleEditVariantInline(idx)}
                            className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-600 transition text-xs font-medium flex items-center gap-1"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                            <span>Düzenle</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handlePromptDeleteVariant(v, idx)}
                            className="p-1.5 rounded-lg hover:bg-red-50 text-red-600 transition text-xs font-medium flex items-center gap-1"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span>Sil</span>
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Inline Varyant Ekleme / Düzenleme Alanı */}
                <div className="p-3 bg-white rounded-xl border border-slate-200 space-y-3">
                  <span className="text-xs font-bold text-slate-800 block">
                    {editingVariantIndex !== null ? "Varyantı Düzenle" : "+ Yeni Varyant Ekle"}
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 mb-1">RAM</label>
                      <select
                        value={newRam}
                        onChange={(e) => setNewRam(e.target.value)}
                        className="w-full py-2 px-3 rounded-lg border border-slate-300 text-xs font-medium"
                      >
                        {RAM_PRESETS.map((r) => (
                          <option key={r} value={r}>
                            {r}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 mb-1">Hafıza</label>
                      <select
                        value={newStorage}
                        onChange={(e) => setNewStorage(e.target.value)}
                        className="w-full py-2 px-3 rounded-lg border border-slate-300 text-xs font-medium"
                      >
                        {STORAGE_PRESETS.map((s) => (
                          <option key={s} value={s}>
                            {s}
                          </option>
                        ))}
                        <option value="32 GB">32 GB</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                        Satış Fiyatı (İç Finans) *
                      </label>
                      <input
                        type="number"
                        placeholder="54000"
                        value={newPrice}
                        onChange={(e) => setNewPrice(e.target.value)}
                        className="w-full py-2 px-3 rounded-lg border border-slate-300 text-xs font-medium"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                        Vitrin Fiyatı (Opsiyonel)
                      </label>
                      <input
                        type="number"
                        placeholder="Örn: 56000 (Boşsa Satış)"
                        value={newCustomerPrice}
                        onChange={(e) => setNewCustomerPrice(e.target.value)}
                        className="w-full py-2 px-3 rounded-lg border border-purple-200 bg-purple-50/40 text-xs font-medium focus:ring-2 focus:ring-purple-500"
                      />
                    </div>
                  </div>

                  <div className="flex justify-end gap-2 pt-1">
                    {editingVariantIndex !== null && (
                      <button
                        type="button"
                        onClick={() => {
                          setEditingVariantIndex(null);
                          setNewPrice("");
                          setNewCustomerPrice("");
                        }}
                        className="px-3 py-1.5 rounded-lg text-xs font-medium text-slate-600 hover:bg-slate-100"
                      >
                        İptal
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={handleAddOrUpdateVariant}
                      className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition shadow-xs"
                    >
                      {editingVariantIndex !== null ? "Varyantı Güncelle" : "+ Varyantı Listeye Ekle"}
                    </button>
                  </div>
                </div>
              </div>

              {/* Teknik Özellikler Yönetim Alanı */}
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Cpu className="w-4 h-4 text-emerald-600" />
                    <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                      Teknik Özellik Yönetimi
                    </span>
                    {formData.specs && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                        Kaynak: {formData.specs.source || "Manuel"}
                      </span>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                  <button
                    type="button"
                    onClick={handleSearchSpecs}
                    disabled={searchingSpecs || !formData.modelName.trim()}
                    className="flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl text-xs font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 transition disabled:opacity-50"
                  >
                    <Search className="w-4 h-4" />
                    <span>{searchingSpecs ? "MobileAPI'de Aranıyor..." : "🔍 Teknik Özellikleri Bul"}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setIsManualSpecsOpen(true)}
                    className="flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl text-xs font-bold text-slate-800 bg-white hover:bg-slate-100 border border-slate-300 transition shadow-xs"
                  >
                    <Edit2 className="w-4 h-4 text-slate-600" />
                    <span>✏️ Teknik Özellikleri Manuel Düzenle</span>
                  </button>
                </div>

                {formData.specs && (
                  <div className="p-3 bg-white rounded-xl border border-slate-200 text-xs space-y-1 text-slate-600">
                    <div className="flex items-center justify-between font-bold text-slate-900 border-b border-slate-100 pb-1">
                      <span>Kayıtlı Özellik Özet Bilgisi</span>
                      <span className="text-[10px] text-slate-400 font-normal">Güncelleme: {formData.specs.lastUpdated}</span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-3 gap-y-1 text-[11px] pt-1">
                      {formData.specs.displaySize && <div>• Ekran: <strong className="text-slate-800">{formData.specs.displaySize}</strong></div>}
                      {formData.specs.chipset && <div>• İşlemci: <strong className="text-slate-800">{formData.specs.chipset}</strong></div>}
                      {formData.specs.mainCamera && <div>• Arka Kamera: <strong className="text-slate-800">{formData.specs.mainCamera}</strong></div>}
                      {formData.specs.frontCamera && <div>• Ön Kamera: <strong className="text-slate-800">{formData.specs.frontCamera}</strong></div>}
                      {formData.specs.batteryCapacity && <div>• Batarya: <strong className="text-slate-800">{formData.specs.batteryCapacity}</strong></div>}
                      {formData.specs.operatingSystem && <div>• OS: <strong className="text-slate-800">{formData.specs.operatingSystem}</strong></div>}
                    </div>
                  </div>
                )}
              </div>

              {/* Görsel Yükleme Alanı (File Picker + Preview) */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                  Telefon Fotoğrafı
                </label>

                <input
                  type="file"
                  ref={fileInputRef}
                  accept="image/jpeg,image/png,image/webp"
                  onChange={handleFileChange}
                  className="hidden"
                />

                {previewUrl ? (
                  <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 flex flex-col sm:flex-row items-center gap-4">
                    <div className="w-24 h-24 bg-white rounded-xl border border-slate-200 p-1 flex items-center justify-center overflow-hidden flex-shrink-0 shadow-sm">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={previewUrl}
                        alt="Önizleme"
                        className="max-h-full max-w-full object-contain"
                      />
                    </div>

                    <div className="flex-1 text-center sm:text-left space-y-1">
                      <div className="text-xs font-semibold text-slate-900">
                        {selectedFile ? selectedFile.name : "Kayıtlı Model Fotoğrafı"}
                      </div>
                      <div className="text-[11px] text-slate-400">
                        {selectedFile
                          ? `${(selectedFile.size / (1024 * 1024)).toFixed(2)} MB`
                          : "Supabase Storage üzerinde kayıtlı"}
                      </div>
                      <div className="pt-2 flex items-center justify-center sm:justify-start gap-2">
                        <button
                          type="button"
                          onClick={() => fileInputRef.current?.click()}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-white border border-slate-200 hover:bg-slate-100 text-xs font-medium text-slate-700 transition shadow-xs"
                        >
                          <RefreshCw className="w-3.5 h-3.5" />
                          <span>Değiştir</span>
                        </button>
                        <button
                          type="button"
                          onClick={handleRemovePhoto}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-red-50 hover:bg-red-100 text-xs font-medium text-red-600 transition"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Kaldır</span>
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full border-2 border-dashed border-slate-300 hover:border-slate-500 rounded-2xl p-6 text-center transition bg-slate-50/50 hover:bg-slate-100/50 group flex flex-col items-center justify-center gap-2"
                  >
                    <div className="w-10 h-10 rounded-xl bg-slate-200/80 text-slate-600 flex items-center justify-center group-hover:scale-105 transition">
                      <UploadCloud className="w-5 h-5" />
                    </div>
                    <div className="text-xs font-semibold text-slate-800">
                      Görsel Seç / Fotoğraf Yükle
                    </div>
                    <div className="text-[11px] text-slate-400">
                      JPG, PNG veya WEBP (Maksimum 5 MB)
                    </div>
                  </button>
                )}
              </div>

              {/* Renk Bazlı Opsiyonel Görseller */}
              {formData.color.trim() && (
                <div className="space-y-2 pt-2 border-t border-slate-100">
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">
                    Renk Bazlı Görseller (İsteğe Bağlı)
                  </label>
                  <p className="text-[11px] text-slate-400">
                    Müşteri vitrininde ilgili renk seçildiğinde gösterilecek özel fotoğraflar:
                  </p>
                  <div className="space-y-2">
                    {formData.color
                      .split(/[,/]+/)
                      .map((s) => s.trim())
                      .filter(Boolean)
                      .map((colorName) => {
                        const colorUrl =
                          colorImagesMap[colorName] ||
                          colorImagesMap[colorName.toLowerCase()];
                        return (
                          <div
                            key={colorName}
                            className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 border border-slate-200"
                          >
                            <span className="text-xs font-bold text-slate-800">{colorName}</span>
                            <div className="flex items-center gap-2">
                              {colorUrl ? (
                                <div className="flex items-center gap-2">
                                  {/* eslint-disable-next-line @next/next/no-img-element */}
                                  <img
                                    src={colorUrl}
                                    alt={colorName}
                                    className="w-8 h-8 rounded-lg object-contain bg-white border border-slate-200"
                                  />
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setColorImagesMap((prev) => {
                                        const next = { ...prev };
                                        delete next[colorName];
                                        delete next[colorName.toLowerCase()];
                                        return next;
                                      });
                                    }}
                                    className="text-xs font-medium text-red-600 hover:underline"
                                  >
                                    Kaldır
                                  </button>
                                </div>
                              ) : (
                                <label className="cursor-pointer inline-flex items-center gap-1 text-xs font-semibold text-emerald-600 hover:text-emerald-700 bg-white border border-emerald-200 px-2.5 py-1 rounded-lg transition hover:bg-emerald-50">
                                  <UploadCloud className="w-3.5 h-3.5" />
                                  <span>Renk Görseli Yükle</span>
                                  <input
                                    type="file"
                                    accept="image/jpeg,image/png,image/webp"
                                    className="hidden"
                                    onChange={async (e) => {
                                      const file = e.target.files?.[0];
                                      if (!file) return;
                                      if (!ALLOWED_TYPES.includes(file.type) || file.size > MAX_FILE_SIZE) {
                                        setFormError(`"${colorName}" için seçilen görsel geçersiz veya 5 MB'den büyük.`);
                                        return;
                                      }
                                      try {
                                        setSubmitStatusText(`"${colorName}" görseli yükleniyor...`);
                                        const uploadData = new FormData();
                                        uploadData.append("file", file);

                                        const res = await fetch("/api/admin/upload", {
                                          method: "POST",
                                          body: uploadData,
                                        });
                                        const json = await res.json();
                                        if (res.ok && json.success) {
                                          setColorImagesMap((prev) => ({
                                            ...prev,
                                            [colorName]: json.data.url,
                                          }));
                                        } else {
                                          setFormError(json.error || `"${colorName}" görseli yüklenemedi.`);
                                        }
                                      } catch {
                                        setFormError(`"${colorName}" görseli yüklenirken hata oluştu.`);
                                      } finally {
                                        setSubmitStatusText("");
                                      }
                                    }}
                                  />
                                </label>
                              )}
                            </div>
                          </div>
                        );
                      })}
                  </div>
                </div>
              )}

              {/* Açıklama */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                  Açıklama (İsteğe Bağlı)
                </label>
                <textarea
                  rows={2}
                  placeholder="Kutu içeriği, garanti durumu vb. ek bilgiler..."
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full py-2.5 px-3 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900"
                />
              </div>

              {/* Aktif / Pasif */}
              <div className="flex items-center gap-3 pt-2">
                <input
                  type="checkbox"
                  id="isActiveToggle"
                  checked={formData.isActive}
                  onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                  className="w-4 h-4 rounded text-slate-900 focus:ring-slate-900 border-slate-300"
                />
                <label htmlFor="isActiveToggle" className="text-xs font-medium text-slate-700">
                  Model Aktif (Müşteri vitrininde görüntülensin)
                </label>
              </div>

              {/* Buttons */}
              <div className="pt-4 flex gap-3">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="w-1/2 py-3 px-4 rounded-xl border border-slate-300 text-slate-700 text-sm font-semibold hover:bg-slate-50 transition"
                >
                  İptal
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="w-1/2 py-3 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-sm font-semibold transition shadow-sm disabled:opacity-50"
                >
                  {submitting
                    ? submitStatusText || "Kaydediliyor..."
                    : editingModel
                    ? "Güncelle"
                    : "Kaydet"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Variant Delete Confirmation Modal */}
      {deleteVariantConfirm && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-600 flex items-center justify-center mx-auto">
              <AlertCircle className="w-6 h-6" />
            </div>

            <div className="text-center space-y-2">
              <h3 className="text-lg font-bold text-slate-900">
                Varyant Silme Onayı
              </h3>
              <p className="text-sm text-slate-600">
                <strong className="text-slate-900">
                  {deleteVariantConfirm.model
                    ? `${deleteVariantConfirm.model.brand} ${deleteVariantConfirm.model.modelName}`
                    : formData.modelName}{" "}
                  / {deleteVariantConfirm.variant.ram} / {deleteVariantConfirm.variant.storage}
                </strong>{" "}
                varyantını silmek istediğinize emin misiniz?
              </p>
              <p className="text-xs text-slate-400">
                Eğer bu varyanta ait işlem/stok geçmişi varsa finansal kayıtları korumak adına varyant silinmek yerine pasife alınacaktır.
              </p>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => setDeleteVariantConfirm(null)}
                disabled={deleting}
                className="w-1/2 py-2.5 px-4 rounded-xl border border-slate-300 text-slate-700 text-xs font-semibold hover:bg-slate-50 transition"
              >
                Vazgeç
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteVariant}
                disabled={deleting}
                className="w-1/2 py-2.5 px-4 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold transition shadow-sm disabled:opacity-50"
              >
                {deleting ? "Siliniyor..." : "Evet, Sil"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Product Delete Confirmation Modal */}
      {deleteProductConfirm && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-red-100 text-red-600 flex items-center justify-center mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>

            <div className="text-center space-y-2">
              <h3 className="text-lg font-bold text-slate-900">
                Ürün Silme Onayı
              </h3>
              <p className="text-sm text-slate-600">
                <strong className="text-slate-900">
                  {deleteProductConfirm.brand} {deleteProductConfirm.modelName}
                </strong>{" "}
                ürününü ve tüm varyantlarını silmek istediğinize emin misiniz?
              </p>
              <p className="text-xs text-slate-400">
                Eğer bu ürüne ait cihaz, satış veya işlem geçmişi varsa finansal geçmiş korunacak ve ürün silinmek yerine pasife alınacaktır.
              </p>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => setDeleteProductConfirm(null)}
                disabled={deleting}
                className="w-1/2 py-2.5 px-4 rounded-xl border border-slate-300 text-slate-700 text-xs font-semibold hover:bg-slate-50 transition"
              >
                Vazgeç
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteProduct}
                disabled={deleting}
                className="w-1/2 py-2.5 px-4 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold transition shadow-sm disabled:opacity-50"
              >
                {deleting ? "Siliniyor..." : "Evet, Ürünü Sil"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Admin Epey Specs Preview & Approval Modal */}
      <AdminSpecsPreviewModal
        isOpen={isSpecsPreviewOpen}
        onClose={() => setIsSpecsPreviewOpen(false)}
        onConfirm={handleConfirmSpecs}
        previewData={specsPreviewData}
      />

      {/* Admin Full Manual Specs Editor Modal */}
      <AdminManualSpecsModal
        isOpen={isManualSpecsOpen}
        onClose={() => setIsManualSpecsOpen(false)}
        onSave={handleSaveManualSpecs}
        initialSpecs={formData.specs}
        brand={formData.brand}
        modelName={formData.modelName}
        ram={formData.variants[0]?.ram || "8 GB"}
        storage={formData.variants[0]?.storage || "256 GB"}
      />
    </div>
  );
}
