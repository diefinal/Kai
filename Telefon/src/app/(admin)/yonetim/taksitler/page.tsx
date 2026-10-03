"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import {
  CalendarDays,
  Search,
  CheckCircle2,
  Clock,
  AlertTriangle,
  CreditCard,
  X,
  AlertCircle,
  Wallet,
} from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/utils";

interface InstallmentRow {
  id: string;
  installmentNumber: number;
  amount: number;
  paidAmount: number;
  remainingAmount: number;
  dueDate: string;
  paidDate: string | null;
  status: "PENDING" | "PARTIALLY_PAID" | "PAID" | "OVERDUE";
  notes: string | null;
  saleTotalRemaining?: number;
  sale: {
    id: string;
    saleNumber: string;
    saleDate: string;
    customer: {
      id: string;
      name: string;
      phone: string | null;
    };
  };
}

export default function TaksitlerPage() {
  const [installments, setInstallments] = useState<InstallmentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Filters
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL"); // ALL, PENDING, OVERDUE, PAID

  // Payment Modal
  const [selectedInstallment, setSelectedInstallment] = useState<InstallmentRow | null>(null);
  const [payAmount, setPayAmount] = useState("");
  const [payMethod, setPayMethod] = useState<"CASH" | "BANK_TRANSFER" | "CREDIT_CARD">("CASH");
  const [payDate, setPayDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [payDesc, setPayDesc] = useState("");
  const [submittingPay, setSubmittingPay] = useState(false);
  const [payError, setPayError] = useState<string | null>(null);

  // Load Data
  const loadInstallments = useCallback(async () => {
    try {
      setLoading(true);
      setLoadError(null);
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      if (statusFilter !== "ALL") params.set("status", statusFilter);

      const res = await fetch(`/api/admin/installments?${params.toString()}`);
      const json = await res.json();
      if (json.success && Array.isArray(json.data)) {
        setInstallments(json.data);
      } else {
        setLoadError(json.error || "Taksit verileri yüklenemedi.");
      }
    } catch (err) {
      console.error("Taksitler yüklenirken hata:", err);
      setLoadError(err instanceof Error ? err.message : "Bağlantı hatası oluştu.");
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter]);

  useEffect(() => {
    loadInstallments();
  }, [loadInstallments]);

  // KPIs
  const totalUpcoming = useMemo(() => {
    return installments
      .filter((i) => i.status !== "PAID")
      .reduce((acc, curr) => acc + curr.remainingAmount, 0);
  }, [installments]);

  const totalOverdue = useMemo(() => {
    return installments
      .filter((i) => i.status === "OVERDUE")
      .reduce((acc, curr) => acc + curr.remainingAmount, 0);
  }, [installments]);

  const totalCollected = useMemo(() => {
    return installments.reduce((acc, curr) => acc + curr.paidAmount, 0);
  }, [installments]);

  // Open Pay Modal
  const handleOpenPayModal = (ins: InstallmentRow) => {
    setSelectedInstallment(ins);
    setPayAmount(String(ins.remainingAmount));
    setPayMethod("CASH");
    setPayDate(new Date().toISOString().split("T")[0]);
    setPayDesc(`${ins.sale.saleNumber} ${ins.installmentNumber}. Taksit Tahsilatı`);
    setPayError(null);
  };

  // Submit Payment
  const handlePaymentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedInstallment) return;
    setPayError(null);

    const amountNum = Number(payAmount);
    if (isNaN(amountNum) || amountNum <= 0) {
      setPayError("Geçerli bir tahsilat tutarı giriniz.");
      return;
    }

    const saleTotalRem = selectedInstallment.saleTotalRemaining ?? selectedInstallment.remainingAmount;
    if (amountNum > saleTotalRem + 0.009) {
      setPayError(`Tahsilat tutarı satışın toplam kalan borcundan (${formatCurrency(saleTotalRem)}) fazla olamaz.`);
      return;
    }

    setSubmittingPay(true);
    try {
      const res = await fetch("/api/admin/payments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cariId: selectedInstallment.sale.customer.id,
          saleId: selectedInstallment.sale.id,
          installmentId: selectedInstallment.id,
          type: "INCOMING",
          amount: amountNum,
          method: payMethod,
          date: payDate,
          description: payDesc,
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        setPayError(json.error || "Tahsilat kaydedilemedi.");
      } else {
        setSelectedInstallment(null);
        await loadInstallments();
      }
    } catch {
      setPayError("Bağlantı hatası oluştu.");
    } finally {
      setSubmittingPay(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
          Taksit ve Vade Takibi
        </h1>
        <p className="text-slate-500 text-sm mt-1">
          Vadeli telefon satışlarının ödeme planları, vadesi gelen taksitler ve tahsilat işlemleri.
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            Bekleyen Toplam Taksit
          </span>
          <div className="mt-2 text-2xl font-bold text-slate-900">
            {formatCurrency(totalUpcoming)}
          </div>
          <p className="text-xs text-slate-400 mt-1">Ödenmesi beklenen açık taksitler</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-red-200 bg-red-50/20 shadow-sm">
          <span className="text-xs font-semibold text-red-600 uppercase tracking-wider flex items-center gap-1">
            <AlertTriangle className="w-3.5 h-3.5" />
            Gecikmiş Taksitler
          </span>
          <div className="mt-2 text-2xl font-bold text-red-700">
            {formatCurrency(totalOverdue)}
          </div>
          <p className="text-xs text-red-500 mt-1">Vadesi geçmiş açık taksit tutarı</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <span className="text-xs font-semibold text-emerald-600 uppercase tracking-wider">
            Toplam Yapılan Tahsilat
          </span>
          <div className="mt-2 text-2xl font-bold text-emerald-700">
            {formatCurrency(totalCollected)}
          </div>
          <p className="text-xs text-slate-400 mt-1">Kapanan taksit ödemeleri</p>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Müşteri adı, telefon veya satış no ara..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-slate-900"
          />
        </div>

        <div className="flex items-center gap-2">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="text-xs font-medium px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-slate-700 focus:outline-none"
          >
            <option value="ALL">Tüm Taksitler</option>
            <option value="OVERDUE">Sadece Gecikmişler</option>
            <option value="PENDING">Bekleyenler</option>
            <option value="PAID">Ödenenler</option>
          </select>
        </div>
      </div>

      {/* Installments Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-16 text-center flex flex-col items-center justify-center gap-3">
            <div className="w-8 h-8 border-3 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
            <p className="text-slate-400 text-sm">Taksitler yükleniyor...</p>
          </div>
        ) : loadError ? (
          <div className="p-12 text-center space-y-3">
            <AlertCircle className="w-10 h-10 text-rose-500 mx-auto" />
            <p className="text-rose-700 font-medium text-sm">{loadError}</p>
            <button
              onClick={() => loadInstallments()}
              className="px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-semibold hover:bg-slate-800"
            >
              Tekrar Dene
            </button>
          </div>
        ) : installments.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <CalendarDays className="w-10 h-10 text-slate-300 mx-auto" />
            <p className="text-slate-600 font-medium">Kayıtlı taksit bulunamadı.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200 text-xs uppercase font-semibold text-slate-500 tracking-wider">
                  <th className="py-3.5 px-4">Müşteri</th>
                  <th className="py-3.5 px-4">Satış No</th>
                  <th className="py-3.5 px-4">Taksit No</th>
                  <th className="py-3.5 px-4">Vade Tarihi</th>
                  <th className="py-3.5 px-4">Taksit Tutarı</th>
                  <th className="py-3.5 px-4">Ödenen / Kalan</th>
                  <th className="py-3.5 px-4">Durum</th>
                  <th className="py-3.5 px-4 text-right">İşlem</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {installments.map((ins) => {
                  let badge = (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-700">
                      <Clock className="w-3.5 h-3.5" />
                      Bekliyor
                    </span>
                  );

                  if (ins.status === "PAID") {
                    badge = (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Ödendi
                      </span>
                    );
                  } else if (ins.status === "OVERDUE") {
                    badge = (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-red-50 text-red-700 border border-red-200">
                        <AlertTriangle className="w-3.5 h-3.5" />
                        Gecikmiş
                      </span>
                    );
                  } else if (ins.status === "PARTIALLY_PAID") {
                    badge = (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-700">
                        Kısmi Ödendi
                      </span>
                    );
                  }

                  return (
                    <tr key={ins.id} className="hover:bg-slate-50/60 transition">
                      <td className="py-3.5 px-4">
                        <span className="font-semibold text-slate-900 block leading-tight">
                          {ins.sale.customer.name}
                        </span>
                        {ins.sale.customer.phone && (
                          <span className="text-xs text-slate-400">{ins.sale.customer.phone}</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 font-mono font-medium text-xs text-slate-700">
                        {ins.sale.saleNumber}
                      </td>
                      <td className="py-3.5 px-4 font-semibold text-slate-800">
                        {ins.installmentNumber}. Taksit
                      </td>
                      <td className="py-3.5 px-4 text-xs font-medium text-slate-600 whitespace-nowrap">
                        {formatDate(ins.dueDate)}
                      </td>
                      <td className="py-3.5 px-4 font-bold text-slate-900">
                        {formatCurrency(ins.amount)}
                      </td>
                      <td className="py-3.5 px-4 text-xs">
                        <div className="font-semibold text-emerald-700">
                          {formatCurrency(ins.paidAmount)}
                        </div>
                        {ins.remainingAmount > 0 && (
                          <div className="text-amber-700 font-medium">
                            Kalan: {formatCurrency(ins.remainingAmount)}
                          </div>
                        )}
                      </td>
                      <td className="py-3.5 px-4">{badge}</td>
                      <td className="py-3.5 px-4 text-right">
                        {ins.status !== "PAID" && (
                          <button
                            onClick={() => handleOpenPayModal(ins)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold shadow-sm transition"
                          >
                            <Wallet className="w-3.5 h-3.5" />
                            <span>Tahsilat Yap</span>
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Tahsilat Modal */}
      {selectedInstallment && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-8 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-bold text-slate-900 text-lg flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-emerald-600" />
                <span>Taksit Tahsilatı Al</span>
              </h3>
              <button
                onClick={() => setSelectedInstallment(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {payError && (
              <div className="mt-3 p-2.5 rounded-xl bg-red-50 text-red-700 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{payError}</span>
              </div>
            )}

            <div className="mt-3 p-3 rounded-2xl bg-slate-50 border border-slate-200 text-xs space-y-2 text-slate-600">
              <div className="flex justify-between items-center">
                <span className="font-semibold text-slate-800">Müşteri:</span>
                <span className="font-medium text-slate-900">{selectedInstallment.sale.customer.name}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="font-semibold text-slate-800">Satış No:</span>
                <span className="font-medium text-slate-900">{selectedInstallment.sale.saleNumber} ({selectedInstallment.installmentNumber}. Taksit)</span>
              </div>
              <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-200">
                <div className="bg-white p-2.5 rounded-xl border border-slate-200">
                  <div className="text-[10px] text-slate-500 uppercase font-semibold">Bu Taksit Kalan</div>
                  <div className="text-sm font-bold text-amber-600">{formatCurrency(selectedInstallment.remainingAmount)}</div>
                </div>
                <div className="bg-white p-2.5 rounded-xl border border-slate-200">
                  <div className="text-[10px] text-slate-500 uppercase font-semibold">Satış Toplam Kalan</div>
                  <div className="text-sm font-bold text-rose-600">
                    {formatCurrency(selectedInstallment.saleTotalRemaining ?? selectedInstallment.remainingAmount)}
                  </div>
                </div>
              </div>
            </div>

            <form onSubmit={handlePaymentSubmit} className="mt-4 space-y-3">
              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="block text-xs font-semibold text-slate-700">
                    Tahsilat Tutarı (TL) *
                  </label>
                  {(selectedInstallment.saleTotalRemaining ?? selectedInstallment.remainingAmount) > selectedInstallment.remainingAmount && (
                    <button
                      type="button"
                      onClick={() => {
                        const total = selectedInstallment.saleTotalRemaining ?? selectedInstallment.remainingAmount;
                        setPayAmount(String(total));
                      }}
                      className="text-[11px] font-semibold text-indigo-600 hover:text-indigo-800 underline"
                    >
                      Tam Erken Kapama ({formatCurrency(selectedInstallment.saleTotalRemaining ?? selectedInstallment.remainingAmount)})
                    </button>
                  )}
                </div>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  required
                  value={payAmount}
                  onChange={(e) => setPayAmount(e.target.value)}
                  className="w-full py-2.5 px-3 rounded-xl border border-slate-300 text-sm font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900"
                />

                {/* Dinamik Taksit Dağıtım / Limit Uyarısı */}
                {(() => {
                  const num = Number(payAmount);
                  const insRem = selectedInstallment.remainingAmount;
                  const totalRem = selectedInstallment.saleTotalRemaining ?? insRem;
                  if (!isNaN(num) && num > insRem + 0.009 && num <= totalRem + 0.009) {
                    const cascade = Math.round((num - insRem) * 100) / 100;
                    return (
                      <div className="mt-2 p-2 rounded-xl bg-emerald-50 border border-emerald-200 text-[11px] text-emerald-800 flex items-center gap-1.5 font-medium">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
                        <span>₺{formatCurrency(cascade)} sonraki taksitlere otomatik aktarılacak.</span>
                      </div>
                    );
                  }
                  if (!isNaN(num) && num > totalRem + 0.009) {
                    return (
                      <div className="mt-2 p-2 rounded-xl bg-rose-50 border border-rose-200 text-[11px] text-rose-700 flex items-center gap-1.5 font-medium">
                        <AlertCircle className="w-3.5 h-3.5 text-rose-600 flex-shrink-0" />
                        <span>Tahsilat tutarı satışın toplam kalan borcundan ({formatCurrency(totalRem)}) fazla olamaz.</span>
                      </div>
                    );
                  }
                  return null;
                })()}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Ödeme Yöntemi</label>
                <select
                  value={payMethod}
                  onChange={(e) => setPayMethod(e.target.value as "CASH" | "BANK_TRANSFER" | "CREDIT_CARD")}
                  className="w-full py-2 px-3 rounded-xl border border-slate-300 text-xs focus:outline-none"
                >
                  <option value="CASH">Nakit</option>
                  <option value="BANK_TRANSFER">Havale / EFT</option>
                  <option value="CREDIT_CARD">Kredi Kartı</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">İşlem Tarihi</label>
                <input
                  type="date"
                  required
                  value={payDate}
                  onChange={(e) => setPayDate(e.target.value)}
                  className="w-full py-2 px-3 rounded-xl border border-slate-300 text-xs focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Açıklama</label>
                <input
                  type="text"
                  value={payDesc}
                  onChange={(e) => setPayDesc(e.target.value)}
                  className="w-full py-2 px-3 rounded-xl border border-slate-300 text-xs focus:outline-none"
                />
              </div>

              <div className="pt-3 flex gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedInstallment(null)}
                  className="w-1/2 py-2.5 rounded-xl border border-slate-300 text-slate-700 text-xs font-semibold"
                >
                  Vazgeç
                </button>
                <button
                  type="submit"
                  disabled={submittingPay || Number(payAmount) > (selectedInstallment.saleTotalRemaining ?? selectedInstallment.remainingAmount) + 0.009}
                  className="w-1/2 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-semibold shadow-sm"
                >
                  {submittingPay ? "İşleniyor..." : "Tahsilatı Kaydet"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
