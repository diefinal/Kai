"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import {
  ShoppingCart,
  Search,
  CheckCircle2,
  ChevronRight,
  X,
  AlertCircle,
  Trash2,
  Calendar,
  Ban,
  UserPlus,
} from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/utils";

interface SaleListItem {
  id: string;
  saleNumber: string;
  saleDate: string;
  totalAmount: number;
  totalProfit: number;
  paidAmount: number;
  remainingAmount: number;
  paymentType: "CASH" | "PARTIAL" | "INSTALLMENT";
  status: "COMPLETED" | "CANCELLED";
  notes: string | null;
  cancelledAt: string | null;
  cancelReason: string | null;
  customer: {
    id: string;
    name: string;
    phone: string | null;
    currentBalance: number;
  };
  items: Array<{
    id: string;
    deviceId: string;
    soldPrice: number;
    purchasePriceSnapshot: number;
    profit: number;
    imei: string | null;
    model: {
      id: string;
      brand: string;
      modelName: string;
      ram: string;
      storage: string;
      color: string;
    };
  }>;
  installments: Array<{
    id: string;
    installmentNumber: number;
    amount: number;
    dueDate: string;
    paidAmount: number;
    status: string;
    paidDate: string | null;
  }>;
  payments: Array<{
    id: string;
    amount: number;
    type: string;
    method: string;
    date: string;
    description: string | null;
  }>;
}

interface InStockDevice {
  id: string;
  imei: string | null;
  purchasePrice: number;
  salePrice: number;
  model: {
    id: string;
    brand: string;
    modelName: string;
    ram: string;
    storage: string;
    color: string;
  };
}

interface CustomerOption {
  id: string;
  name: string;
  phone: string | null;
  type: string;
  currentBalance: number;
}

