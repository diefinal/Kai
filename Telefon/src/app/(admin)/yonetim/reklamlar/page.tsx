"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import {
  Megaphone,
  Plus,
  Search,
  CheckCircle2,
  X,
  AlertCircle,
  Sparkles,
  Trash2,
  Edit,
  Eye,
  Upload,
  Image as ImageIcon,
} from "lucide-react";
import { AdminAdDTO, StockVariantOptionDTO } from "@/types";
import { formatDate } from "@/lib/utils";

export default function ReklamlarPage() {
  const [ads, setAds] = useState<AdminAdDTO[]>([]);
  const [stockVariants, setStockVariants] = useState<StockVariantOptionDTO[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState("");
  const [positionFilter, setPositionFilter] = useState("ALL");
  const [activeFilter, setActiveFilter] = useState("ALL");

  // Add/Edit Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingAd, setEditingAd] = useState<AdminAdDTO | null>(null);

  // Form Fields
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [selectedVariantKey, setSelectedVariantKey] = useState("");
  const [phoneModelId, setPhoneModelId] = useState("");
  const [targetRam, setTargetRam] = useState("");
  const [targetStorage, setTargetStorage] = useState("");
  const [buttonText, setButtonText] = useState("İncele");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [position, setPosition] = useState<"HERO_SLIDER" | "IN_FEED">("HERO_SLIDER");
  const [displayType, setDisplayType] = useState<"IMAGE_ONLY" | "IMAGE_AND_TEXT">("IMAGE_AND_TEXT");
  const [order, setOrder] = useState<number>(0);

  // Upload state
  const [uploadingImage, setUploadingImage] = useState(false);

  // Status/Error
  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Delete confirm modal
  const [deletingAd, setDeletingAd] = useState<AdminAdDTO | null>(null);
  const [deleting, setDeleting] = useState(false);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [adsRes, variantsRes] = await Promise.all([
        fetch("/api/admin/ads"),
        fetch("/api/admin/ads/variants"),
      ]);

      const adsJson = await adsRes.json();
      const variantsJson = await variantsRes.json();

      if (adsJson.success && Array.isArray(adsJson.data)) {
        setAds(adsJson.data);
      }

      if (variantsJson.success && Array.isArray(variantsJson.data)) {
        setStockVariants(variantsJson.data);
      }
    } catch (err) {
      console.error("Veriler yüklenirken hata:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Filtered ads
  const filteredAds = useMemo(() => {
    return ads.filter((ad) => {
      const matchPos = positionFilter === "ALL" || ad.position === positionFilter;
      const matchAct =
        activeFilter === "ALL" ||
        (activeFilter === "true" && ad.isActive) ||
        (activeFilter === "false" && !ad.isActive);

      const q = search.toLowerCase();
      const matchSearch =
        !search ||
        ad.title.toLowerCase().includes(q) ||
        (ad.description && ad.description.toLowerCase().includes(q)) ||
        (ad.phoneModel &&
          (ad.phoneModel.brand.toLowerCase().includes(q) ||
            ad.phoneModel.modelName.toLowerCase().includes(q)));

      return matchPos && matchAct && matchSearch;
    });
  }, [ads, positionFilter, activeFilter, search]);

  const handleOpenAddModal = () => {
    setEditingAd(null);
    setTitle("");
    setDescription("");
    setImageUrl("");
    setSelectedVariantKey("");
    setPhoneModelId("");
    setTargetRam("");
    setTargetStorage("");
    setButtonText("İncele");
    const nowStr = new Date().toISOString().slice(0, 16);
    setStartDate(nowStr);
    setEndDate("");
    setIsActive(true);
    setPosition("HERO_SLIDER");
    setDisplayType("IMAGE_AND_TEXT");
    setOrder(0);
    setFormError(null);
    setFormSuccess(null);
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (ad: AdminAdDTO) => {
    setEditingAd(ad);
    setTitle(ad.title);
    setDescription(ad.description || "");
    setImageUrl(ad.imageUrl || "");
    setPhoneModelId(ad.phoneModelId || "");
    setTargetRam(ad.targetRam || "");
    setTargetStorage(ad.targetStorage || "");

    if (ad.phoneModelId && ad.targetRam && ad.targetStorage) {
      setSelectedVariantKey(`${ad.phoneModelId}|||${ad.targetRam}|||${ad.targetStorage}`);
    } else if (ad.phoneModelId) {
      // Direct model match
      const matchedVariant = stockVariants.find((v) => v.modelId === ad.phoneModelId);
      if (matchedVariant) {
        setSelectedVariantKey(matchedVariant.variantKey);
        setTargetRam(matchedVariant.ram);
        setTargetStorage(matchedVariant.storage);
      } else {
        setSelectedVariantKey("");
      }
    } else {
      setSelectedVariantKey("");
    }

    setButtonText(ad.buttonText || "İncele");
    setStartDate(ad.startDate ? new Date(ad.startDate).toISOString().slice(0, 16) : "");
    setEndDate(ad.endDate ? new Date(ad.endDate).toISOString().slice(0, 16) : "");
    setIsActive(ad.isActive);
    setPosition(ad.position);
    setDisplayType(ad.displayType);
    setOrder(ad.order || 0);
    setFormError(null);
    setFormSuccess(null);
    setIsModalOpen(true);
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append("file", file);

    setUploadingImage(true);
    try {
      const res = await fetch("/api/admin/upload", {
        method: "POST",
        body: formData,
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        setFormError(json.error || "Görsel yüklenemedi.");
      } else {
        setImageUrl(json.data.url);
      }
    } catch {
      setFormError("Görsel yüklenirken hata oluştu.");
    } finally {
      setUploadingImage(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setFormSuccess(null);

    if (!title.trim()) {
      setFormError("Lütfen reklam başlığı giriniz.");
      return;
    }

    if (displayType === "IMAGE_ONLY" && !imageUrl.trim()) {
      setFormError("'Sadece Görsel' modundaki reklamlar için bir görsel yüklenmelidir.");
      return;
    }

    setSubmitting(true);

    try {
      const payload = {
        title: title.trim(),
        description: description.trim() || null,
        imageUrl: imageUrl.trim() || null,
        phoneModelId: phoneModelId || null,
        targetRam: targetRam || null,
        targetStorage: targetStorage || null,
        buttonText: buttonText.trim() || "İncele",
        startDate: startDate ? new Date(startDate).toISOString() : new Date().toISOString(),
        endDate: endDate ? new Date(endDate).toISOString() : null,
        isActive,
        position,
        displayType,
        order: Number(order) || 0,
      };

      const url = editingAd ? `/api/admin/ads/${editingAd.id}` : "/api/admin/ads";
      const method = editingAd ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        setFormError(json.error || "İşlem başarısız oldu.");
      } else {
        setFormSuccess(editingAd ? "Reklam başarıyla güncellendi." : "Reklam başarıyla oluşturuldu.");
        await loadData();
        setTimeout(() => {
          setIsModalOpen(false);
        }, 800);
      }
    } catch {
      setFormError("Sunucu ile bağlantı hatası oluştu.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleActive = async (ad: AdminAdDTO) => {
    try {
      const res = await fetch(`/api/admin/ads/${ad.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !ad.isActive }),
      });

      const json = await res.json();
      if (json.success) {
        loadData();
      }
    } catch (err) {
      console.error("Durum değiştirme hatası:", err);
    }
  };

  const handleDeleteAd = async () => {
    if (!deletingAd) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/admin/ads/${deletingAd.id}`, {
        method: "DELETE",
      });

      const json = await res.json();
      if (json.success) {
        await loadData();
        setDeletingAd(null);
      }
    } catch (err) {
      console.error("Silme hatası:", err);
    } finally {
      setDeleting(false);
    }
  };

  const selectedVariantObj = useMemo(() => {
    return stockVariants.find((v) => v.variantKey === selectedVariantKey);
  }, [stockVariants, selectedVariantKey]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
            Reklam & Kampanya Yönetimi
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            Müşteri vitrinindeki Hero Slider ve ürün arası kampanya alanlarını yönetin.
          </p>
        </div>

        <button
          onClick={handleOpenAddModal}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-semibold transition shadow-sm"
        >
          <Plus className="w-4 h-4" />
          <span>Yeni Reklam Ekle</span>
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">
            Toplam Reklam
          </span>
          <div className="mt-2 text-2xl font-bold text-slate-900">{ads.length} adet</div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">
            Aktif Yayınlanan
          </span>
          <div className="mt-2 text-2xl font-bold text-emerald-600">
            {ads.filter((a) => a.isActive).length} adet
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">
            Hero Slider Banner
          </span>
          <div className="mt-2 text-2xl font-bold text-slate-900">
            {ads.filter((a) => a.position === "HERO_SLIDER").length} adet
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">
            Ürün Arası Kampanya
          </span>
          <div className="mt-2 text-2xl font-bold text-slate-900">
            {ads.filter((a) => a.position === "IN_FEED").length} adet
          </div>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Başlık, açıklama veya bağlı model ara..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-slate-900"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <select
            value={positionFilter}
            onChange={(e) => setPositionFilter(e.target.value)}
            className="text-xs font-medium px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-900"
          >
            <option value="ALL">Tüm Konumlar</option>
            <option value="HERO_SLIDER">Üst Slider Banner</option>
            <option value="IN_FEED">Ürün Arası Kampanya</option>
          </select>

          <select
            value={activeFilter}
            onChange={(e) => setActiveFilter(e.target.value)}
            className="text-xs font-medium px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-900"
          >
            <option value="ALL">Tüm Durumlar</option>
            <option value="true">Sadece Aktifler</option>
            <option value="false">Sadece Pasifler</option>
          </select>
        </div>
      </div>

      {/* Ads List Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-slate-400 text-sm">Reklamlar yükleniyor...</div>
        ) : filteredAds.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <Megaphone className="w-10 h-10 text-slate-300 mx-auto" />
            <p className="text-slate-600 font-medium">Kayıtlı reklam bulunamadı.</p>
            <p className="text-xs text-slate-400">
              Müşteri vitrini için &quot;Yeni Reklam Ekle&quot; butonuna tıklayabilirsiniz.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200 text-xs uppercase font-semibold text-slate-500 tracking-wider">
                  <th className="py-3.5 px-4">Görsel / Başlık</th>
                  <th className="py-3.5 px-4">Konum & Stil</th>
                  <th className="py-3.5 px-4">Bağlı Telefon / Varyant</th>
                  <th className="py-3.5 px-4">Yayın Tarihleri</th>
                  <th className="py-3.5 px-4">Durum</th>
                  <th className="py-3.5 px-4 text-right">İşlemler</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredAds.map((ad) => {
                  const isHero = ad.position === "HERO_SLIDER";
                  const isImgOnly = ad.displayType === "IMAGE_ONLY";

                  return (
                    <tr key={ad.id} className="hover:bg-slate-50/60 transition">
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-16 h-12 rounded-xl bg-slate-100 border border-slate-200 overflow-hidden flex items-center justify-center flex-shrink-0 relative">
                            {ad.imageUrl ? (
                              /* eslint-disable-next-line @next/next/no-img-element */
                              <img
                                src={ad.imageUrl}
                                alt={ad.title}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <ImageIcon className="w-5 h-5 text-slate-400" />
                            )}
                          </div>
                          <div>
                            <span className="font-bold text-slate-900 block leading-tight">
                              {ad.title}
                            </span>
                            {ad.description && (
                              <span className="text-xs text-slate-500 line-clamp-1">
                                {ad.description}
                              </span>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-xs">
                        <span
                          className={`inline-block px-2.5 py-1 rounded-full font-semibold border ${
                            isHero
                              ? "bg-purple-50 text-purple-700 border-purple-200"
                              : "bg-blue-50 text-blue-700 border-blue-200"
                          }`}
                        >
                          {isHero ? "Üst Slider" : "Ürün Arası"}
                        </span>
                        <span className="block mt-1 text-slate-500 font-medium text-[11px]">
                          {isImgOnly ? "Sadece Görsel" : "Görsel + Metin"}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-xs">
                        {ad.phoneModel ? (
                          <div>
                            <span className="font-semibold text-slate-900 block">
                              {ad.phoneModel.brand} {ad.phoneModel.modelName}
                            </span>
                            <span className="text-slate-500">
                              {ad.targetRam || ad.phoneModel.ram} • {ad.targetStorage || ad.phoneModel.storage} (Stok:{" "}
                              <span
                                className={`font-bold ${
                                  ad.phoneModel.inStockCount > 0
                                    ? "text-emerald-600"
                                    : "text-amber-600"
                                }`}
                              >
                                {ad.phoneModel.inStockCount} adet
                              </span>
                              )
                            </span>
                          </div>
                        ) : (
                          <span className="text-slate-400 italic">Genel Kampanya (Yok)</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-xs text-slate-600 whitespace-nowrap">
                        <div>
                          <span className="block font-medium">
                            Başlangıç: {formatDate(ad.startDate)}
                          </span>
                          <span className="block text-slate-400">
                            Bitiş: {ad.endDate ? formatDate(ad.endDate) : "Süresiz (Manuel)"}
                          </span>
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        <button
                          onClick={() => handleToggleActive(ad)}
                          className={`px-3 py-1 rounded-full text-xs font-semibold border transition ${
                            ad.isActive
                              ? "bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100"
                              : "bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200"
                          }`}
                        >
                          {ad.isActive ? "Aktif (Yayında)" : "Pasif"}
                        </button>
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => handleOpenEditModal(ad)}
                            className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 text-slate-600 transition"
                            title="Düzenle"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => setDeletingAd(ad)}
                            className="p-1.5 rounded-lg border border-red-200 text-red-600 hover:bg-red-50 transition"
                            title="Sil"
                          >
                            <Trash2 className="w-4 h-4" />
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

      {/* Add / Edit Ad Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-4xl w-full max-h-[92vh] flex flex-col shadow-2xl border border-slate-200">
            {/* Header */}
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-slate-900">
                  {editingAd ? "Reklamı Düzenle" : "Yeni Reklam Oluştur"}
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Müşteri vitrininde gösterilecek banner, slider ve kampanya alanını yapılandırın.
                </p>
              </div>

              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {formError && (
                <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              {formSuccess && (
                <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                  <span>{formSuccess}</span>
                </div>
              )}

              <form id="ad-form" onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Position */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                      Gösterim Konumu *
                    </label>
                    <select
                      value={position}
                      onChange={(e) => setPosition(e.target.value as "HERO_SLIDER" | "IN_FEED")}
                      className="w-full py-2.5 px-3 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900"
                    >
                      <option value="HERO_SLIDER">Üst Büyük Banner / Slider (Header Altı)</option>
                      <option value="IN_FEED">Ürünler Arası Kampanya Bannerı</option>
                    </select>
                  </div>

                  {/* Display Type */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                      Görsel / Metin Kullanımı *
                    </label>
                    <select
                      value={displayType}
                      onChange={(e) => setDisplayType(e.target.value as "IMAGE_ONLY" | "IMAGE_AND_TEXT")}
                      className="w-full py-2.5 px-3 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900"
                    >
                      <option value="IMAGE_AND_TEXT">Görsel + Sistem Metni (Başlık, Buton)</option>
                      <option value="IMAGE_ONLY">Sadece Görsel (Afiş / Özel Banner)</option>
                    </select>
                  </div>
                </div>

                {/* Title */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                    Reklam Başlığı *
                  </label>
                  <input
                    type="text"
                    placeholder="Örn: Hafta Sonu Özel İndirimi veya iPhone 16 Lansmanı"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    required
                    className="w-full py-2.5 px-3 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900"
                  />
                </div>

                {/* Description */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                    Kısa Açıklama (Opsiyonel)
                  </label>
                  <textarea
                    rows={2}
                    placeholder="Örn: Seçili modellerde peşin fiyatına taksit ve anında teslimat fırsatı!"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="w-full py-2.5 px-3 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900"
                  />
                </div>

                {/* Image Upload & URL */}
                <div className="space-y-2">
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">
                    Reklam Görseli {displayType === "IMAGE_ONLY" && "*"}
                  </label>

                  <div className="flex flex-col sm:flex-row items-stretch gap-3">
                    <label className="flex-1 cursor-pointer flex items-center justify-center gap-2 border-2 border-dashed border-slate-300 hover:border-slate-400 bg-slate-50 py-3 px-4 rounded-xl text-xs font-semibold text-slate-700 transition">
                      <Upload className="w-4 h-4 text-slate-500" />
                      <span>{uploadingImage ? "Görsel Yükleniyor..." : "Görsel Yükle (Supabase Storage)"}</span>
                      <input
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        onChange={handleImageUpload}
                        disabled={uploadingImage}
                        className="hidden"
                      />
                    </label>

                    <div className="flex-1 flex items-center gap-2">
                      <span className="text-xs text-slate-400">veya URL:</span>
                      <input
                        type="url"
                        placeholder="https://.../gorsel.jpg"
                        value={imageUrl}
                        onChange={(e) => setImageUrl(e.target.value)}
                        className="w-full py-2.5 px-3 rounded-xl border border-slate-300 text-xs focus:outline-none focus:ring-2 focus:ring-slate-900"
                      />
                    </div>
                  </div>
                </div>

                {/* Phone Model Relation & CTA Button */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Phone Model & Variant Connection Dropdown */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                      İsteğe Bağlı Telefon/Varyant Bağlantısı
                    </label>
                    <select
                      value={selectedVariantKey}
                      onChange={(e) => {
                        const key = e.target.value;
                        setSelectedVariantKey(key);
                        if (!key) {
                          setPhoneModelId("");
                          setTargetRam("");
                          setTargetStorage("");
                        } else {
                          const found = stockVariants.find((v) => v.variantKey === key);
                          if (found) {
                            setPhoneModelId(found.modelId);
                            setTargetRam(found.ram);
                            setTargetStorage(found.storage);
                          }
                        }
                      }}
                      className="w-full py-2.5 px-3 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900"
                    >
                      <option value="">-- Bağlantı Yok (Genel Kampanya) --</option>
                      {stockVariants.map((v) => (
                        <option key={v.variantKey} value={v.variantKey}>
                          {v.displayText}
                        </option>
                      ))}
                    </select>

                    {/* Selected Variant Info Box */}
                    {selectedVariantObj ? (
                      <div className="mt-2.5 p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-1">
                        <div className="font-bold text-slate-900">
                          Seçili Ürün: {selectedVariantObj.brand} {selectedVariantObj.modelName}
                        </div>
                        <div className="text-slate-600 flex flex-wrap gap-x-3 gap-y-1">
                          <span>RAM: <strong className="text-slate-800">{selectedVariantObj.ram}</strong></span>
                          <span>Hafıza: <strong className="text-slate-800">{selectedVariantObj.storage}</strong></span>
                          <span>Stok: <strong className="text-emerald-600 font-bold">{selectedVariantObj.stockCount} adet</strong></span>
                          <span>Renkler: <strong className="text-slate-800">{selectedVariantObj.colors.join(", ")}</strong></span>
                        </div>
                      </div>
                    ) : (
                      <p className="text-[11px] text-slate-500 mt-1">
                        Stoktaki Model+RAM+Hafıza varyantları listelenmektedir. Bağlı varyantta stok biterse reklam otomatik gizlenir.
                      </p>
                    )}
                  </div>

                  {/* Button Text */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                      Buton Yazısı (CTA)
                    </label>
                    <select
                      value={buttonText}
                      onChange={(e) => setButtonText(e.target.value)}
                      className="w-full py-2.5 px-3 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900"
                    >
                      <option value="İncele">İncele</option>
                      <option value="Bilgi Al">Bilgi Al (WhatsApp)</option>
                      <option value="Fırsatı Gör">Fırsatı Gör</option>
                      <option value="Hemen Al">Hemen Al</option>
                      <option value="Detayları İncele">Detayları İncele</option>
                    </select>
                  </div>
                </div>

                {/* Start & End Dates */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                      Başlangıç Tarihi *
                    </label>
                    <input
                      type="datetime-local"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      required
                      className="w-full py-2.5 px-3 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                      Bitiş Tarihi (Opsiyonel)
                    </label>
                    <input
                      type="datetime-local"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      className="w-full py-2.5 px-3 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900"
                    />
                    <p className="text-[11px] text-slate-500 mt-1">
                      Boş bırakılırsa manuel kapatılana kadar yayınlanır.
                    </p>
                  </div>
                </div>

                {/* Active & Order */}
                <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={isActive}
                      onChange={(e) => setIsActive(e.target.checked)}
                      className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500"
                    />
                    <span className="text-sm font-semibold text-slate-800">
                      Reklamı Aktif Olarak Yayınla
                    </span>
                  </label>

                  <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-600 font-semibold">Slider Sırası:</span>
                    <input
                      type="number"
                      min="0"
                      value={order}
                      onChange={(e) => setOrder(Number(e.target.value))}
                      className="w-20 py-1.5 px-2.5 rounded-lg border border-slate-300 text-xs text-center focus:outline-none focus:ring-2 focus:ring-slate-900"
                    />
                  </div>
                </div>
              </form>

              {/* Live Preview Box */}
              <div className="pt-4 border-t border-slate-200">
                <div className="flex items-center gap-2 mb-3">
                  <Eye className="w-4 h-4 text-emerald-600" />
                  <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                    Canlı Önizleme (Vitrin Görünümü)
                  </h3>
                </div>

                <div className="bg-slate-900 rounded-3xl p-6 text-white shadow-lg relative overflow-hidden">
                  {displayType === "IMAGE_ONLY" ? (
                    <div className="w-full h-48 bg-slate-800 rounded-2xl overflow-hidden relative flex items-center justify-center border border-slate-700">
                      {imageUrl ? (
                        /* eslint-disable-next-line @next/next/no-img-element */
                        <img
                          src={imageUrl}
                          alt="Önizleme"
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <span className="text-slate-400 text-xs">Görsel Yüklenmedi</span>
                      )}
                    </div>
                  ) : (
                    <div className="flex flex-col md:flex-row items-center justify-between gap-6">
                      <div className="max-w-xl space-y-3">
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 text-emerald-400 text-xs font-semibold uppercase tracking-wider">
                          <Sparkles className="w-3.5 h-3.5" />
                          Özel Kampanya
                        </div>
                        <h4 className="text-2xl font-extrabold tracking-tight">
                          {title || "Reklam Başlığı Buraya Gelecek"}
                        </h4>
                        {description && (
                          <p className="text-slate-300 text-xs sm:text-sm line-clamp-2">
                            {description}
                          </p>
                        )}
                        {selectedVariantObj && (
                          <div className="text-xs text-emerald-300 font-semibold bg-emerald-950/60 border border-emerald-800/60 px-3 py-1.5 rounded-xl inline-block">
                            📱 {selectedVariantObj.brand} {selectedVariantObj.modelName} ({selectedVariantObj.ram} / {selectedVariantObj.storage})
                          </div>
                        )}
                        <div className="pt-2">
                          <button className="px-5 py-2.5 rounded-xl bg-emerald-600 text-white text-xs font-bold shadow-md">
                            {buttonText} →
                          </button>
                        </div>
                      </div>

                      {imageUrl && (
                        <div className="w-44 h-44 rounded-2xl overflow-hidden bg-slate-800 border border-slate-700 flex-shrink-0">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={imageUrl}
                            alt="Önizleme"
                            className="w-full h-full object-cover"
                          />
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-slate-100 flex items-center justify-end gap-2 bg-slate-50 rounded-b-3xl">
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="px-4 py-2.5 rounded-xl border border-slate-300 text-slate-700 text-xs font-semibold hover:bg-slate-100 transition"
              >
                İptal
              </button>
              <button
                type="submit"
                form="ad-form"
                disabled={submitting}
                className="px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold transition disabled:opacity-50"
              >
                {submitting ? "Kaydediliyor..." : editingAd ? "Değişiklikleri Kaydet" : "Reklamı Oluştur"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deletingAd && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-red-50 border border-red-200 text-red-600 flex items-center justify-center mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>

            <div className="text-center space-y-1">
              <h3 className="font-bold text-slate-900 text-lg">Reklamı Sil</h3>
              <p className="text-xs text-slate-500">
                &quot;{deletingAd.title}&quot; isimli reklam silinecektir. Bu işlem geri alınamaz.
              </p>
            </div>

            <div className="flex items-center gap-2 pt-2">
              <button
                onClick={() => setDeletingAd(null)}
                className="w-1/2 py-2.5 rounded-xl border border-slate-300 text-slate-700 text-xs font-semibold"
              >
                İptal
              </button>
              <button
                onClick={handleDeleteAd}
                disabled={deleting}
                className="w-1/2 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-semibold disabled:opacity-50"
              >
                {deleting ? "Siliniyor..." : "Evet, Sil"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
