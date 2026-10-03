"use client";

import React, { useEffect, useState, useCallback } from "react";
import {
  Sparkles,
  Search,
  Filter,
  DollarSign,
  FileText,
  CreditCard,
  Ban,
  ShoppingBag,
  RefreshCw,
  AlertCircle,
} from "lucide-react";
import { LeadStatus } from "@/types";

interface DeviceInfo {
  id: string;
  imei?: string | null;
  status: string;
}

interface CustomerInfo {
  id: string;
  name: string;
  phone: string;
  balance: number;
}

interface SaleInfo {
  id: string;
  saleNumber: string;
  totalAmount: number;
  paidAmount: number;
  remainingAmount: number;
  status: string;
}

interface LeadItem {
  id: string;
  leadNumber: string;
  customerName: string;
  customerPhone: string;
  notes?: string | null;
  brand: string;
  modelName: string;
  ram: string;
  storage: string;
  color: string;
  snapshotPrice: number;
  snapshotStock: boolean;
  status: LeadStatus;
  depositAmount: number;
  depositStatus: string;
  depositMethod?: string | null;
  depositDate?: string | null;
  depositNotes?: string | null;
  depositRecordedBy?: string | null;
  refundAmount?: number | null;
  refundDate?: string | null;
  refundMethod?: string | null;
  refundNotes?: string | null;
  phoneModelId?: string | null;
  deviceId?: string | null;
  customerId?: string | null;
  saleId?: string | null;
  createdAt: string;
  updatedAt: string;
  deviceInfo?: DeviceInfo | null;
  customerInfo?: CustomerInfo | null;
  saleInfo?: SaleInfo | null;
  availableDevices?: Array<{
    id: string;
    imei?: string | null;
    ram: string;
    storage: string;
    color: string;
    salePrice: number;
    status: string;
  }>;
}