export default function SatislarPage() {
  const [sales, setSales] = useState<SaleListItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [paymentTypeFilter, setPaymentTypeFilter] = useState("ALL");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  // Modals
  const [isNewSaleOpen, setIsNewSaleOpen] = useState(false);
  const [selectedSaleDetail, setSelectedSaleDetail] = useState<SaleListItem | null>(null);
  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState("");
  const [cancelling, setCancelling] = useState(false);

  // Delete Sale Modal States
  const [deletingSaleDetail, setDeletingSaleDetail] = useState<SaleListItem | null>(null);
  const [isDeleteSaleModalOpen, setIsDeleteSaleModalOpen] = useState(false);
  const [deleteSaleSubmitting, setDeleteSaleSubmitting] = useState(false);
  const [deleteSaleError, setDeleteSaleError] = useState<string | null>(null);

  // New Sale Form States
  const [customers, setCustomers] = useState<CustomerOption[]>([]);
  const [availableDevices, setAvailableDevices] = useState<InStockDevice[]>([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState("");
  const [saleDate, setSaleDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [paymentType, setPaymentType] = useState<"CASH" | "PARTIAL" | "INSTALLMENT">("CASH");
  const [paidAmountInput, setPaidAmountInput] = useState("");
  const [notesInput, setNotesInput] = useState("");

  // Selected Devices for Sale
  const [saleItems, setSaleItems] = useState<
    Array<{ device: InStockDevice; soldPrice: string }>
  >([]);

  // Installment Plan
  const [installmentCount, setInstallmentCount] = useState("3");
  const [firstDueDate, setFirstDueDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 30);
    return d.toISOString().split("T")[0];
  });

  // Quick Customer Form Modal
  const [isQuickCustomerOpen, setIsQuickCustomerOpen] = useState(false);
  const [newCustName, setNewCustName] = useState("");
  const [newCustPhone, setNewCustPhone] = useState("");
  const [quickCustSubmitting, setQuickCustSubmitting] = useState(false);

  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Pagination
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  // Load Sales Data
  const loadSales = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      params.set("page", page.toString());
      params.set("limit", "20");
      if (search) params.set("search", search);
      if (statusFilter !== "ALL") params.set("status", statusFilter);
      if (paymentTypeFilter !== "ALL") params.set("paymentType", paymentTypeFilter);
      if (startDate) params.set("startDate", startDate);
      if (endDate) params.set("endDate", endDate);

      const res = await fetch(`/api/admin/sales?${params.toString()}`);
      const json = await res.json();
      if (json.success && Array.isArray(json.data)) {
        setSales(json.data);
        if (json.pagination) {
          setTotalPages(json.pagination.totalPages || 1);
          setTotalCount(json.pagination.total || 0);
        }
      }
    } catch (err) {
      console.error("Satışlar yüklenirken hata:", err);
    } finally {
      setLoading(false);
    }
  }, [page, search, statusFilter, paymentTypeFilter, startDate, endDate]);

  // Reset page to 1 when filters change
  useEffect(() => {
    setPage(1);
  }, [search, statusFilter, paymentTypeFilter, startDate, endDate]);

  useEffect(() => {
    loadSales();
  }, [loadSales]);

  // Load Customers & In-Stock Devices for New Sale Modal
  const openNewSaleModal = async () => {
    setFormError(null);
    setFormSuccess(null);
    setSaleItems([]);
    setPaymentType("CASH");
    setPaidAmountInput("");
    setNotesInput("");
    setSaleDate(new Date().toISOString().split("T")[0]);

    try {
      const [custRes, stockRes] = await Promise.all([
        fetch("/api/admin/cariler?type=CUSTOMER"),
        fetch("/api/admin/stocks"),
      ]);

      const custJson = await custRes.json();
      const stockJson = await stockRes.json();

      if (custJson.success && Array.isArray(custJson.data)) {
        setCustomers(custJson.data);
        if (custJson.data.length > 0) setSelectedCustomerId(custJson.data[0].id);
      }

      // Sadece IN_STOCK olan cihazları düz listeye çıkar
      if (stockJson.success && Array.isArray(stockJson.data)) {
        interface RawDevice {
          id: string;
          imei: string | null;
          ram?: string;
          storage?: string;
          color?: string;
          purchasePrice: number;
          salePrice: number;
          status: string;
        }
        interface RawModel {
          id: string;
          brand: string;
          modelName: string;
          ram?: string;
          storage: string;
          color: string;
          basePrice: number;
          devices: RawDevice[];
        }

        const inStockList: InStockDevice[] = [];
        (stockJson.data as RawModel[]).forEach((model) => {
          if (Array.isArray(model.devices)) {
            model.devices.forEach((dev) => {
              if (dev.status === "IN_STOCK") {
                inStockList.push({
                  id: dev.id,
                  imei: dev.imei,
                  purchasePrice: dev.purchasePrice,
                  salePrice: dev.salePrice || model.basePrice,
                  model: {
                    id: model.id,
                    brand: model.brand,
                    modelName: model.modelName,
                    ram: dev.ram || model.ram || "8 GB",
                    storage: dev.storage || model.storage,
                    color: dev.color || model.color,
                  },
                });
              }
            });
          }
        });
        setAvailableDevices(inStockList);
      }

      setIsNewSaleOpen(true);
    } catch (err) {
      console.error("Satış formu verileri yüklenemedi:", err);
    }
  };

  // Add Device to Sale Cart
  const handleAddDeviceToCart = (devId: string) => {
    if (!devId) return;
    const found = availableDevices.find((d) => d.id === devId);
    if (!found) return;
    if (saleItems.some((item) => item.device.id === devId)) return;

    setSaleItems((prev) => [
      ...prev,
      { device: found, soldPrice: String(found.salePrice) },
    ]);
  };

  const handleRemoveFromCart = (devId: string) => {
    setSaleItems((prev) => prev.filter((item) => item.device.id !== devId));
  };

  const handlePriceChange = (devId: string, val: string) => {
    setSaleItems((prev) =>
      prev.map((item) => (item.device.id === devId ? { ...item, soldPrice: val } : item))
    );
  };

  // Calculations
  const calculatedTotal = useMemo(() => {
    return saleItems.reduce((acc, curr) => acc + (Number(curr.soldPrice) || 0), 0);
  }, [saleItems]);

  const calculatedCost = useMemo(() => {
    return saleItems.reduce((acc, curr) => acc + curr.device.purchasePrice, 0);
  }, [saleItems]);

  const calculatedProfit = useMemo(() => {
    return calculatedTotal - calculatedCost;
  }, [calculatedTotal, calculatedCost]);

  const calculatedPaid = useMemo(() => {
    if (paymentType === "CASH") return calculatedTotal;
    const p = Number(paidAmountInput);
    return isNaN(p) ? 0 : p;
  }, [paymentType, calculatedTotal, paidAmountInput]);

  const calculatedRemaining = useMemo(() => {
    return Math.max(0, Math.round((calculatedTotal - calculatedPaid) * 100) / 100);
  }, [calculatedTotal, calculatedPaid]);

  // Installment Plan Preview (Kuruş farkı son taksite dengelenir)
  const installmentPlanPreview = useMemo(() => {
    if (paymentType !== "INSTALLMENT" || calculatedRemaining <= 0) return [];
    const count = Number(installmentCount) || 1;
    const baseAmt = Math.floor((calculatedRemaining / count) * 100) / 100;
    const lastAmt = Math.round((calculatedRemaining - baseAmt * (count - 1)) * 100) / 100;

    const baseD = new Date(firstDueDate);
    const plan = [];
    for (let i = 1; i <= count; i++) {
      const d = new Date(baseD.getTime() + (i - 1) * 30 * 86400000);
      plan.push({
        num: i,
        amount: i === count ? lastAmt : baseAmt,
        date: d.toLocaleDateString("tr-TR"),
      });
    }
    return plan;
  }, [paymentType, calculatedRemaining, installmentCount, firstDueDate]);

  // Submit Sale
  const handleSubmitSale = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setFormSuccess(null);

    if (!selectedCustomerId) {
      setFormError("Lütfen bir müşteri seçiniz.");
      return;
    }

    if (saleItems.length === 0) {
      setFormError("Lütfen satılacak en az bir cihaz seçiniz.");
      return;
    }

    // Fiyat kontrolleri
    for (const item of saleItems) {
      const p = Number(item.soldPrice);
      if (isNaN(p) || p < 0 || item.soldPrice === "") {
        const deviceName = `${item.device.model.brand} ${item.device.model.modelName}`;
        const imeiLabel = item.device.imei ? `(IMEI: ${item.device.imei})` : "(IMEI'siz)";
        setFormError(`${deviceName} ${imeiLabel} için geçerli bir satış fiyatı giriniz.`);
        return;
      }
    }

    if (paymentType === "PARTIAL" && (calculatedPaid <= 0 || calculatedPaid > calculatedTotal)) {
      setFormError("Kısmi satışta ödenen tutar 0 ile toplam tutar arasında olmalıdır.");
      return;
    }

    setSubmitting(true);

    try {
      const res = await fetch("/api/admin/sales", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerId: selectedCustomerId,
          saleDate,
          paymentType,
          paidAmount: calculatedPaid,
          items: saleItems.map((it) => ({
            deviceId: it.device.id,
            soldPrice: Number(it.soldPrice),
          })),
          installmentPlan:
            paymentType === "INSTALLMENT"
              ? {
                  count: Number(installmentCount),
                  firstDueDate,
                  periodDays: 30,
                }
              : undefined,
          notes: notesInput,
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        setFormError(json.error || "Satış işlemi gerçekleştirilemedi.");
      } else {
        setFormSuccess("Satış işlemi başarıyla tamamlandı!");
        await loadSales();
        setTimeout(() => {
          setIsNewSaleOpen(false);
        }, 700);
      }
    } catch {
      setFormError("Sunucu bağlantı hatası oluştu.");
    } finally {
      setSubmitting(false);
    }
  };

  // Quick Customer Submit
  const handleQuickCustomerSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCustName.trim()) return;

    setQuickCustSubmitting(true);
    try {
      const res = await fetch("/api/admin/cariler", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newCustName.trim(),
          phone: newCustPhone.trim() || null,
          type: "CUSTOMER",
        }),
      });
      const json = await res.json();
      if (json.success && json.data) {
        setCustomers((prev) => [json.data, ...prev]);
        setSelectedCustomerId(json.data.id);
        setIsQuickCustomerOpen(false);
        setNewCustName("");
        setNewCustPhone("");
      }
    } catch (err) {
      console.error("Hızlı müşteri eklenemedi:", err);
    } finally {
      setQuickCustSubmitting(false);
    }
  };

  // Cancel Sale Handler
  const handleConfirmCancelSale = async () => {
    if (!selectedSaleDetail) return;
    setCancelling(true);

    try {
      const res = await fetch(`/api/admin/sales/${selectedSaleDetail.id}/cancel`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cancelReason }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        alert(json.error || "Satış iptal edilemedi.");
      } else {
        alert(json.message);
        setIsCancelModalOpen(false);
        setSelectedSaleDetail(null);
        await loadSales();
      }
    } catch {
      alert("Bağlantı hatası oluştu.");
    } finally {
      setCancelling(false);
    }
  };

  const handleOpenDeleteSale = (sale: SaleListItem) => {
    setDeletingSaleDetail(sale);
    setDeleteSaleError(null);
    setIsDeleteSaleModalOpen(true);
  };

  const handleConfirmDeleteSale = async () => {
    if (!deletingSaleDetail) return;
    setDeleteSaleError(null);
    setDeleteSaleSubmitting(true);

    try {
      const res = await fetch(`/api/admin/sales/${deletingSaleDetail.id}`, {
        method: "DELETE",
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        setDeleteSaleError(json.error || "Satış kaydı silinemedi.");
      } else {
        setIsDeleteSaleModalOpen(false);
        setDeletingSaleDetail(null);
        setSelectedSaleDetail(null);
        await loadSales();
      }
    } catch {
      setDeleteSaleError("Sunucu bağlantı hatası oluştu.");
    } finally {
      setDeleteSaleSubmitting(false);
    }
  };


  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
            Cihaz Satışları
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            Fiziksel stoktaki telefonların peşin, vadeli veya taksitli satışı ve kâr yönetimi.
          </p>
        </div>

        <button
          onClick={openNewSaleModal}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-sm font-semibold transition shadow-sm"
        >
          <ShoppingCart className="w-4 h-4" />
          <span>Yeni Satış Yap</span>
        </button>
      </div>

      {/* Filters & Search */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Satış no, müşteri adı, telefon veya IMEI ara..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-slate-900"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="text-xs font-medium px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-slate-700 focus:outline-none"
          >
            <option value="ALL">Tüm Durumlar</option>
            <option value="COMPLETED">Tamamlanan Satışlar</option>
            <option value="CANCELLED">İptal Edilenler</option>
          </select>

          {/* Payment Type */}
          <select
            value={paymentTypeFilter}
            onChange={(e) => setPaymentTypeFilter(e.target.value)}
            className="text-xs font-medium px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-slate-700 focus:outline-none"
          >
            <option value="ALL">Tüm Ödeme Tipleri</option>
            <option value="CASH">Peşin</option>
            <option value="PARTIAL">Kısmi Ödeme</option>
            <option value="INSTALLMENT">Taksitli / Vadeli</option>
          </select>

          {/* Date Range */}
          <div className="flex items-center gap-1.5 text-xs text-slate-600 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-xl">
            <Calendar className="w-3.5 h-3.5 text-slate-400" />
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="bg-transparent focus:outline-none text-xs"
            />
            <span>-</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="bg-transparent focus:outline-none text-xs"
            />
          </div>
        </div>
      </div>

      {/* Sales Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-slate-400 text-sm">Satışlar yükleniyor...</div>
        ) : sales.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <ShoppingCart className="w-10 h-10 text-slate-300 mx-auto" />
            <p className="text-slate-600 font-medium">Henüz kayıtlı satış bulunmuyor.</p>
            <p className="text-xs text-slate-400">
              Stoktaki cihazları satmak için &quot;Yeni Satış Yap&quot; butonuna tıklayabilirsiniz.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200 text-xs uppercase font-semibold text-slate-500 tracking-wider">
                  <th className="py-3.5 px-4">Satış No & Tarih</th>
                  <th className="py-3.5 px-4">Müşteri</th>
                  <th className="py-3.5 px-4">Satılan Cihaz(lar)</th>
                  <th className="py-3.5 px-4">Toplam Tutar</th>
                  <th className="py-3.5 px-4">Ödenen / Kalan</th>
                  <th className="py-3.5 px-4">Ödeme Tipi</th>
                  <th className="py-3.5 px-4">Durum</th>
                  <th className="py-3.5 px-4 text-right">Detay</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {sales.map((s) => {
                  let payBadge = (
                    <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700">
                      Peşin
                    </span>
                  );
                  if (s.paymentType === "PARTIAL") {
                    payBadge = (
                      <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-700">
                        Kısmi
                      </span>
                    );
                  } else if (s.paymentType === "INSTALLMENT") {
                    payBadge = (
                      <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-purple-50 text-purple-700">
                        Taksitli
                      </span>
                    );
                  }

                  const isCancelled = s.status === "CANCELLED";

                  return (
                    <tr
                      key={s.id}
                      onClick={() => setSelectedSaleDetail(s)}
                      className={`hover:bg-slate-50/80 transition cursor-pointer ${
                        isCancelled ? "opacity-60 bg-red-50/20" : ""
                      }`}
                    >
                      <td className="py-3.5 px-4">
                        <span className="font-mono font-bold text-slate-900 block leading-tight">
                          {s.saleNumber}
                        </span>
                        <span className="text-xs text-slate-400">{formatDate(s.saleDate)}</span>
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="font-semibold text-slate-900 block leading-tight">
                          {s.customer.name}
                        </span>
                        {s.customer.phone && (
                          <span className="text-xs text-slate-500">{s.customer.phone}</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-xs text-slate-600">
                        {s.items.map((it) => (
                          <div key={it.id} className="leading-snug">
                            <span className="font-medium text-slate-800">
                              {it.model.brand} {it.model.modelName} ({it.model.ram || "8 GB"} / {it.model.storage} / {it.model.color})
                            </span>
                            <span className="text-slate-400 ml-1 font-mono text-[11px]">
                              {it.imei ? `(${it.imei})` : "(IMEI Yok)"}
                            </span>
                          </div>
                        ))}
                      </td>
                      <td className="py-3.5 px-4 font-bold text-slate-900">
                        {formatCurrency(s.totalAmount)}
                      </td>
                      <td className="py-3.5 px-4 text-xs">
                        <div className="text-emerald-700 font-semibold">
                          {formatCurrency(s.paidAmount)}
                        </div>
                        {s.remainingAmount > 0 && (
                          <div className="text-amber-700 font-medium">
                            Kalan: {formatCurrency(s.remainingAmount)}
                          </div>
                        )}
                      </td>
                      <td className="py-3.5 px-4">{payBadge}</td>
                      <td className="py-3.5 px-4">
                        {isCancelled ? (
                          <span className="inline-flex items-center gap-1 text-xs font-semibold text-red-600">
                            <Ban className="w-3.5 h-3.5" />
                            İptal Edildi
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-600">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            Tamamlandı
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleOpenDeleteSale(s);
                            }}
                            title="Satış Kaydını Sil"
                            className="p-1.5 rounded-lg border border-red-200 hover:bg-red-50 text-red-600 transition"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedSaleDetail(s);
                            }}
                            title="Detay Göster"
                            className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 text-slate-700"
                          >
                            <ChevronRight className="w-4 h-4" />
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

        {/* Pagination Footer */}
        {totalCount > 0 && (
          <div className="px-4 py-3 bg-slate-50/80 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
            <span className="text-slate-500 font-medium">
              Toplam <strong>{totalCount}</strong> satış kaydından{" "}
              <strong>{(page - 1) * 20 + 1}</strong> -{" "}
              <strong>{Math.min(page * 20, totalCount)}</strong> arası gösteriliyor.
            </span>

            {totalPages > 1 && (
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 disabled:opacity-40 font-semibold text-slate-700 transition shadow-xs"
                >
                  ← Önceki
                </button>
                <span className="px-2.5 font-bold text-slate-700">
                  {page} / {totalPages}
                </span>
                <button
                  type="button"
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 disabled:opacity-40 font-semibold text-slate-700 transition shadow-xs"
                >
                  Sonraki →
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* New Sale Modal */}
      {isNewSaleOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-3xl w-full p-6 sm:p-8 shadow-2xl border border-slate-200 my-8">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <h2 className="text-xl font-bold text-slate-900">Yeni Satış İşlemi</h2>
              <button
                onClick={() => setIsNewSaleOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {formError && (
              <div className="mt-4 p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2.5">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            {formSuccess && (
              <div className="mt-4 p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs flex items-center gap-2.5">
                <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                <span>{formSuccess}</span>
              </div>
            )}

            <form onSubmit={handleSubmitSale} className="mt-5 space-y-4">
              {/* Müşteri Seçimi & Hızlı Ekleme */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">
                      Müşteri *
                    </label>
                    <button
                      type="button"
                      onClick={() => setIsQuickCustomerOpen(true)}
                      className="text-xs text-emerald-600 font-semibold hover:underline flex items-center gap-1"
                    >
                      <UserPlus className="w-3.5 h-3.5" />
                      <span>+ Hızlı Müşteri Ekle</span>
                    </button>
                  </div>
                  <select
                    value={selectedCustomerId}
                    onChange={(e) => setSelectedCustomerId(e.target.value)}
                    required
                    className="w-full py-2.5 px-3 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900"
                  >
                    <option value="">-- Müşteri Seçiniz --</option>
                    {customers.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} {c.phone ? `(${c.phone})` : ""}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    Satış Tarihi *
                  </label>
                  <input
                    type="date"
                    required
                    value={saleDate}
                    onChange={(e) => setSaleDate(e.target.value)}
                    className="w-full py-2 px-3 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900"
                  />
                </div>
              </div>

              {/* Satılacak Cihaz Seçici (Yalnızca IN_STOCK olanlar) */}
              <div className="pt-2">
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Stoktan Cihaz Ekle (Yalnızca Stoktaki Cihazlar)
                </label>
                <select
                  onChange={(e) => {
                    handleAddDeviceToCart(e.target.value);
                    e.target.value = "";
                  }}
                  className="w-full py-2 px-3 rounded-xl border border-slate-300 text-xs focus:outline-none focus:ring-2 focus:ring-slate-900"
                >
                  <option value="">-- Listeden Cihaz Seçip Ekleyin --</option>
                  {availableDevices
                    .filter((d) => !saleItems.some((it) => it.device.id === d.id))
                    .map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.model.brand} {d.model.modelName} — {d.model.ram || "8 GB"} / {d.model.storage} / {d.model.color} - {d.imei ? `IMEI: ${d.imei}` : "IMEI'siz Cihaz"} (Alış Maliyeti: {formatCurrency(d.purchasePrice)})
                      </option>
                    ))}
                </select>
              </div>

              {/* Seçilen Cihazlar Listesi */}
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {saleItems.length === 0 ? (
                  <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-center text-xs text-slate-400">
                    Henüz cihaz seçilmedi. Yukarıdaki listeden stoktaki cihazı seçin.
                  </div>
                ) : (
                  saleItems.map((item) => (
                    <div
                      key={item.device.id}
                      className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between gap-3 text-xs"
                    >
                      <div className="flex-1">
                        <span className="font-semibold text-slate-900 block">
                          {item.device.model.brand} {item.device.model.modelName} ({item.device.model.ram || "8 GB"} / {item.device.model.storage} / {item.device.model.color})
                        </span>
                        <span className="font-mono text-slate-500 text-[11px]">
                          {item.device.imei ? `IMEI: ${item.device.imei}` : "IMEI'siz Cihaz"} | Alış Maliyeti: {formatCurrency(item.device.purchasePrice)}
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        <label className="text-[11px] font-semibold text-slate-600">Satış:</label>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          required
                          value={item.soldPrice}
                          onChange={(e) => handlePriceChange(item.device.id, e.target.value)}
                          className="w-28 py-1 px-2 rounded-lg border border-slate-300 text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900"
                        />
                        <button
                          type="button"
                          onClick={() => handleRemoveFromCart(item.device.id)}
                          className="p-1 rounded text-red-500 hover:bg-red-50"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Özet ve Kâr Kartı */}
              {saleItems.length > 0 && (
                <div className="p-3.5 rounded-2xl bg-slate-900 border border-slate-700/60 text-white flex flex-wrap items-center justify-between gap-4 text-xs">
                  <div>
                    <span className="text-slate-400 block text-[11px]">Toplam Satış</span>
                    <span className="text-lg font-bold">{formatCurrency(calculatedTotal)}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[11px]">Toplam Maliyet</span>
                    <span className="text-sm font-medium text-slate-300">
                      {formatCurrency(calculatedCost)}
                    </span>
                  </div>
                  <div>
                    <span className="text-emerald-400 block text-[11px] font-semibold">Net Kâr</span>
                    <span className="text-lg font-bold text-emerald-400">
                      {formatCurrency(calculatedProfit)}
                    </span>
                  </div>
                </div>
              )}

              {/* Ödeme Türü Seçimi */}
              <div className="pt-2 border-t border-slate-100">
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
                  Ödeme Şekli *
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setPaymentType("CASH")}
                    className={`py-2.5 px-3 rounded-xl text-xs font-semibold border transition ${
                      paymentType === "CASH"
                        ? "bg-slate-900 text-white border-slate-900"
                        : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
                    }`}
                  >
                    Peşin (Nakit/Kart)
                  </button>
                  <button
                    type="button"
                    onClick={() => setPaymentType("PARTIAL")}
                    className={`py-2.5 px-3 rounded-xl text-xs font-semibold border transition ${
                      paymentType === "PARTIAL"
                        ? "bg-slate-900 text-white border-slate-900"
                        : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
                    }`}
                  >
                    Kısmi Ödeme
                  </button>
                  <button
                    type="button"
                    onClick={() => setPaymentType("INSTALLMENT")}
                    className={`py-2.5 px-3 rounded-xl text-xs font-semibold border transition ${
                      paymentType === "INSTALLMENT"
                        ? "bg-slate-900 text-white border-slate-900"
                        : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
                    }`}
                  >
                    Vadeli / Taksitli
                  </button>
                </div>
              </div>

              {/* Kısmi Ödeme Alanları */}
              {paymentType === "PARTIAL" && (
                <div className="p-3 rounded-xl bg-blue-50 border border-blue-200 grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <label className="block font-semibold text-blue-900 mb-1">
                      Şimdi Alınan Tutar (TL) *
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      required
                      value={paidAmountInput}
                      onChange={(e) => setPaidAmountInput(e.target.value)}
                      placeholder="20000"
                      className="w-full py-2 px-3 rounded-lg border border-blue-300 text-xs font-bold"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-blue-900 mb-1">Kalan Müşteri Borcu</label>
                    <div className="py-2 px-3 rounded-lg bg-white font-bold text-amber-700 text-sm">
                      {formatCurrency(calculatedRemaining)}
                    </div>
                  </div>
                </div>
              )}

              {/* Taksitli Satış Alanları */}
              {paymentType === "INSTALLMENT" && (
                <div className="p-4 rounded-2xl bg-purple-50 border border-purple-200 space-y-3 text-xs">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block font-semibold text-purple-900 mb-1">
                        Peşinat Tutarı (TL)
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={paidAmountInput}
                        onChange={(e) => setPaidAmountInput(e.target.value)}
                        placeholder="15000"
                        className="w-full py-2 px-3 rounded-lg border border-purple-300 text-xs font-bold"
                      />
                    </div>
                    <div>
                      <label className="block font-semibold text-purple-900 mb-1">Taksit Sayısı</label>
                      <select
                        value={installmentCount}
                        onChange={(e) => setInstallmentCount(e.target.value)}
                        className="w-full py-2 px-3 rounded-lg border border-purple-300 text-xs font-bold"
                      >
                        {[1, 2, 3, 4, 5, 6, 9, 12, 18, 24].map((cnt) => (
                          <option key={cnt} value={cnt}>
                            {cnt} Taksit
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block font-semibold text-purple-900 mb-1">İlk Vade Tarihi</label>
                      <input
                        type="date"
                        required
                        value={firstDueDate}
                        onChange={(e) => setFirstDueDate(e.target.value)}
                        className="w-full py-1.5 px-3 rounded-lg border border-purple-300 text-xs font-medium"
                      />
                    </div>
                  </div>

                  {/* Taksit Planı Önizleme */}
                  {installmentPlanPreview.length > 0 && (
                    <div>
                      <span className="block font-semibold text-purple-950 mb-1.5">
                        Taksit Ödeme Planı (Kalan: {formatCurrency(calculatedRemaining)})
                      </span>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                        {installmentPlanPreview.map((item) => (
                          <div
                            key={item.num}
                            className="p-2 rounded-lg bg-white border border-purple-200 flex justify-between items-center text-[11px]"
                          >
                            <span className="text-purple-800 font-medium">
                              {item.num}. Taksit ({item.date}):
                            </span>
                            <span className="font-bold text-purple-950">
                              {formatCurrency(item.amount)}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Notlar */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Satış Notları (İsteğe Bağlı)
                </label>
                <textarea
                  rows={2}
                  value={notesInput}
                  onChange={(e) => setNotesInput(e.target.value)}
                  placeholder="Müşteri talepleri veya garanti notları..."
                  className="w-full py-2 px-3 rounded-xl border border-slate-300 text-xs focus:outline-none"
                />
              </div>

              {/* Submit Buttons */}
              <div className="pt-3 flex gap-3">
                <button
                  type="button"
                  onClick={() => setIsNewSaleOpen(false)}
                  className="w-1/2 py-2.5 rounded-xl border border-slate-300 text-slate-700 font-semibold text-xs hover:bg-slate-50"
                >
                  Vazgeç
                </button>
                <button
                  type="submit"
                  disabled={submitting || saleItems.length === 0}
                  className="w-1/2 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white font-semibold text-xs shadow-sm"
                >
                  {submitting ? "Satış İşleniyor..." : "Satışı Onayla ve Tamamla"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Sale Detail & Cancel Modal */}
      {selectedSaleDetail && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 sm:p-8 shadow-2xl border border-slate-200 my-8">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div>
                <span className="text-xs font-bold text-slate-500 font-mono">
                  {selectedSaleDetail.saleNumber}
                </span>
                <h2 className="text-xl font-bold text-slate-900">
                  {selectedSaleDetail.customer.name}
                </h2>
              </div>
              <button
                onClick={() => setSelectedSaleDetail(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="mt-4 space-y-4 text-xs">
              {/* Status Banner */}
              {selectedSaleDetail.status === "CANCELLED" ? (
                <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 font-medium">
                  Bu satış {formatDate(selectedSaleDetail.cancelledAt || "")} tarihinde iptal edilmiştir.
                  Gerekçe: {selectedSaleDetail.cancelReason || "-"}
                </div>
              ) : (
                <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 flex justify-between items-center">
                  <span>Satış Başarıyla Tamamlandı</span>
                  <span className="font-semibold">{formatDate(selectedSaleDetail.saleDate)}</span>
                </div>
              )}

              {/* Finansal Özet */}
              <div className="grid grid-cols-3 gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200">
                <div>
                  <span className="text-slate-500 block">Toplam Tutar</span>
                  <span className="text-base font-bold text-slate-900">
                    {formatCurrency(selectedSaleDetail.totalAmount)}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block">Ödenen / Kalan</span>
                  <span className="text-sm font-semibold text-emerald-700">
                    {formatCurrency(selectedSaleDetail.paidAmount)}
                  </span>
                  {selectedSaleDetail.remainingAmount > 0 && (
                    <span className="text-xs font-bold text-amber-700 ml-1">
                      (Kalan: {formatCurrency(selectedSaleDetail.remainingAmount)})
                    </span>
                  )}
                </div>
                <div>
                  <span className="text-slate-500 block">Elde Edilen Kâr</span>
                  <span className="text-base font-bold text-emerald-600">
                    {formatCurrency(selectedSaleDetail.totalProfit)}
                  </span>
                </div>
              </div>

              {/* Satılan Cihazlar */}
              <div>
                <span className="font-bold text-slate-900 block mb-2">Satılan Cihazlar</span>
                <div className="space-y-2">
                  {selectedSaleDetail.items.map((it) => (
                    <div
                      key={it.id}
                      className="p-2.5 rounded-xl border border-slate-200 bg-white flex justify-between items-center"
                    >
                      <div>
                        <span className="font-semibold text-slate-900 block">
                          {it.model.brand} {it.model.modelName} ({it.model.ram || "8 GB"} / {it.model.storage} / {it.model.color})
                        </span>
                        <span className="font-mono text-slate-500 text-[11px]">
                          {it.imei ? `IMEI: ${it.imei}` : "IMEI Yok"}
                        </span>
                      </div>
                      <div className="text-right">
                        <span className="font-bold text-slate-900 block">
                          {formatCurrency(it.soldPrice)}
                        </span>
                        <span className="text-[11px] text-emerald-600 font-medium">
                          Kâr: {formatCurrency(it.profit)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Taksitler (Varsa) */}
              {selectedSaleDetail.installments.length > 0 && (
                <div>
                  <span className="font-bold text-slate-900 block mb-2">Taksit Planı</span>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {selectedSaleDetail.installments.map((ins) => (
                      <div
                        key={ins.id}
                        className="p-2 rounded-lg border border-slate-200 bg-white flex justify-between items-center"
                      >
                        <div>
                          <span className="font-semibold text-slate-800 block">
                            {ins.installmentNumber}. Taksit
                          </span>
                          <span className="text-[10px] text-slate-400">
                            {formatDate(ins.dueDate)}
                          </span>
                        </div>
                        <div className="text-right">
                          <span className="font-bold text-slate-900 block">
                            {formatCurrency(ins.amount)}
                          </span>
                          <span
                            className={`text-[10px] font-semibold ${
                              ins.status === "PAID"
                                ? "text-emerald-600"
                                : ins.status === "OVERDUE"
                                ? "text-red-600"
                                : "text-amber-600"
                            }`}
                          >
                            {ins.status === "PAID"
                              ? "Ödendi"
                              : ins.status === "OVERDUE"
                              ? "Gecikmiş"
                              : "Bekliyor"}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Satış İşlemleri: İptal ve Güvenli Silme */}
              <div className="pt-4 border-t border-slate-100 flex items-center justify-between gap-2">
                <button
                  onClick={() => handleOpenDeleteSale(selectedSaleDetail)}
                  className="px-4 py-2 rounded-xl text-red-600 hover:bg-red-50 border border-red-200 font-semibold transition flex items-center gap-1.5"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>Satış Kaydını Sil</span>
                </button>

                {selectedSaleDetail.status === "COMPLETED" && (
                  <button
                    onClick={() => setIsCancelModalOpen(true)}
                    className="px-4 py-2 rounded-xl text-slate-700 hover:bg-slate-100 border border-slate-200 font-semibold transition flex items-center gap-1.5"
                  >
                    <Ban className="w-4 h-4 text-amber-600" />
                    <span>Bu Satışı İptal Et</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Sale Confirmation Modal */}
      {isDeleteSaleModalOpen && deletingSaleDetail && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-bold text-red-600 text-base flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-red-600" />
                <span>Satış Kaydı Silme Onayı</span>
              </h3>
              <button
                onClick={() => setIsDeleteSaleModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-sm font-semibold text-slate-900">
              Bu satış kaydını silmek istediğinize emin misiniz?
            </p>

            {/* Kayıt Bilgileri */}
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-1.5">
              <div className="flex justify-between">
                <span className="text-slate-500 font-medium">Satış No:</span>
                <span className="font-mono font-bold text-slate-900">
                  {deletingSaleDetail.saleNumber}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 font-medium">Müşteri/Cari:</span>
                <span className="font-semibold text-slate-800">
                  {deletingSaleDetail.customer.name}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 font-medium">Satılan Cihaz(lar):</span>
                <span className="font-medium text-slate-800 text-right max-w-[200px] truncate">
                  {deletingSaleDetail.items
                    .map(
                      (it) =>
                        `${it.model.brand} ${it.model.modelName} (${it.model.ram || "8 GB"}/${it.model.storage}/${it.model.color})`
                    )
                    .join(", ")}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 font-medium">Toplam Satış Tutarı:</span>
                <span className="font-bold text-slate-900">
                  {formatCurrency(deletingSaleDetail.totalAmount)}
                </span>
              </div>
            </div>

            {/* Silmenin Etkileri */}
            <div className="p-3.5 rounded-xl bg-amber-50/70 border border-amber-200 text-xs space-y-1 text-amber-900">
              <span className="font-bold block mb-1">Silme İşleminin Etkileri:</span>
              <ul className="list-disc list-inside space-y-0.5 text-[11px]">
                <li>Satılan cihaz(lar) tekrar stoğa alınacak.</li>
                <li>Satışa ait ödeme/tahsilat kayıtları geri alınacak.</li>
                <li>Taksitler kaldırılacak.</li>
                <li>Satıştan oluşan cari hareketleri geri alınacak.</li>
                <li>Cari bakiye yeniden hesaplanacak/düzeltilecek.</li>
              </ul>
            </div>

            {deleteSaleError && (
              <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{deleteSaleError}</span>
              </div>
            )}

            <div className="pt-2 flex gap-2">
              <button
                type="button"
                onClick={() => setIsDeleteSaleModalOpen(false)}
                className="w-1/2 py-2.5 rounded-xl border border-slate-300 text-slate-700 text-xs font-semibold hover:bg-slate-50"
              >
                İptal
              </button>
              <button
                type="button"
                disabled={deleteSaleSubmitting}
                onClick={handleConfirmDeleteSale}
                className="w-1/2 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold transition disabled:opacity-50 shadow-sm"
              >
                {deleteSaleSubmitting ? "Siliniyor..." : "Kaydı Sil"}
              </button>
            </div>
          </div>
        </div>
      )}


      {/* Cancel Confirmation Modal */}
      {isCancelModalOpen && selectedSaleDetail && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200">
            <h3 className="text-lg font-bold text-slate-900 mb-2">Satışı İptal Etmek İstediğinize Emin Misiniz?</h3>
            <p className="text-xs text-slate-500 mb-4">
              Bu işlem geri alınamaz. Cihazlar tekrar aktif stoğa iade edilecek ve müşterinin cari borcu düşülecektir.
            </p>

            <div className="mb-4">
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                İptal Nedeni / Açıklama *
              </label>
              <input
                type="text"
                required
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                placeholder="Örn: Müşteri cayma hakkı, yanlış ürün seçimi"
                className="w-full py-2 px-3 rounded-xl border border-slate-300 text-xs focus:outline-none"
              />
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => setIsCancelModalOpen(false)}
                className="w-1/2 py-2 rounded-xl border border-slate-300 text-slate-700 text-xs font-semibold"
              >
                Vazgeç
              </button>
              <button
                onClick={handleConfirmCancelSale}
                disabled={cancelling || !cancelReason.trim()}
                className="w-1/2 py-2 rounded-xl bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white text-xs font-semibold"
              >
                {cancelling ? "İptal Ediliyor..." : "Satışı İptal Et"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Quick Customer Add Modal */}
      {isQuickCustomerOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-bold text-slate-900 flex items-center gap-2">
                <UserPlus className="w-4 h-4 text-emerald-600" />
                <span>Hızlı Müşteri Ekle</span>
              </h3>
              <button
                onClick={() => setIsQuickCustomerOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleQuickCustomerSubmit} className="mt-4 space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Müşteri Adı / Firma *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Örn: Mehmet Demir"
                  value={newCustName}
                  onChange={(e) => setNewCustName(e.target.value)}
                  className="w-full py-2 px-3 rounded-xl border border-slate-300 text-xs focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Telefon</label>
                <input
                  type="text"
                  placeholder="0544..."
                  value={newCustPhone}
                  onChange={(e) => setNewCustPhone(e.target.value)}
                  className="w-full py-2 px-3 rounded-xl border border-slate-300 text-xs focus:outline-none"
                />
              </div>

              <div className="pt-3 flex gap-2">
                <button
                  type="button"
                  onClick={() => setIsQuickCustomerOpen(false)}
                  className="w-1/2 py-2 rounded-xl border border-slate-300 text-slate-700 text-xs font-semibold"
                >
                  İptal
                </button>
                <button
                  type="submit"
                  disabled={quickCustSubmitting}
                  className="w-1/2 py-2 rounded-xl bg-slate-900 text-white text-xs font-semibold disabled:opacity-50"
                >
                  {quickCustSubmitting ? "Kaydediliyor..." : "Müşteriyi Kaydet"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
