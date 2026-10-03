"use client";

import React, { useState, useEffect } from "react";
import { X, CheckCircle2, Info } from "lucide-react";
import { NormalizedPhoneSpecs } from "@/types";

interface AdminManualSpecsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (specs: NormalizedPhoneSpecs) => void;
  initialSpecs: NormalizedPhoneSpecs | null;
  brand: string;
  modelName: string;
  ram?: string;
  storage?: string;
}

export function AdminManualSpecsModal({
  isOpen,
  onClose,
  onSave,
  initialSpecs,
  brand,
  modelName,
  ram,
  storage,
}: AdminManualSpecsModalProps) {
  const [formData, setFormData] = useState<Partial<NormalizedPhoneSpecs>>({});

  useEffect(() => {
    if (isOpen) {
      if (initialSpecs) {
        setFormData({ ...initialSpecs });
      } else {
        setFormData({
          source: "Manuel",
          lastUpdated: new Date().toLocaleDateString("tr-TR", {
            day: "numeric",
            month: "long",
            year: "numeric",
          }),
        });
      }
    }
  }, [isOpen, initialSpecs]);

  if (!isOpen) return null;

  const handleChange = (key: keyof NormalizedPhoneSpecs, value: string | boolean) => {
    setFormData((prev) => ({
      ...prev,
      [key]: value === "" ? null : value,
      source: "Manuel", // Marking source as Manuel whenever user modifies any field
      lastUpdated: new Date().toLocaleDateString("tr-TR", {
        day: "numeric",
        month: "long",
        year: "numeric",
      }),
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const cleanSpecs: NormalizedPhoneSpecs = {
      source: formData.source || "Manuel",
      sourceUrl: formData.sourceUrl || null,
      sourceDeviceId: formData.sourceDeviceId || null,
      lastUpdated:
        formData.lastUpdated ||
        new Date().toLocaleDateString("tr-TR", {
          day: "numeric",
          month: "long",
          year: "numeric",
        }),
      displaySize: formData.displaySize?.trim() || null,
      displayTechnology: formData.displayTechnology?.trim() || null,
      refreshRate: formData.refreshRate?.trim() || null,
      resolution: formData.resolution?.trim() || null,
      displayProtection: formData.displayProtection?.trim() || null,
      displayBrightness: formData.displayBrightness?.trim() || null,
      chipset: formData.chipset?.trim() || null,
      gpu: formData.gpu?.trim() || null,
      mainCamera: formData.mainCamera?.trim() || null,
      frontCamera: formData.frontCamera?.trim() || null,
      videoFeatures: formData.videoFeatures?.trim() || null,
      batteryCapacity: formData.batteryCapacity?.trim() || null,
      fastCharging: formData.fastCharging?.trim() || null,
      wirelessCharging: formData.wirelessCharging?.trim() || null,
      fiveG: formData.fiveG?.toString().trim() || null,
      nfc: formData.nfc?.toString().trim() || null,
      wifi: formData.wifi?.trim() || null,
      bluetooth: formData.bluetooth?.trim() || null,
      waterResistance: formData.waterResistance?.trim() || null,
      dimensions: formData.dimensions?.trim() || null,
      weight: formData.weight?.trim() || null,
      operatingSystem: formData.operatingSystem?.trim() || null,
    };

    onSave(cleanSpecs);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-start sm:items-center justify-center p-2 sm:p-4 overflow-hidden">
      <div className="bg-white rounded-2xl sm:rounded-3xl max-w-3xl w-full shadow-2xl border border-slate-200 flex flex-col max-h-[95dvh] sm:max-h-[90vh] overflow-hidden my-auto text-slate-900">
        {/* Header */}
        <div className="px-5 py-4 sm:px-6 sm:py-5 border-b border-slate-100 flex items-center justify-between bg-white shrink-0">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2.5 py-0.5 rounded-md text-[11px] font-extrabold uppercase tracking-wider bg-emerald-100 text-emerald-800">
                Teknik Özellik Yönetimi
              </span>
              <span className="text-xs font-semibold text-slate-400">
                Kaynak: <strong className="text-slate-700">{formData.source || "Manuel"}</strong>
              </span>
            </div>
            <h2 className="text-lg sm:text-xl font-bold text-slate-900 leading-tight">
              ✏️ {brand} {modelName} – Teknik Özellikleri Düzenle
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 flex flex-col overflow-hidden">
          <div className="p-5 sm:p-6 overflow-y-auto flex-1 space-y-6 custom-scrollbar text-xs">
            {/* Info Note Banner */}
            <div className="p-3.5 rounded-2xl bg-blue-50/80 border border-blue-200/80 text-blue-900 flex items-start gap-2.5">
              <Info className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
              <div className="space-y-0.5">
                <span className="font-bold block">Önemli Kural:</span>
                <p className="leading-relaxed">
                  RAM ve Dahili Depolama bilgileri doğrudan TeknoReha varyant tanımından (
                  <strong className="font-bold text-blue-950">
                    {ram || "Varsayılan RAM"} / {storage || "Varsayılan Hafıza"}
                  </strong>
                  ) alınır. Boş bırakılan teknik alanlar müşteri vitrininde gösterilmez.
                </p>
              </div>
            </div>

            {/* 1. EKRAN BÖLÜMÜ */}
            <div className="space-y-3">
              <div className="flex items-center gap-2 pb-1.5 border-b border-slate-100 font-bold text-slate-900 text-sm">
                <span className="text-base">📱</span>
                <span>Ekran Özellikleri</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Ekran Boyutu</label>
                  <input
                    type="text"
                    placeholder="Örn: 6.3 inç"
                    value={formData.displaySize || ""}
                    onChange={(e) => handleChange("displaySize", e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-slate-900"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Ekran Teknolojisi</label>
                  <input
                    type="text"
                    placeholder="Örn: LTPO Super Retina XDR OLED"
                    value={formData.displayTechnology || ""}
                    onChange={(e) => handleChange("displayTechnology", e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-slate-900"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Çözünürlük</label>
                  <input
                    type="text"
                    placeholder="Örn: 2622 x 1206 Piksel"
                    value={formData.resolution || ""}
                    onChange={(e) => handleChange("resolution", e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-slate-900"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Yenileme Hızı</label>
                  <input
                    type="text"
                    placeholder="Örn: 120 Hz ProMotion"
                    value={formData.refreshRate || ""}
                    onChange={(e) => handleChange("refreshRate", e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-slate-900"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Ekran Koruması</label>
                  <input
                    type="text"
                    placeholder="Örn: Ceramic Shield 2"
                    value={formData.displayProtection || ""}
                    onChange={(e) => handleChange("displayProtection", e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-slate-900"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Parlaklık / Diğer Ekran Bilgisi</label>
                  <input
                    type="text"
                    placeholder="Örn: 2000 nit Maksimum Parlaklık"
                    value={formData.displayBrightness || ""}
                    onChange={(e) => handleChange("displayBrightness", e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-slate-900"
                  />
                </div>
              </div>
            </div>

            {/* 2. İŞLEMCİ & PERFORMANS BÖLÜMÜ */}
            <div className="space-y-3">
              <div className="flex items-center gap-2 pb-1.5 border-b border-slate-100 font-bold text-slate-900 text-sm">
                <span className="text-base">⚡</span>
                <span>İşlemci & Performans</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">İşlemci / Chipset</label>
                  <input
                    type="text"
                    placeholder="Örn: Apple A19 Pro (3 nm)"
                    value={formData.chipset || ""}
                    onChange={(e) => handleChange("chipset", e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-slate-900"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Grafik İşlemci (GPU)</label>
                  <input
                    type="text"
                    placeholder="Örn: Apple 6 Çekirdekli GPU"
                    value={formData.gpu || ""}
                    onChange={(e) => handleChange("gpu", e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-slate-900"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">İşletim Sistemi</label>
                  <input
                    type="text"
                    placeholder="Örn: iOS 26 veya Android 15"
                    value={formData.operatingSystem || ""}
                    onChange={(e) => handleChange("operatingSystem", e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-slate-900"
                  />
                </div>
              </div>
            </div>

            {/* 3. KAMERA BÖLÜMÜ */}
            <div className="space-y-3">
              <div className="flex items-center gap-2 pb-1.5 border-b border-slate-100 font-bold text-slate-900 text-sm">
                <span className="text-base">📷</span>
                <span>Kamera Özellikleri</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Arka Kamera</label>
                  <input
                    type="text"
                    placeholder="Örn: 48 MP + 48 MP + 48 MP"
                    value={formData.mainCamera || ""}
                    onChange={(e) => handleChange("mainCamera", e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-slate-900"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Ön Kamera</label>
                  <input
                    type="text"
                    placeholder="Örn: 18 MP Center Stage"
                    value={formData.frontCamera || ""}
                    onChange={(e) => handleChange("frontCamera", e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-slate-900"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Video Özellikleri</label>
                  <input
                    type="text"
                    placeholder="Örn: 4K 120 fps / ProRes RAW"
                    value={formData.videoFeatures || ""}
                    onChange={(e) => handleChange("videoFeatures", e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-slate-900"
                  />
                </div>
              </div>
            </div>

            {/* 4. BATARYA & ŞARJ BÖLÜMÜ */}
            <div className="space-y-3">
              <div className="flex items-center gap-2 pb-1.5 border-b border-slate-100 font-bold text-slate-900 text-sm">
                <span className="text-base">🔋</span>
                <span>Batarya & Şarj</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Batarya Kapasitesi</label>
                  <input
                    type="text"
                    placeholder="Örn: 3582 mAh"
                    value={formData.batteryCapacity || ""}
                    onChange={(e) => handleChange("batteryCapacity", e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-slate-900"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Hızlı Şarj</label>
                  <input
                    type="text"
                    placeholder="Örn: Var (%50 Şarj ~30 Dakika)"
                    value={formData.fastCharging || ""}
                    onChange={(e) => handleChange("fastCharging", e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-slate-900"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Kablosuz Şarj</label>
                  <input
                    type="text"
                    placeholder="Örn: MagSafe & Qi2 Desteği"
                    value={formData.wirelessCharging || ""}
                    onChange={(e) => handleChange("wirelessCharging", e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-slate-900"
                  />
                </div>
              </div>
            </div>

            {/* 5. BAĞLANTI TEKNOLOJİLERİ BÖLÜMÜ */}
            <div className="space-y-3">
              <div className="flex items-center gap-2 pb-1.5 border-b border-slate-100 font-bold text-slate-900 text-sm">
                <span className="text-base">📡</span>
                <span>Bağlantı Teknolojileri</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">5G Desteği</label>
                  <input
                    type="text"
                    placeholder="Örn: ✓ Var"
                    value={
                      formData.fiveG !== undefined && formData.fiveG !== null
                        ? String(formData.fiveG)
                        : ""
                    }
                    onChange={(e) => handleChange("fiveG", e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-slate-900"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Wi-Fi Teknolojisi</label>
                  <input
                    type="text"
                    placeholder="Örn: Wi-Fi 7 (802.11be)"
                    value={formData.wifi || ""}
                    onChange={(e) => handleChange("wifi", e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-slate-900"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Bluetooth</label>
                  <input
                    type="text"
                    placeholder="Örn: v5.4"
                    value={formData.bluetooth || ""}
                    onChange={(e) => handleChange("bluetooth", e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-slate-900"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">NFC Desteği</label>
                  <input
                    type="text"
                    placeholder="Örn: ✓ Var"
                    value={
                      formData.nfc !== undefined && formData.nfc !== null
                        ? String(formData.nfc)
                        : ""
                    }
                    onChange={(e) => handleChange("nfc", e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-slate-900"
                  />
                </div>
              </div>
            </div>

            {/* 6. FİZİKSEL ÖZELLİKLER & DAYANIKLILIK BÖLÜMÜ */}
            <div className="space-y-3">
              <div className="flex items-center gap-2 pb-1.5 border-b border-slate-100 font-bold text-slate-900 text-sm">
                <span className="text-base">📐</span>
                <span>Fiziksel Özellikler & Dayanıklılık</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Boyutlar</label>
                  <input
                    type="text"
                    placeholder="Örn: 149.6 x 71.5 x 8.25 mm"
                    value={formData.dimensions || ""}
                    onChange={(e) => handleChange("dimensions", e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-slate-900"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Ağırlık</label>
                  <input
                    type="text"
                    placeholder="Örn: 187 g"
                    value={formData.weight || ""}
                    onChange={(e) => handleChange("weight", e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-slate-900"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Su / Toz Dayanıklılığı</label>
                  <input
                    type="text"
                    placeholder="Örn: IP68 (6 Metre, 30 Dakika)"
                    value={formData.waterResistance || ""}
                    onChange={(e) => handleChange("waterResistance", e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-slate-900"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Action Footer */}
          <div className="p-4 sm:px-6 border-t border-slate-100 bg-slate-50 flex items-center justify-between gap-3 shrink-0">
            <span className="text-[11px] text-slate-400 hidden sm:inline">
              Kaydettikten sonra teknik veriler müşteri vitrininde canlıya geçer.
            </span>
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <button
                type="button"
                onClick={onClose}
                className="w-1/2 sm:w-auto py-2.5 px-4 rounded-xl border border-slate-300 text-slate-700 text-xs font-semibold hover:bg-slate-100 transition"
              >
                İptal
              </button>
              <button
                type="submit"
                className="w-1/2 sm:w-auto py-2.5 px-5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition shadow-sm flex items-center justify-center gap-1.5"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Teknik Özellikleri Kaydet</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