export default function SatisFirsatlariPage() {
  const [leads, setLeads] = useState<LeadItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");

  // Selected Lead for Detail Drawer
  const [selectedLead, setSelectedLead] = useState<LeadItem | null>(null);

  // Modals state
  const [depositModalLead, setDepositModalLead] = useState<LeadItem | null>(null);
  const [refundModalLead, setRefundModalLead] = useState<LeadItem | null>(null);
  const [saleModalLead, setSaleModalLead] = useState<LeadItem | null>(null);

  // Deposit Form State
  const [depositAmount, setDepositAmount] = useState<string>("");
  const [depositMethod, setDepositMethod] = useState<string>("CASH");
  const [depositNotes, setDepositNotes] = useState<string>("");
  const [depositDeviceId, setDepositDeviceId] = useState<string>("");
  const [depositLoading, setDepositLoading] = useState<boolean>(false);
  const [depositError, setDepositError] = useState<string | null>(null);

  // Refund Form State
  const [isRefunded, setIsRefunded] = useState<boolean>(true);
  const [refundAmount, setRefundAmount] = useState<string>("");
  const [refundMethod, setRefundMethod] = useState<string>("CASH");
  const [refundNotes, setRefundNotes] = useState<string>("");
  const [refundLoading, setRefundLoading] = useState<boolean>(false);
  const [refundError, setRefundError] = useState<string | null>(null);

  // Sale Conversion Form State
  const [saleFinalPrice, setSaleFinalPrice] = useState<string>("");
  const [saleDeviceId, setSaleDeviceId] = useState<string>("");
  const [confirmPriceChange, setConfirmPriceChange] = useState<boolean>(false);
  const [spotPaymentAmount, setSpotPaymentAmount] = useState<string>("");
  const [spotPaymentMethod, setSpotPaymentMethod] = useState<string>("CASH");
  const [saleLoading, setSaleLoading] = useState<boolean>(false);
  const [saleError, setSaleError] = useState<string | null>(null);

  // Available Devices for Modal
  const [modalAvailableDevices, setModalAvailableDevices] = useState<
    Array<{
      id: string;
      imei?: string | null;
      ram: string;
      storage: string;
      color: string;
      salePrice: number;
      status: string;
    }>
  >([]);

  // Fetch leads
  const fetchLeads = useCallback(async () => {
    try {
      setLoading(true);
      const url = `/api/admin/leads?status=${statusFilter}&search=${encodeURIComponent(search)}`;
      const res = await fetch(url);
      const json = await res.json();
      if (json.success && Array.isArray(json.data)) {
        setLeads(json.data);
      }
    } catch (err) {
      console.error("Satış fırsatları yükleme hatası:", err);
    } finally {
      setLoading(false);
    }
  }, [statusFilter, search]);

  useEffect(() => {
    fetchLeads();
  }, [fetchLeads]);

  // Load single lead details with available devices
  const loadLeadDetails = async (id: string): Promise<LeadItem | null> => {
    try {
      const res = await fetch(`/api/admin/leads/${id}`);
      const json = await res.json();
      if (json.success && json.data) {
        setModalAvailableDevices(json.data.availableDevices || []);
        return json.data;
      }
    } catch (err) {
      console.error("Lead detay çekme hatası:", err);
    }
    return null;
  };

  // Open Deposit Modal
  const handleOpenDepositModal = async (lead: LeadItem) => {
    const fullLead = await loadLeadDetails(lead.id);
    const targetLead = fullLead || lead;
    setDepositModalLead(targetLead);
    setDepositAmount(targetLead.snapshotPrice.toString());
    setDepositMethod("CASH");
    setDepositNotes("");
    setDepositDeviceId(targetLead.deviceId || (targetLead.availableDevices?.[0]?.id || ""));
    setDepositError(null);
  };

  // Submit Deposit
  const handleDepositSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!depositModalLead) return;
    setDepositError(null);

    const numAmount = Number(depositAmount);
    if (isNaN(numAmount) || numAmount <= 0) {
      setDepositError("Lütfen geçerli bir kapora tutarı giriniz.");
      return;
    }

    if (numAmount > depositModalLead.snapshotPrice) {
      setDepositError(
        `Kapora tutarı ürün fiyatını (${depositModalLead.snapshotPrice.toLocaleString("tr-TR")} ₺) aşamaz.`
      );
      return;
    }

    try {
      setDepositLoading(true);
      const res = await fetch(`/api/admin/leads/${depositModalLead.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "RECORD_DEPOSIT",
          depositAmount: numAmount,
          depositMethod,
          depositNotes: depositNotes.trim() || undefined,
          deviceId: depositDeviceId || undefined,
        }),
      });

      const json = await res.json();
      if (json.success) {
        setDepositModalLead(null);
        setSelectedLead(null);
        fetchLeads();
      } else {
        setDepositError(json.error || "Kapora kaydedilirken bir hata oluştu.");
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "İşlem sırasında sunucu hatası oluştu.";
      setDepositError(msg);
    } finally {
      setDepositLoading(false);
    }
  };

  // Open Refund Modal
  const handleOpenRefundModal = (lead: LeadItem) => {
    setRefundModalLead(lead);
    setIsRefunded(true);
    setRefundAmount(lead.depositAmount.toString());
    setRefundMethod("CASH");
    setRefundNotes("");
    setRefundError(null);
  };

  // Submit Refund
  const handleRefundSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!refundModalLead) return;
    setRefundError(null);

    if (isRefunded) {
      const numRefund = Number(refundAmount);
      if (isNaN(numRefund) || numRefund <= 0) {
        setRefundError("Lütfen geçerli bir iade tutarı giriniz.");
        return;
      }
      if (numRefund > refundModalLead.depositAmount) {
        setRefundError(
          `İade tutarı tahsil edilen kaporayı (${refundModalLead.depositAmount.toLocaleString("tr-TR")} ₺) aşamaz.`
        );
        return;
      }
    }

    try {
      setRefundLoading(true);
      const res = await fetch(`/api/admin/leads/${refundModalLead.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "REFUND_DEPOSIT",
          isRefunded,
          refundAmount: isRefunded ? Number(refundAmount) : 0,
          refundMethod,
          refundNotes: refundNotes.trim() || undefined,
        }),
      });

      const json = await res.json();
      if (json.success) {
        setRefundModalLead(null);
        setSelectedLead(null);
        fetchLeads();
      } else {
        setRefundError(json.error || "İade kaydedilirken hata oluştu.");
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Sunucu hatası oluştu.";
      setRefundError(msg);
    } finally {
      setRefundLoading(false);
    }
  };

  // Open Sale Conversion Modal
  const handleOpenSaleModal = async (lead: LeadItem) => {
    const fullLead = await loadLeadDetails(lead.id);
    const targetLead = fullLead || lead;

    setSaleModalLead(targetLead);
    setSaleFinalPrice(targetLead.snapshotPrice.toString());
    setSaleDeviceId(targetLead.deviceId || (targetLead.availableDevices?.[0]?.id || ""));
    setConfirmPriceChange(false);
    setSpotPaymentAmount("0");
    setSpotPaymentMethod("CASH");
    setSaleError(null);
  };

  // Submit Sale Conversion
  const handleSaleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!saleModalLead) return;
    setSaleError(null);

    const priceNum = Number(saleFinalPrice);
    if (isNaN(priceNum) || priceNum <= 0) {
      setSaleError("Lütfen geçerli bir satış fiyatı giriniz.");
      return;
    }

    if (!saleDeviceId) {
      setSaleError("Lütfen satış için stoktan bir cihaz seçiniz.");
      return;
    }

    if (priceNum !== saleModalLead.snapshotPrice && !confirmPriceChange) {
      setSaleError(
        `Satış fiyatı talep fiyatından farklı (${saleModalLead.snapshotPrice.toLocaleString("tr-TR")} ₺ -> ${priceNum.toLocaleString("tr-TR")} ₺). Lütfen fiyat değişikliğini onaylayınız.`
      );
      return;
    }

    try {
      setSaleLoading(true);
      const res = await fetch(`/api/admin/leads/${saleModalLead.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "CONVERT_TO_SALE",
          finalPrice: priceNum,
          confirmPriceChange,
          deviceId: saleDeviceId,
          spotPaymentAmount: Number(spotPaymentAmount) || 0,
          spotPaymentMethod,
        }),
      });

      const json = await res.json();
      if (json.success) {
        setSaleModalLead(null);
        setSelectedLead(null);
        fetchLeads();
      } else {
        setSaleError(json.error || "Satışa dönüştürülürken bir hata oluştu.");
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Sunucu hatası oluştu.";
      setSaleError(msg);
    } finally {
      setSaleLoading(false);
    }
  };

  // KPI Calculations
  const totalLeads = leads.length;
  const depositCollectedLeads = leads.filter((l) => l.depositStatus === "RECEIVED").length;
  const convertedLeads = leads.filter((l) => l.status === "SATISA_DONUSTU").length;
  const totalDepositAmount = leads.reduce((acc, l) => acc + (l.depositStatus === "RECEIVED" ? l.depositAmount : 0), 0);

  const getStatusBadge = (status: LeadStatus) => {
    switch (status) {
      case "YENI":
        return <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-blue-100 text-blue-800 dark:bg-blue-950/80 dark:text-blue-300 border border-blue-200">Yeni Talep</span>;
      case "KAPORA_BEKLENIYOR":
        return <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300 border border-amber-200">Kapora Bekleniyor</span>;
      case "KAPORA_ALINDI":
        return <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-purple-100 text-purple-800 dark:bg-purple-950/80 dark:text-purple-300 border border-purple-200">Kapora Alındı</span>;
      case "TEDARIKTE":
        return <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-indigo-100 text-indigo-800 dark:bg-indigo-950/80 dark:text-indigo-300 border border-indigo-200">Tedarikte</span>;
      case "TESLIME_HAZIR":
        return <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-teal-100 text-teal-800 dark:bg-teal-950/80 dark:text-teal-300 border border-teal-200">Teslime Hazır</span>;
      case "SATISA_DONUSTU":
        return <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300 border border-emerald-200">Satışa Dönüştü</span>;
      case "VAZGECTI":
        return <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-400 border border-slate-300">Vazgeçti / İptal</span>;
      default:
        return <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-700">{status}</span>;
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
            <Sparkles className="w-6 h-6 text-emerald-600" />
            <span>Satış Fırsatları & Kaporalı Rezervasyonlar</span>
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Müşteri vitrininden gelen talepleri, kapora takibini ve satışa dönüştürme işlemlerini yönetin.
          </p>
        </div>
        <button
          onClick={fetchLeads}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 transition shadow-sm self-start sm:self-auto"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin text-emerald-600" : ""}`} />
          <span>Yenile</span>
        </button>
      </div>

      {/* KPI Stats Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-slate-400 block">Toplam Talep</span>
            <span className="text-2xl font-black text-slate-900 dark:text-white">{totalLeads}</span>
          </div>
          <div className="w-11 h-11 rounded-2xl bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold">
            <FileText className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-slate-400 block">Kapora Alınanlar</span>
            <span className="text-2xl font-black text-purple-600 dark:text-purple-400">{depositCollectedLeads}</span>
          </div>
          <div className="w-11 h-11 rounded-2xl bg-purple-50 dark:bg-purple-950/50 text-purple-600 dark:text-purple-400 flex items-center justify-center font-bold">
            <CreditCard className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-slate-400 block">Satışa Dönüşenler</span>
            <span className="text-2xl font-black text-emerald-600 dark:text-emerald-400">{convertedLeads}</span>
          </div>
          <div className="w-11 h-11 rounded-2xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold">
            <ShoppingBag className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-slate-400 block">Toplanan Kapora</span>
            <span className="text-2xl font-black text-slate-900 dark:text-white">{totalDepositAmount.toLocaleString("tr-TR")} ₺</span>
          </div>
          <div className="w-11 h-11 rounded-2xl bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 flex items-center justify-center font-bold">
            <DollarSign className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
          <input
            type="text"
            placeholder="Müşteri adı, telefon, talep no veya model ara..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-xs font-medium border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>

        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-slate-400" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-bold text-slate-700 dark:text-slate-200 focus:outline-none"
          >
            <option value="ALL">Tüm Durumlar</option>
            <option value="YENI">Yeni Talepler</option>
            <option value="KAPORA_ALINDI">Kapora Alınanlar</option>
            <option value="TEDARIKTE">Tedarikte</option>
            <option value="TESLIME_HAZIR">Teslime Hazır</option>
            <option value="SATISA_DONUSTU">Satışa Dönüşenler</option>
            <option value="VAZGECTI">Vazgeçti / İptal</option>
          </select>
        </div>
      </div>

      {/* Leads Table */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-slate-800/80 text-slate-500 dark:text-slate-400 uppercase font-extrabold border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th className="px-4 py-3.5">Talep No</th>
                <th className="px-4 py-3.5">Müşteri / Telefon</th>
                <th className="px-4 py-3.5">Ürün / Varyant</th>
                <th className="px-4 py-3.5">Fiyat / Kapora</th>
                <th className="px-4 py-3.5">Durum</th>
                <th className="px-4 py-3.5">Bağlı Cihaz</th>
                <th className="px-4 py-3.5 text-right">Aksiyonlar</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-medium text-slate-700 dark:text-slate-300">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-slate-400">
                    Fırsatlar yükleniyor...
                  </td>
                </tr>
              ) : leads.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-slate-400">
                    Kriterlere uygun satış fırsatı bulunamadı.
                  </td>
                </tr>
              ) : (
                leads.map((lead) => {
                  const remaining = lead.snapshotPrice - lead.depositAmount;
                  return (
                    <tr key={lead.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition">
                      <td className="px-4 py-3 font-mono font-bold text-slate-900 dark:text-white">
                        {lead.leadNumber}
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-bold text-slate-900 dark:text-white">{lead.customerName}</div>
                        <div className="text-[11px] text-slate-400 font-mono">{lead.customerPhone}</div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-bold text-slate-900 dark:text-white">{lead.brand} {lead.modelName}</div>
                        <div className="text-[11px] text-slate-400 flex items-center gap-1 mt-0.5">
                          <span>{lead.ram}</span> • <span>{lead.storage}</span> • <span>{lead.color}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-extrabold text-slate-900 dark:text-white">
                          {lead.snapshotPrice.toLocaleString("tr-TR")} ₺
                        </div>
                        {lead.depositAmount > 0 ? (
                          <div className="text-[11px] text-purple-600 dark:text-purple-400 font-bold">
                            Kapora: {lead.depositAmount.toLocaleString("tr-TR")} ₺ (Kalan: {remaining.toLocaleString("tr-TR")} ₺)
                          </div>
                        ) : (
                          <div className="text-[11px] text-slate-400">Kapora Alınmadı</div>
                        )}
                      </td>
                      <td className="px-4 py-3">{getStatusBadge(lead.status)}</td>
                      <td className="px-4 py-3">
                        {lead.deviceInfo ? (
                          <div>
                            <span className="font-mono text-[11px] text-emerald-600 dark:text-emerald-400 font-bold block">
                              IMEI: {lead.deviceInfo.imei || "Cihaz Seçildi"}
                            </span>
                            <span className="text-[10px] text-slate-400">Status: {lead.deviceInfo.status}</span>
                          </div>
                        ) : (
                          <span className="text-[11px] text-slate-400 italic">Atanmadı</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right space-x-1.5 whitespace-nowrap">
                        <button
                          onClick={() => setSelectedLead(lead)}
                          className="px-2.5 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-[11px] hover:bg-slate-200 transition"
                        >
                          Detay
                        </button>

                        {lead.status !== "SATISA_DONUSTU" && lead.status !== "VAZGECTI" && (
                          <>
                            {lead.depositStatus !== "RECEIVED" && (
                              <button
                                onClick={() => handleOpenDepositModal(lead)}
                                className="px-2.5 py-1.5 rounded-lg bg-purple-600 text-white font-bold text-[11px] hover:bg-purple-500 transition shadow-sm"
                              >
                                Kapora Al
                              </button>
                            )}

                            <button
                              onClick={() => handleOpenSaleModal(lead)}
                              className="px-2.5 py-1.5 rounded-lg bg-emerald-600 text-white font-bold text-[11px] hover:bg-emerald-500 transition shadow-sm"
                            >
                              Satışa Dönüştür
                            </button>

                            <button
                              onClick={() => handleOpenRefundModal(lead)}
                              className="px-2.5 py-1.5 rounded-lg bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold text-[11px] hover:bg-red-50 hover:text-red-600 transition"
                            >
                              İptal / İade
                            </button>
                          </>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 1. KAPORA AL MODAL */}
      {depositModalLead && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-2xl space-y-4">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-purple-600" />
              <span>Kapora Alındı İşlemi</span>
            </h3>

            <div className="text-xs bg-slate-50 dark:bg-slate-800 p-3 rounded-xl space-y-1">
              <div><strong>Talep:</strong> {depositModalLead.leadNumber} - {depositModalLead.customerName}</div>
              <div><strong>Ürün:</strong> {depositModalLead.brand} {depositModalLead.modelName} ({depositModalLead.ram}/{depositModalLead.storage} - {depositModalLead.color})</div>
              <div><strong>Ürün Fiyatı:</strong> {depositModalLead.snapshotPrice.toLocaleString("tr-TR")} ₺</div>
            </div>

            {depositError && (
              <div className="p-3 rounded-xl bg-red-50 text-red-600 text-xs font-semibold flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{depositError}</span>
              </div>
            )}

            <form onSubmit={handleDepositSubmit} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Alınan Kapora Tutarı (₺) <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={depositAmount}
                  onChange={(e) => setDepositAmount(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm font-bold text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Ödeme Yöntemi</label>
                <select
                  value={depositMethod}
                  onChange={(e) => setDepositMethod(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-900 dark:text-white"
                >
                  <option value="CASH">Nakit</option>
                  <option value="BANK_TRANSFER">Banka Havalesi / EFT</option>
                  <option value="CREDIT_CARD">Kredi Kartı</option>
                </select>
              </div>

              {modalAvailableDevices.length > 0 && (
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Stoktaki Cihazı Rezerve Et (İsteğe Bağlı)
                  </label>
                  <select
                    value={depositDeviceId}
                    onChange={(e) => setDepositDeviceId(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-900 dark:text-white"
                  >
                    <option value="">Cihaz Bağlama (Tedarik Bekleniyor)</option>
                    {modalAvailableDevices.map((d) => (
                      <option key={d.id} value={d.id}>
                        IMEI: {d.imei || "IMEI'siz"} - {d.color} ({d.salePrice.toLocaleString("tr-TR")} ₺)
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Açıklama / Not</label>
                <input
                  type="text"
                  placeholder="Örn. Havale Ziraat hesabına geldi..."
                  value={depositNotes}
                  onChange={(e) => setDepositNotes(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setDepositModalLead(null)}
                  className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-xs font-bold text-slate-700 dark:text-slate-300"
                >
                  İptal
                </button>
                <button
                  type="submit"
                  disabled={depositLoading}
                  className="px-4 py-2 rounded-xl bg-purple-600 text-white font-bold text-xs hover:bg-purple-500 shadow"
                >
                  {depositLoading ? "Kaydediliyor..." : "Kaporayı Kaydet"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 2. VAZGEÇTİ / İADE MODAL */}
      {refundModalLead && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-2xl space-y-4">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Ban className="w-5 h-5 text-red-500" />
              <span>Talep İptali ve Kapora İşlemi</span>
            </h3>

            <div className="text-xs bg-slate-50 dark:bg-slate-800 p-3 rounded-xl space-y-1">
              <div><strong>Müşteri:</strong> {refundModalLead.customerName}</div>
              <div><strong>Alınmış Kapora:</strong> {refundModalLead.depositAmount.toLocaleString("tr-TR")} ₺</div>
            </div>

            {refundError && (
              <div className="p-3 rounded-xl bg-red-50 text-red-600 text-xs font-semibold flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{refundError}</span>
              </div>
            )}

            <form onSubmit={handleRefundSubmit} className="space-y-3">
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="isRefunded"
                  checked={isRefunded}
                  onChange={(e) => setIsRefunded(e.target.checked)}
                  className="w-4 h-4 text-emerald-600 rounded"
                />
                <label htmlFor="isRefunded" className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Kapora Müşteriye İade Edildi mi?
                </label>
              </div>

              {isRefunded && (
                <>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      İade Edilen Tutar (₺)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      required
                      value={refundAmount}
                      onChange={(e) => setRefundAmount(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm font-bold text-slate-900 dark:text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">İade Yöntemi</label>
                    <select
                      value={refundMethod}
                      onChange={(e) => setRefundMethod(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-900 dark:text-white"
                    >
                      <option value="CASH">Nakit</option>
                      <option value="BANK_TRANSFER">Banka Havalesi / EFT</option>
                      <option value="CREDIT_CARD">Kredi Kartı</option>
                    </select>
                  </div>
                </>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">İptal/İade Notu</label>
                <input
                  type="text"
                  placeholder="Örn. Müşteri vazgeçti, kapora IBAN'a iade edildi..."
                  value={refundNotes}
                  onChange={(e) => setRefundNotes(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setRefundModalLead(null)}
                  className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-xs font-bold text-slate-700 dark:text-slate-300"
                >
                  Vazgeç
                </button>
                <button
                  type="submit"
                  disabled={refundLoading}
                  className="px-4 py-2 rounded-xl bg-red-600 text-white font-bold text-xs hover:bg-red-500 shadow"
                >
                  {refundLoading ? "İşleniyor..." : "İptal/İadeyi Tamamla"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 3. SATIŞA DÖNÜŞTÜR MODAL */}
      {saleModalLead && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-2xl space-y-4">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <ShoppingBag className="w-5 h-5 text-emerald-600" />
              <span>Satışa Dönüştürme İşlemi</span>
            </h3>

            <div className="text-xs bg-slate-50 dark:bg-slate-800 p-3 rounded-xl space-y-1">
              <div><strong>Talep:</strong> {saleModalLead.leadNumber} - {saleModalLead.customerName}</div>
              <div><strong>Talep Ürün Fiyatı:</strong> {saleModalLead.snapshotPrice.toLocaleString("tr-TR")} ₺</div>
              <div><strong>Önceden Alınan Kapora:</strong> {saleModalLead.depositAmount.toLocaleString("tr-TR")} ₺</div>
            </div>

            {saleError && (
              <div className="p-3 rounded-xl bg-red-50 text-red-600 text-xs font-semibold flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{saleError}</span>
              </div>
            )}

            <form onSubmit={handleSaleSubmit} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Satılacak Cihazı Seçin <span className="text-red-500">*</span>
                </label>
                <select
                  required
                  value={saleDeviceId}
                  onChange={(e) => setSaleDeviceId(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-900 dark:text-white"
                >
                  <option value="">-- Stoktan Cihaz Seçin --</option>
                  {modalAvailableDevices.map((d) => (
                    <option key={d.id} value={d.id}>
                      IMEI: {d.imei || "IMEI'siz"} - {d.color} ({d.salePrice.toLocaleString("tr-TR")} ₺)
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Final Satış Fiyatı (₺)
                </label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={saleFinalPrice}
                  onChange={(e) => setSaleFinalPrice(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm font-extrabold text-slate-900 dark:text-white"
                />
              </div>

              {Number(saleFinalPrice) !== saleModalLead.snapshotPrice && (
                <div className="p-3 bg-amber-50 dark:bg-amber-950/40 rounded-xl border border-amber-200 text-xs space-y-2">
                  <div className="font-bold text-amber-800 dark:text-amber-300">
                    Fiyat Değişikliği Tespit Edildi!
                  </div>
                  <p className="text-amber-700 dark:text-amber-400">
                    Talep fiyatı ({saleModalLead.snapshotPrice.toLocaleString("tr-TR")} ₺), girilen yeni fiyat ({Number(saleFinalPrice).toLocaleString("tr-TR")} ₺) ile farklı.
                  </p>
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="confirmPrice"
                      checked={confirmPriceChange}
                      onChange={(e) => setConfirmPriceChange(e.target.checked)}
                      className="w-4 h-4 text-amber-600 rounded"
                    />
                    <label htmlFor="confirmPrice" className="font-bold text-amber-900 dark:text-amber-200">
                      Fiyat değişikliğini onaylıyorum.
                    </label>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Teslim Anında Ek Alınan Nakit (₺)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={spotPaymentAmount}
                    onChange={(e) => setSpotPaymentAmount(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Ek Ödeme Yöntemi
                  </label>
                  <select
                    value={spotPaymentMethod}
                    onChange={(e) => setSpotPaymentMethod(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold"
                  >
                    <option value="CASH">Nakit</option>
                    <option value="BANK_TRANSFER">Banka Havalesi</option>
                    <option value="CREDIT_CARD">Kredi Kartı</option>
                  </select>
                </div>
              </div>

              {/* Summary Calculation */}
              <div className="p-3 bg-slate-100 dark:bg-slate-800 rounded-xl text-xs space-y-1 font-medium text-slate-700 dark:text-slate-300">
                <div className="flex justify-between">
                  <span>Satış Tutarı:</span>
                  <strong>{(Number(saleFinalPrice) || 0).toLocaleString("tr-TR")} ₺</strong>
                </div>
                <div className="flex justify-between text-purple-600 dark:text-purple-400">
                  <span>Alınmış Kapora:</span>
                  <strong>-{(saleModalLead.depositAmount || 0).toLocaleString("tr-TR")} ₺</strong>
                </div>
                {Number(spotPaymentAmount) > 0 && (
                  <div className="flex justify-between text-blue-600 dark:text-blue-400">
                    <span>Teslim Anı Ek Ödeme:</span>
                    <strong>-{(Number(spotPaymentAmount) || 0).toLocaleString("tr-TR")} ₺</strong>
                  </div>
                )}
                <div className="flex justify-between pt-1 border-t border-slate-200 dark:border-slate-700 text-sm font-extrabold text-slate-900 dark:text-white">
                  <span>Kalan Cari Borç:</span>
                  <span>
                    {Math.max(
                      0,
                      (Number(saleFinalPrice) || 0) -
                        saleModalLead.depositAmount -
                        (Number(spotPaymentAmount) || 0)
                    ).toLocaleString("tr-TR")}{" "}
                    ₺
                  </span>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setSaleModalLead(null)}
                  className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-xs font-bold text-slate-700 dark:text-slate-300"
                >
                  Vazgeç
                </button>
                <button
                  type="submit"
                  disabled={saleLoading}
                  className="px-4 py-2 rounded-xl bg-emerald-600 text-white font-bold text-xs hover:bg-emerald-500 shadow"
                >
                  {saleLoading ? "Satış Yapılıyor..." : "Satışı Tamamla"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 4. DETAIL DRAWER / MODAL */}
      {selectedLead && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b pb-3 border-slate-100 dark:border-slate-800">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Fırsat Detayı #{selectedLead.leadNumber}
              </h3>
              <button
                onClick={() => setSelectedLead(null)}
                className="text-slate-400 hover:text-slate-600 font-bold"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-2 bg-slate-50 dark:bg-slate-800 p-3 rounded-xl">
                <div>
                  <span className="text-slate-400 block">Müşteri Adı:</span>
                  <strong className="text-slate-900 dark:text-white text-sm">{selectedLead.customerName}</strong>
                </div>
                <div>
                  <span className="text-slate-400 block">Telefon:</span>
                  <strong className="text-slate-900 dark:text-white text-sm">{selectedLead.customerPhone}</strong>
                </div>
              </div>

              <div className="bg-slate-50 dark:bg-slate-800 p-3 rounded-xl space-y-1">
                <span className="text-slate-400 block font-bold">Talep Edilen Cihaz</span>
                <div className="text-sm font-extrabold text-slate-900 dark:text-white">
                  {selectedLead.brand} {selectedLead.modelName}
                </div>
                <div className="text-slate-500 flex gap-2">
                  <span>{selectedLead.ram} RAM</span> • <span>{selectedLead.storage}</span> • <span>{selectedLead.color}</span>
                </div>
                <div className="text-slate-900 dark:text-white font-extrabold pt-1">
                  Talep Anı Fiyatı: {selectedLead.snapshotPrice.toLocaleString("tr-TR")} ₺
                </div>
              </div>

              <div className="bg-purple-50 dark:bg-purple-950/40 border border-purple-100 dark:border-purple-900/60 p-3 rounded-xl space-y-1">
                <span className="text-purple-700 dark:text-purple-300 font-bold block">Kapora & İade Durumu</span>
                <div><strong>Kapora Durumu:</strong> {selectedLead.depositStatus}</div>
                <div><strong>Alınan Kapora:</strong> {selectedLead.depositAmount.toLocaleString("tr-TR")} ₺</div>
                {selectedLead.depositMethod && <div><strong>Ödeme Yöntemi:</strong> {selectedLead.depositMethod}</div>}
                {selectedLead.depositDate && <div><strong>Tarih:</strong> {new Date(selectedLead.depositDate).toLocaleString("tr-TR")}</div>}
                {selectedLead.depositNotes && <div><strong>Not:</strong> {selectedLead.depositNotes}</div>}

                {selectedLead.refundAmount && selectedLead.refundAmount > 0 ? (
                  <div className="pt-2 border-t border-purple-200 dark:border-purple-900 text-red-600 dark:text-red-400">
                    <div><strong>İade Edilen Tutar:</strong> {selectedLead.refundAmount.toLocaleString("tr-TR")} ₺</div>
                    {selectedLead.refundNotes && <div><strong>İade Notu:</strong> {selectedLead.refundNotes}</div>}
                  </div>
                ) : null}
              </div>

              {selectedLead.notes && (
                <div className="bg-slate-50 dark:bg-slate-800 p-3 rounded-xl">
                  <span className="text-slate-400 block font-bold">Müşteri Notu:</span>
                  <p className="text-slate-700 dark:text-slate-300 mt-0.5">{selectedLead.notes}</p>
                </div>
              )}
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setSelectedLead(null)}
                className="px-4 py-2 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-bold text-xs"
              >
                Kapat
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
