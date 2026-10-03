"use client";

import React, { useState } from "react";
import { X, Smartphone, CheckCircle2, ShieldCheck, Clock, Send, AlertCircle } from "lucide-react";

interface ProductReservationModalProps {
  isOpen: boolean;
  onClose: () => void;
  product: {
    modelId?: string;
    brand: string;
    modelName: string;
    ram: string;
    storage: string;
    color: string;
    basePrice: number;
    inStock: boolean;
    deliveryBadge: string;
    imageUrl?: string | null;
  };
}

export function ProductReservationModal({
  isOpen,
  onClose,
  product,
}: ProductReservationModalProps) {
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successData, setSuccessData] = useState<{
    leadNumber: string;
    message?: string;
  } | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!customerName.trim()) {
      setErrorMessage("Lütfen adınızı ve soyadınızı giriniz.");
      return;
    }

    if (!customerPhone.trim()) {
      setErrorMessage("Lütfen telefon numaranızı giriniz.");
      return;
    }

    try {
      setLoading(true);
      const res = await fetch("/api/public/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerName: customerName.trim(),
          customerPhone: customerPhone.trim(),
          notes: notes.trim() || undefined,
          modelId: product.modelId,
          brand: product.brand,
          modelName: product.modelName,
          ram: product.ram,
          storage: product.storage,
          color: product.color,
        }),
      });

      const json = await res.json();

      if (json.success && json.data) {
        setSuccessData({
          leadNumber: json.data.leadNumber,
          message: json.data.message,
        });
      } else {
        setErrorMessage(json.error || "Talep oluşturulurken bir hata oluştu.");
      }
    } catch (err: unknown) {
      console.error("Talep gönderme hatası:", err);
      setErrorMessage("Bağlantı hatası oluştu. Lütfen tekrar deneyiniz.");
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setCustomerName("");
    setCustomerPhone("");
    setNotes("");
    setErrorMessage(null);
    setSuccessData(null);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-900/50">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold">
              <Smartphone className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Ürünü Ayırt / Sipariş Oluştur
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                TeknoReha Güvencesiyle Rezervasyon
              </p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="w-9 h-9 rounded-xl hover:bg-slate-200/60 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 flex items-center justify-center transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Content */}
        <div className="p-6 overflow-y-auto space-y-5">
          {successData ? (
            <div className="py-6 text-center space-y-4">
              <div className="w-16 h-16 bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400 rounded-full flex items-center justify-center mx-auto animate-bounce">
                <CheckCircle2 className="w-10 h-10" />
              </div>
              <h4 className="text-xl font-bold text-slate-900 dark:text-white">
                Talebiniz Başarıyla Alındı!
              </h4>
              <p className="text-sm text-slate-600 dark:text-slate-300 max-w-sm mx-auto">
                Talep Numaranız:{" "}
                <strong className="text-emerald-600 dark:text-emerald-400 font-mono text-base">
                  {successData.leadNumber}
                </strong>
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Yetkili ekibimiz cihaz rezervasyonunuz ve kapora detayları için en kısa sürede sizinle iletişime geçecektir.
              </p>
              <button
                onClick={handleClose}
                className="w-full py-3 rounded-xl bg-slate-900 dark:bg-slate-100 hover:bg-slate-800 dark:hover:bg-white text-white dark:text-slate-900 font-semibold text-sm transition shadow"
              >
                Tamam
              </button>
            </div>
          ) : (
            <>
              {/* Product Read-Only Summary Box */}
              <div className="bg-slate-50 dark:bg-slate-800/60 rounded-2xl p-4 border border-slate-200/80 dark:border-slate-700/80 flex items-center gap-4">
                {product.imageUrl ? (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img
                    src={product.imageUrl}
                    alt={product.modelName}
                    className="w-16 h-16 object-contain rounded-xl bg-white dark:bg-slate-900 p-1 border border-slate-100 dark:border-slate-800"
                  />
                ) : (
                  <div className="w-16 h-16 bg-slate-200 dark:bg-slate-700 rounded-xl flex items-center justify-center text-slate-400">
                    <Smartphone className="w-8 h-8" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                    {product.brand}
                  </div>
                  <h4 className="text-sm font-bold text-slate-900 dark:text-white truncate">
                    {product.modelName}
                  </h4>
                  <div className="flex flex-wrap items-center gap-1.5 mt-1 text-xs text-slate-500 dark:text-slate-400 font-medium">
                    <span className="bg-white dark:bg-slate-900 px-2 py-0.5 rounded-md border border-slate-200 dark:border-slate-700">
                      {product.ram}
                    </span>
                    <span className="bg-white dark:bg-slate-900 px-2 py-0.5 rounded-md border border-slate-200 dark:border-slate-700">
                      {product.storage}
                    </span>
                    <span className="bg-white dark:bg-slate-900 px-2 py-0.5 rounded-md border border-slate-200 dark:border-slate-700">
                      {product.color}
                    </span>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-extrabold text-slate-900 dark:text-white">
                    {product.basePrice.toLocaleString("tr-TR")} ₺
                  </div>
                  <span
                    className={`inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full mt-1 ${
                      product.inStock
                        ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400"
                        : "bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:text-blue-400"
                    }`}
                  >
                    {product.inStock ? <ShieldCheck className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
                    {product.deliveryBadge}
                  </span>
                </div>
              </div>

              {errorMessage && (
                <div className="p-3 rounded-xl bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-900 text-red-600 dark:text-red-400 text-xs font-semibold flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{errorMessage}</span>
                </div>
              )}

              {/* Form Inputs */}
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                    Adınız Soyadınız <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Örn. Ahmet Yılmaz"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-sm font-medium border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                    Telefon Numaranız <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="tel"
                    required
                    placeholder="Örn. 0532 123 4567"
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-sm font-medium border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                    Ek Not veya İsteğiniz <span className="text-slate-400 font-normal">(İsteğe Bağlı)</span>
                  </label>
                  <textarea
                    rows={2}
                    placeholder="Örn. Cihazı Cuma günü dükkandan teslim almak istiyorum..."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-sm font-medium border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-emerald-500 focus:outline-none resize-none"
                  />
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-3.5 px-6 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm transition shadow-md flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {loading ? (
                      <span>Gönderiliyor...</span>
                    ) : (
                      <>
                        <Send className="w-4 h-4" />
                        <span>Talep / Rezervasyon Oluştur</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
