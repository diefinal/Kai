"use client";

import { useEffect, useState, useMemo, useCallback, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import {
  Wallet,
  Search,
  ArrowDownLeft,
  ArrowUpRight,
  FileText,
  X,
  Plus,
  Minus,
} from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/utils";
import { getCariBalanceStatus } from "@/lib/accounting";

interface CariRow {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  type: "CUSTOMER" | "SUPPLIER" | "BOTH";
  currentBalance: number;
  notes: string | null;
  createdAt: string;
}

interface CariEkstreItem {
  id: string;
  date: string;
  type: "DEBIT" | "CREDIT";
  amount: number;
  description: string;
  referenceType: string;
  referenceId: string | null;
  debitAmount: number | null;
  creditAmount: number | null;
  runningBalance: number;
}

function CariHesapContent() {
  const searchParams = useSearchParams();
  const initialCariId = searchParams.get("cariId");

  const [cariler, setCariler] = useState<CariRow[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("ALL"); // ALL, CUSTOMER, SUPPLIER, BOTH

  // Statement (Ekstre) Modal
  const [selectedCariForEkstre, setSelectedCariForEkstre] = useState<CariRow | null>(null);
  const [ekstreData, setEkstreData] = useState<CariEkstreItem[]>([]);
  const [ekstreLoading, setEkstreLoading] = useState(false);
  const [ekstreStartDate, setEkstreStartDate] = useState("");
  const [ekstreEndDate, setEkstreEndDate] = useState("");

  // Payment / Collection Modals
  const [activePaymentModal, setActivePaymentModal] = useState<{
    flow: "INCOMING" | "OUTGOING";
    cari: CariRow;
  } | null>(null);
  const [payAmount, setPayAmount] = useState("");
  const [payMethod, setPayMethod] = useState<"CASH" | "BANK_TRANSFER" | "CREDIT_CARD">("CASH");
  const [payDate, setPayDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [payDesc, setPayDesc] = useState("");
  const [payError, setPayError] = useState<string | null>(null);
  const [paySubmitting, setPaySubmitting] = useState(false);

  // Fetch Cariler
  const fetchCariler = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/admin/cariler");
      const json = await res.json();
      if (json.success && Array.isArray(json.data)) {
        setCariler(json.data);
      }
    } catch (err) {
      console.error("Cariler yüklenirken hata:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCariler();
  }, [fetchCariler]);

  // Load Ekstre
  const loadEkstre = useCallback(async (cari: CariRow) => {
    setSelectedCariForEkstre(cari);
    try {
      setEkstreLoading(true);
      const res = await fetch(`/api/admin/cariler/${cari.id}`);
      const json = await res.json();
      if (json.success && json.data?.ekstre) {
        setEkstreData(json.data.ekstre);
      }
    } catch (err) {
      console.error("Ekstre yüklenirken hata:", err);
    } finally {
      setEkstreLoading(false);
    }
  }, []);

  // Handle initial cariId query param
  useEffect(() => {
    if (initialCariId && cariler.length > 0 && !selectedCariForEkstre) {
      const found = cariler.find((c) => c.id === initialCariId);
      if (found) {
        loadEkstre(found);
      }
    }
  }, [initialCariId, cariler, selectedCariForEkstre, loadEkstre]);

  // Financial KPIs
  const financialStats = useMemo(() => {
    let totalReceivable = 0; // Bizim Alacağımız (Müşterinin borcu > 0)
    let totalPayable = 0;    // Bizim Borcumuz (Tedarikçiye borç < 0)

    for (const c of cariler) {
      if (c.currentBalance > 0) {
        totalReceivable += c.currentBalance;
      } else if (c.currentBalance < 0) {
        totalPayable += Math.abs(c.currentBalance);
      }
    }

    const netStatus = totalReceivable - totalPayable;
    return { totalReceivable, totalPayable, netStatus };
  }, [cariler]);

  // Filtered List
  const filteredCariler = useMemo(() => {
    return cariler.filter((c) => {
      const matchType =
        typeFilter === "ALL" ||
        (typeFilter === "CUSTOMER" && (c.type === "CUSTOMER" || c.type === "BOTH")) ||
        (typeFilter === "SUPPLIER" && (c.type === "SUPPLIER" || c.type === "BOTH")) ||
        (typeFilter === "BOTH" && c.type === "BOTH");

      const q = search.toLowerCase().trim();
      const matchSearch =
        !q ||
        c.name.toLowerCase().includes(q) ||
        (c.phone && c.phone.includes(q)) ||
        (c.email && c.email.toLowerCase().includes(q));

      return matchType && matchSearch;
    });
  }, [cariler, typeFilter, search]);

  // Filtered Ekstre
  const filteredEkstre = useMemo(() => {
    return ekstreData.filter((item) => {
      if (ekstreStartDate) {
        const itemDate = new Date(item.date).toISOString().split("T")[0];
        if (itemDate < ekstreStartDate) return false;
      }
      if (ekstreEndDate) {
        const itemDate = new Date(item.date).toISOString().split("T")[0];
        if (itemDate > ekstreEndDate) return false;
      }
      return true;
    });
  }, [ekstreData, ekstreStartDate, ekstreEndDate]);

  // Submit Payment / Collection
  const handlePaymentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activePaymentModal) return;

    const parsedAmount = parseFloat(payAmount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      setPayError("Geçerli bir ödeme/tahsilat tutarı giriniz.");
      return;
    }

    try {
      setPaySubmitting(true);
      setPayError(null);

      const res = await fetch("/api/admin/payments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cariId: activePaymentModal.cari.id,
          type: activePaymentModal.flow,
          amount: parsedAmount,
          method: payMethod,
          date: payDate,
          description: payDesc.trim() || undefined,
        }),
      });

      const json = await res.json();
      if (!json.success) {
        setPayError(json.error || "İşlem kaydedilemedi.");
        return;
      }

      setActivePaymentModal(null);
      await fetchCariler();
      if (selectedCariForEkstre?.id === activePaymentModal.cari.id) {
        await loadEkstre(activePaymentModal.cari);
      }
    } catch (err: unknown) {
      setPayError(err instanceof Error ? err.message : "Bağlantı hatası.");
    } finally {
      setPaySubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
          Cari Hesap & Finansal Takip
        </h1>
        <p className="text-slate-500 text-sm mt-1">
          Müşteri alacakları, tedarikçi borçları, hesap ekstreleri, tahsilat ve ödeme hareketleri.
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Toplam Alacağımız */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
            <ArrowDownLeft className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs text-slate-400 font-medium">Toplam Alacağımız (Müşteriler)</span>
            <div className="text-xl font-bold text-emerald-600 tracking-tight mt-0.5">
              {formatCurrency(financialStats.totalReceivable)}
            </div>
          </div>
        </div>

        {/* Toplam Borcumuz */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-red-50 text-red-600 flex items-center justify-center font-bold">
            <ArrowUpRight className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs text-slate-400 font-medium">Toplam Borcumuz (Tedarikçiler)</span>
            <div className="text-xl font-bold text-red-600 tracking-tight mt-0.5">
              {formatCurrency(financialStats.totalPayable)}
            </div>
          </div>
        </div>

        {/* Net Finansal Durum */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-700 flex items-center justify-center font-bold">
            <Wallet className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs text-slate-400 font-medium">Net Bakiye Durumu</span>
            <div
              className={`text-xl font-bold tracking-tight mt-0.5 ${
                financialStats.netStatus > 0
                  ? "text-emerald-600"
                  : financialStats.netStatus < 0
                  ? "text-red-600"
                  : "text-slate-700"
              }`}
            >
              {financialStats.netStatus > 0 ? "+" : ""}
              {formatCurrency(financialStats.netStatus)}
            </div>
          </div>
        </div>
      </div>

      {/* Filters & Search */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col md:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
          <input
            type="text"
            placeholder="Cari adı veya telefon ara..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
          />
        </div>

        <div className="flex items-center gap-2">
          {["ALL", "CUSTOMER", "SUPPLIER", "BOTH"].map((t) => {
            const labels: Record<string, string> = {
              ALL: "Tümü",
              CUSTOMER: "Müşteriler",
              SUPPLIER: "Tedarikçiler",
              BOTH: "Her İkisi",
            };
            return (
              <button
                key={t}
                onClick={() => setTypeFilter(t)}
                className={`px-3 py-2 rounded-xl text-xs font-semibold transition ${
                  typeFilter === t
                    ? "bg-slate-900 text-white"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                {labels[t]}
              </button>
            );
          })}
        </div>
      </div>

      {/* Financial Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 border-b border-slate-200 text-xs text-slate-500 uppercase tracking-wider font-semibold">
              <tr>
                <th className="px-6 py-3.5">Cari Adı</th>
                <th className="px-6 py-3.5">Tür</th>
                <th className="px-6 py-3.5 text-right">Bizim Alacağımız</th>
                <th className="px-6 py-3.5 text-right">Bizim Borcumuz</th>
                <th className="px-6 py-3.5 text-center">Bakiye Durumu</th>
                <th className="px-6 py-3.5 text-right">Finansal İşlemler</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-slate-400">
                    <div className="inline-block animate-spin rounded-full h-6 w-6 border-2 border-emerald-600 border-t-transparent mb-2" />
                    <div>Cari hesaplar yükleniyor...</div>
                  </td>
                </tr>
              ) : filteredCariler.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-slate-500">
                    <Wallet className="w-8 h-8 mx-auto mb-2 text-slate-400 opacity-60" />
                    Hesap hareketi bulunamadı.
                  </td>
                </tr>
              ) : (
                filteredCariler.map((c) => {
                  const balanceInfo = getCariBalanceStatus(c.currentBalance);
                  const isReceivable = c.currentBalance > 0;
                  const isPayable = c.currentBalance < 0;

                  return (
                    <tr key={c.id} className="hover:bg-slate-50/60 transition">
                      <td className="px-6 py-4 font-semibold text-slate-900">
                        <div>{c.name}</div>
                        {c.phone && <div className="text-xs text-slate-400 font-normal">{c.phone}</div>}
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${
                            c.type === "CUSTOMER"
                              ? "bg-blue-100 text-blue-700"
                              : c.type === "SUPPLIER"
                              ? "bg-purple-100 text-purple-700"
                              : "bg-emerald-100 text-emerald-700"
                          }`}
                        >
                          {c.type === "CUSTOMER"
                            ? "Müşteri"
                            : c.type === "SUPPLIER"
                            ? "Tedarikçi"
                            : "Müşteri + Tedarikçi"}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right font-semibold text-emerald-600">
                        {isReceivable ? formatCurrency(c.currentBalance) : "-"}
                      </td>
                      <td className="px-6 py-4 text-right font-semibold text-red-600">
                        {isPayable ? formatCurrency(Math.abs(c.currentBalance)) : "-"}
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span
                          className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${
                            c.currentBalance > 0
                              ? "bg-emerald-100 text-emerald-700"
                              : c.currentBalance < 0
                              ? "bg-red-100 text-red-700"
                              : "bg-slate-100 text-slate-600"
                          }`}
                        >
                          {balanceInfo.label}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right space-x-1.5">
                        {/* Tahsilat Al (Müşteri için) */}
                        {(c.type === "CUSTOMER" || c.type === "BOTH") && (
                          <button
                            onClick={() => {
                              setActivePaymentModal({ flow: "INCOMING", cari: c });
                              setPayAmount(c.currentBalance > 0 ? String(c.currentBalance) : "");
                              setPayDesc("Müşteriden tahsilat");
                              setPayError(null);
                            }}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 text-xs font-semibold transition"
                          >
                            <Plus className="w-3.5 h-3.5" />
                            <span>Tahsilat Al</span>
                          </button>
                        )}

                        {/* Ödeme Yap (Tedarikçi için) */}
                        {(c.type === "SUPPLIER" || c.type === "BOTH") && (
                          <button
                            onClick={() => {
                              setActivePaymentModal({ flow: "OUTGOING", cari: c });
                              setPayAmount(c.currentBalance < 0 ? String(Math.abs(c.currentBalance)) : "");
                              setPayDesc("Tedarikçiye ödeme");
                              setPayError(null);
                            }}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-red-50 text-red-700 hover:bg-red-100 text-xs font-semibold transition"
                          >
                            <Minus className="w-3.5 h-3.5" />
                            <span>Ödeme Yap</span>
                          </button>
                        )}

                        {/* Ekstre Butonu */}
                        <button
                          onClick={() => loadEkstre(c)}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-900 text-white hover:bg-slate-800 text-xs font-semibold transition"
                        >
                          <FileText className="w-3.5 h-3.5" />
                          <span>Ekstre</span>
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Ekstre (Statement) Modal */}
      {selectedCariForEkstre && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-3xl w-full p-6 shadow-2xl flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div>
                <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                  <FileText className="w-5 h-5 text-emerald-600" />
                  <span>Hesap Ekstresi: {selectedCariForEkstre.name}</span>
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Kronolojik cari hareketleri ve kümülatif bakiye dökümü
                </p>
              </div>
              <button
                onClick={() => setSelectedCariForEkstre(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Tarih Filtreleri */}
            <div className="flex flex-wrap items-center gap-3 py-3 border-b border-slate-100 text-xs">
              <span className="font-semibold text-slate-500">Tarih Filtresi:</span>
              <div className="flex items-center gap-1.5">
                <span>Başlangıç:</span>
                <input
                  type="date"
                  value={ekstreStartDate}
                  onChange={(e) => setEkstreStartDate(e.target.value)}
                  className="px-2 py-1 rounded-lg border border-slate-200 text-xs"
                />
              </div>
              <div className="flex items-center gap-1.5">
                <span>Bitiş:</span>
                <input
                  type="date"
                  value={ekstreEndDate}
                  onChange={(e) => setEkstreEndDate(e.target.value)}
                  className="px-2 py-1 rounded-lg border border-slate-200 text-xs"
                />
              </div>
              {(ekstreStartDate || ekstreEndDate) && (
                <button
                  onClick={() => {
                    setEkstreStartDate("");
                    setEkstreEndDate("");
                  }}
                  className="text-emerald-600 hover:underline text-xs ml-auto"
                >
                  Filtreyi Temizle
                </button>
              )}
            </div>

            {/* Ekstre Listesi */}
            <div className="flex-1 overflow-y-auto py-3">
              {ekstreLoading ? (
                <div className="text-center py-12 text-slate-400 text-sm">
                  <div className="inline-block animate-spin rounded-full h-6 w-6 border-2 border-emerald-600 border-t-transparent mb-2" />
                  <div>Ekstre yükleniyor...</div>
                </div>
              ) : filteredEkstre.length === 0 ? (
                <div className="text-center py-12 text-slate-400 text-sm">
                  Bu cari için henüz finansal hareket kaydı bulunmuyor.
                </div>
              ) : (
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase font-semibold">
                    <tr>
                      <th className="px-4 py-2.5">Tarih</th>
                      <th className="px-4 py-2.5">Açıklama</th>
                      <th className="px-4 py-2.5">Referans</th>
                      <th className="px-4 py-2.5 text-right text-emerald-700">Borç (+)</th>
                      <th className="px-4 py-2.5 text-right text-red-700">Alacak (-)</th>
                      <th className="px-4 py-2.5 text-right">Bakiye</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredEkstre.map((row) => (
                      <tr key={row.id} className="hover:bg-slate-50">
                        <td className="px-4 py-2.5 text-slate-500">{formatDate(row.date)}</td>
                        <td className="px-4 py-2.5 font-medium text-slate-900">{row.description}</td>
                        <td className="px-4 py-2.5 text-slate-400 font-mono text-[11px]">
                          {row.referenceType}
                        </td>
                        <td className="px-4 py-2.5 text-right font-semibold text-emerald-600">
                          {row.debitAmount !== null ? formatCurrency(row.debitAmount) : "-"}
                        </td>
                        <td className="px-4 py-2.5 text-right font-semibold text-red-600">
                          {row.creditAmount !== null ? formatCurrency(row.creditAmount) : "-"}
                        </td>
                        <td
                          className={`px-4 py-2.5 text-right font-bold ${
                            row.runningBalance > 0
                              ? "text-emerald-600"
                              : row.runningBalance < 0
                              ? "text-red-600"
                              : "text-slate-600"
                          }`}
                        >
                          {formatCurrency(row.runningBalance)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            {/* Ekstre Footer */}
            <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
              <span className="text-slate-500">
                Toplam Kayıt: <strong className="text-slate-800">{filteredEkstre.length}</strong>
              </span>
              <button
                onClick={() => setSelectedCariForEkstre(null)}
                className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold"
              >
                Kapat
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Payment / Collection Modal */}
      {activePaymentModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h2 className="text-lg font-bold text-slate-900">
                {activePaymentModal.flow === "INCOMING"
                  ? `Tahsilat Al: ${activePaymentModal.cari.name}`
                  : `Tedarikçiye Ödeme Yap: ${activePaymentModal.cari.name}`}
              </h2>
              <button
                onClick={() => setActivePaymentModal(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {payError && (
              <div className="p-3 bg-red-50 text-red-700 text-xs rounded-xl border border-red-200">
                {payError}
              </div>
            )}

            <form onSubmit={handlePaymentSubmit} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Tutar (TL) *
                </label>
                <input
                  type="number"
                  step="0.01"
                  required
                  placeholder="0.00"
                  value={payAmount}
                  onChange={(e) => setPayAmount(e.target.value)}
                  className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 font-semibold"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Ödeme Yöntemi
                  </label>
                  <select
                    value={payMethod}
                    onChange={(e) =>
                      setPayMethod(e.target.value as "CASH" | "BANK_TRANSFER" | "CREDIT_CARD")
                    }
                    className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 bg-white"
                  >
                    <option value="CASH">Nakit</option>
                    <option value="BANK_TRANSFER">Havale / EFT</option>
                    <option value="CREDIT_CARD">Kredi Kartı</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Tarih
                  </label>
                  <input
                    type="date"
                    required
                    value={payDate}
                    onChange={(e) => setPayDate(e.target.value)}
                    className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Açıklama
                </label>
                <input
                  type="text"
                  placeholder="İşlem açıklaması veya dekont no..."
                  value={payDesc}
                  onChange={(e) => setPayDesc(e.target.value)}
                  className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setActivePaymentModal(null)}
                  className="px-4 py-2 text-sm rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 font-medium"
                >
                  İptal
                </button>
                <button
                  type="submit"
                  disabled={paySubmitting}
                  className={`px-4 py-2 text-sm rounded-xl text-white font-semibold shadow-sm transition disabled:opacity-50 ${
                    activePaymentModal.flow === "INCOMING"
                      ? "bg-emerald-600 hover:bg-emerald-500"
                      : "bg-red-600 hover:bg-red-500"
                  }`}
                >
                  {paySubmitting
                    ? "Kaydediliyor..."
                    : activePaymentModal.flow === "INCOMING"
                    ? "Tahsilatı Kaydet"
                    : "Ödemeyi Kaydet"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default function CariHesapPage() {
  return (
    <Suspense
      fallback={
        <div className="py-12 text-center text-slate-400">
          <div className="inline-block animate-spin rounded-full h-6 w-6 border-2 border-emerald-600 border-t-transparent mb-2" />
          <div>Cari hesap yükleniyor...</div>
        </div>
      }
    >
      <CariHesapContent />
    </Suspense>
  );
}
