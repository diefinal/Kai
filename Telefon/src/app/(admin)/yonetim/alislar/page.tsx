"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import {
  ArrowDownLeft,
  Plus,
  Search,
  Calendar,
  Building2,
  CheckCircle2,
  Clock,
  X,
  AlertCircle,
  Trash2,
} from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/utils";
import { PurchaseFormModal } from "@/components/PurchaseFormModal";

interface PurchaseDeviceItem {
  id: string;
  imei: string | null;
  purchasePrice: number;
  salePrice: number;
  purchaseDate: string;
  status: "IN_STOCK" | "RESERVED" | "SOLD";
  notes: string | null;
  model: {
    id: string;
    brand: string;
    modelName: string;
    ram: string;
    storage: string;
    color: string;
    imageUrl: string | null;
  };
  supplier: {
    id: string;
    name: string;
    phone: string | null;
  };
}

interface CariItem {
  id: string;
  name: string;
}

export default function AlislarPage() {
  const [purchases, setPurchases] = useState<PurchaseDeviceItem[]>([]);
  const [suppliers, setSuppliers] = useState<CariItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAddPurchaseOpen, setIsAddPurchaseOpen] = useState(false);

  // Edit Modal
  const [editingDevice, setEditingDevice] = useState<PurchaseDeviceItem | null>(null);
  const [editPurchasePrice, setEditPurchasePrice] = useState<string>("");
  const [editSalePrice, setEditSalePrice] = useState<string>("");
  const [editSubmitting, setEditSubmitting] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);
  const [editSuccess, setEditSuccess] = useState<string | null>(null);

  // Delete Modal
  const [deletingDevice, setDeletingDevice] = useState<PurchaseDeviceItem | null>(null);
  const [deleteSubmitting, setDeleteSubmitting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  // Filters
  const [search, setSearch] = useState("");
  const [selectedSupplier, setSelectedSupplier] = useState("ALL");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  // Fetch suppliers once on mount
  useEffect(() => {
    async function loadSuppliers() {
      try {
        const sRes = await fetch("/api/admin/cariler?type=SUPPLIER");
        const sJson = await sRes.json();
        if (sJson.success && Array.isArray(sJson.data)) {
          setSuppliers(sJson.data);
        }
      } catch (err) {
        console.error("Tedarikçiler yüklenirken hata:", err);
      }
    }
    loadSuppliers();
  }, []);

  // Fetch purchases when filters change
  const loadPurchases = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      if (selectedSupplier !== "ALL") params.set("supplierId", selectedSupplier);
      if (startDate) params.set("startDate", startDate);
      if (endDate) params.set("endDate", endDate);

      const pRes = await fetch(`/api/admin/purchases?${params.toString()}`);
      const pJson = await pRes.json();

      if (pJson.success && Array.isArray(pJson.data)) {
        setPurchases(pJson.data);
      }
    } catch (err) {
      console.error("Alışlar yüklenirken hata:", err);
    } finally {
      setLoading(false);
    }
  }, [search, selectedSupplier, startDate, endDate]);

  useEffect(() => {
    loadPurchases();
  }, [loadPurchases]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    loadPurchases();
  };

  const handleOpenEdit = (device: PurchaseDeviceItem) => {
    setEditingDevice(device);
    setEditPurchasePrice(String(device.purchasePrice));
    setEditSalePrice(String(device.salePrice));
    setEditError(null);
    setEditSuccess(null);
  };

  const handleOpenDelete = (device: PurchaseDeviceItem) => {
    setDeletingDevice(device);
    setDeleteError(null);
  };

  const handleConfirmDelete = async () => {
    if (!deletingDevice) return;
    setDeleteError(null);
    setDeleteSubmitting(true);

    try {
      const res = await fetch(`/api/admin/purchases/${deletingDevice.id}`, {
        method: "DELETE",
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        setDeleteError(
          json.error ||
            "Bu alışa ait satılmış cihaz bulunduğu için alış kaydı silinemez. Önce ilgili satış kaydını silmeniz/iptal etmeniz gerekir."
        );
      } else {
        setDeletingDevice(null);
        await loadPurchases();
      }
    } catch {
      setDeleteError("Sunucu ile bağlantı hatası oluştu.");
    } finally {
      setDeleteSubmitting(false);
    }
  };

  const handleSubmitEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingDevice) return;
    setEditError(null);
    setEditSuccess(null);

    const newPurchasePrice = Number(editPurchasePrice);
    const newSalePrice = Number(editSalePrice);

    if (isNaN(newPurchasePrice) || newPurchasePrice < 0) {
      setEditError("Geçerli bir alış fiyatı giriniz.");
      return;
    }
    if (isNaN(newSalePrice) || newSalePrice < 0) {
      setEditError("Geçerli bir hedef satış fiyatı giriniz.");
      return;
    }

    setEditSubmitting(true);
    try {
      const res = await fetch(`/api/admin/purchases/${editingDevice.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          purchasePrice: newPurchasePrice,
          salePrice: newSalePrice,
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        setEditError(json.error || "Güncelleme başarısız oldu.");
      } else {
        setEditSuccess("Fiyatlar başarıyla güncellendi.");
        await loadPurchases();
        setTimeout(() => {
          setEditingDevice(null);
        }, 800);
      }
    } catch {
      setEditError("Sunucu ile bağlantı hatası oluştu.");
    } finally {
      setEditSubmitting(false);
    }
  };

  const totalPurchaseCost = useMemo(() => {
    return purchases.reduce((acc, curr) => acc + curr.purchasePrice, 0);
  }, [purchases]);

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
            Alış Girişleri
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            Tedarikçilerden yapılan tüm telefon alış hareketleri, cihaz bazlı maliyet ve stok durumu.
          </p>
        </div>

        <button
          onClick={() => setIsAddPurchaseOpen(true)}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-semibold transition shadow-sm"
        >
          <Plus className="w-4 h-4" />
          <span>Yeni Alış Yap / Stok Girişi</span>
        </button>
      </div>

      {/* Summary KPI */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            Toplam Alınan Cihaz
          </span>
          <div className="mt-2 text-2xl font-bold text-slate-900">{purchases.length} adet</div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            Toplam Alış Tutarı (Maliyet)
          </span>
          <div className="mt-2 text-2xl font-bold text-slate-900">
            {formatCurrency(totalPurchaseCost)}
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            Halen Stokta Olanlar
          </span>
          <div className="mt-2 text-2xl font-bold text-emerald-600">
            {purchases.filter((p) => p.status === "IN_STOCK").length} adet
          </div>
        </div>
      </div>

      {/* Filters & Search */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-3">
        <form onSubmit={handleSearchSubmit} className="flex flex-col md:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="IMEI, model adı veya tedarikçi ara..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-slate-900"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Supplier Filter */}
            <select
              value={selectedSupplier}
              onChange={(e) => setSelectedSupplier(e.target.value)}
              className="text-xs font-medium px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-900"
            >
              <option value="ALL">Tüm Tedarikçiler</option>
              {suppliers.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>

            {/* Date Range */}
            <div className="flex items-center gap-1.5 text-xs text-slate-600 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-xl">
              <Calendar className="w-3.5 h-3.5 text-slate-400" />
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="bg-transparent focus:outline-none text-xs"
                placeholder="Başlangıç"
              />
              <span>-</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="bg-transparent focus:outline-none text-xs"
                placeholder="Bitiş"
              />
            </div>

            <button
              type="submit"
              className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-semibold"
            >
              Filtrele
            </button>
          </div>
        </form>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-slate-400 text-sm">Alış kayıtları yükleniyor...</div>
        ) : purchases.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <ArrowDownLeft className="w-10 h-10 text-slate-300 mx-auto" />
            <p className="text-slate-600 font-medium">Kayıtlı alış girişi bulunamadı.</p>
            <p className="text-xs text-slate-400">
              Yeni cihaz girişi yaparak stok eklemek için &quot;Yeni Alış Yap&quot; butonuna tıklayabilirsiniz.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200 text-xs uppercase font-semibold text-slate-500 tracking-wider">
                  <th className="py-3.5 px-4">Tarih</th>
                  <th className="py-3.5 px-4">Model & Özellik</th>
                  <th className="py-3.5 px-4">IMEI</th>
                  <th className="py-3.5 px-4">Tedarikçi (Cari)</th>
                  <th className="py-3.5 px-4">Alış Fiyatı</th>
                  <th className="py-3.5 px-4">Hedef Satış</th>
                  <th className="py-3.5 px-4">Cihaz Durumu</th>
                  <th className="py-3.5 px-4">İşlem</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {purchases.map((p) => {
                  let statusBadge = (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Stokta
                    </span>
                  );
                  if (p.status === "RESERVED") {
                    statusBadge = (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                        <Clock className="w-3.5 h-3.5" />
                        Rezerve
                      </span>
                    );
                  } else if (p.status === "SOLD") {
                    statusBadge = (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-600">
                        Satıldı
                      </span>
                    );
                  }

                  return (
                    <tr key={p.id} className="hover:bg-slate-50/60 transition">
                      <td className="py-3.5 px-4 text-xs text-slate-500 whitespace-nowrap">
                        {formatDate(p.purchaseDate)}
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="font-semibold text-slate-900 block leading-tight">
                          {p.model.brand} {p.model.modelName}
                        </span>
                        <span className="text-xs text-slate-500">
                          <span className="font-semibold text-emerald-700 mr-1">{p.model.ram} RAM</span> • {p.model.storage} • {p.model.color}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 font-mono font-medium text-xs text-slate-900">
                        {p.imei ? (
                          p.imei
                        ) : (
                          <span className="text-slate-400 italic font-sans font-normal text-[11px]">
                            IMEI Yok
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-xs font-medium text-slate-700">
                        <div className="flex items-center gap-1.5">
                          <Building2 className="w-3.5 h-3.5 text-slate-400" />
                          <span>{p.supplier?.name || "Bilinmiyor"}</span>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 font-bold text-slate-900">
                        {formatCurrency(p.purchasePrice)}
                      </td>
                      <td className="py-3.5 px-4 text-slate-600 text-xs">
                        {formatCurrency(p.salePrice)}
                      </td>
                      <td className="py-3.5 px-4">{statusBadge}</td>
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => handleOpenEdit(p)}
                            className="px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 text-xs font-medium text-slate-700 transition"
                          >
                            Düzenle
                          </button>
                          <button
                            onClick={() => handleOpenDelete(p)}
                            className="px-3 py-1.5 rounded-lg border border-red-200 hover:bg-red-50 text-xs font-medium text-red-600 transition flex items-center gap-1"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            Sil
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

      {/* Delete Purchase Confirmation Modal */}
      {deletingDevice && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-bold text-red-600 text-base flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-red-600" />
                <span>Alış Kaydı Silme Onayı</span>
              </h3>
              <button
                onClick={() => setDeletingDevice(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-sm font-semibold text-slate-900">
              Bu alış kaydını silmek istediğinize emin misiniz?
            </p>

            {/* Kayıt Bilgileri */}
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-1.5">
              <div className="flex justify-between">
                <span className="text-slate-500 font-medium">Model & Varyant:</span>
                <span className="font-bold text-slate-900">
                  {deletingDevice.model.brand} {deletingDevice.model.modelName} ({deletingDevice.model.ram} / {deletingDevice.model.storage} / {deletingDevice.model.color})
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 font-medium">IMEI:</span>
                <span className="font-mono text-slate-800">{deletingDevice.imei || "IMEI Yok"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 font-medium">Tedarikçi:</span>
                <span className="font-semibold text-slate-800">{deletingDevice.supplier?.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 font-medium">Alış Fiyatı:</span>
                <span className="font-bold text-slate-900">{formatCurrency(deletingDevice.purchasePrice)}</span>
              </div>
            </div>

            {/* Silmenin Etkileri */}
            <div className="p-3.5 rounded-xl bg-amber-50/70 border border-amber-200 text-xs space-y-1 text-amber-900">
              <span className="font-bold block mb-1">Silme İşleminin Etkileri:</span>
              <ul className="list-disc list-inside space-y-0.5 text-[11px]">
                <li>İlgili stok cihaz(lar)ı silinecek.</li>
                <li>İlgili alış/cari hareketi geri alınacak.</li>
                <li>Tedarikçi cari bakiyesi yeniden düzeltilecek.</li>
              </ul>
            </div>

            {/* Satılmış Cihaz Engel Uyarısı */}
            {deletingDevice.status === "SOLD" && (
              <div className="p-3.5 rounded-xl bg-red-100 border border-red-300 text-red-800 text-xs font-medium space-y-1">
                <p>
                  Bu alışa ait satılmış cihaz bulunduğu için alış kaydı silinemez. Önce ilgili satış kaydını silmeniz/iptal etmeniz gerekir.
                </p>
              </div>
            )}

            {deleteError && (
              <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{deleteError}</span>
              </div>
            )}

            <div className="pt-2 flex gap-2">
              <button
                type="button"
                onClick={() => setDeletingDevice(null)}
                className="w-1/2 py-2.5 rounded-xl border border-slate-300 text-slate-700 text-xs font-semibold hover:bg-slate-50"
              >
                İptal
              </button>
              <button
                type="button"
                disabled={deleteSubmitting || deletingDevice.status === "SOLD"}
                onClick={handleConfirmDelete}
                className="w-1/2 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold transition disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
              >
                {deleteSubmitting ? "Siliniyor..." : "Kaydı Sil"}
              </button>
            </div>
          </div>
        </div>
      )}


      {/* Edit Device Price Modal */}
      {editingDevice && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-bold text-slate-900">Fiyat Düzenle</h3>
              <button
                onClick={() => setEditingDevice(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="mt-3 p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs">
              <span className="font-bold text-slate-900">
                {editingDevice.model.brand} {editingDevice.model.modelName}
              </span>
              <span className="text-slate-500 ml-2">
                {editingDevice.model.ram} RAM • {editingDevice.model.storage} • {editingDevice.model.color}
              </span>
              {editingDevice.imei && (
                <span className="block mt-1 font-mono text-slate-600">IMEI: {editingDevice.imei}</span>
              )}
            </div>

            {editError && (
              <div className="mt-3 p-2.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{editError}</span>
              </div>
            )}

            {editSuccess && (
              <div className="mt-3 p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                <span>{editSuccess}</span>
              </div>
            )}

            <form onSubmit={handleSubmitEdit} className="mt-4 space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Birim Alış Fiyatı (TL)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={editPurchasePrice}
                  onChange={(e) => setEditPurchasePrice(e.target.value)}
                  className="w-full py-2 px-3 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Hedef Satış Fiyatı (TL)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={editSalePrice}
                  onChange={(e) => setEditSalePrice(e.target.value)}
                  className="w-full py-2 px-3 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900"
                />
                {editingDevice.status === "SOLD" && (
                  <p className="mt-1 text-[11px] text-amber-600">
                    Satılmış cihazın hedef satış fiyatı değiştirilemez.
                  </p>
                )}
              </div>

              <div className="pt-3 flex gap-2">
                <button
                  type="button"
                  onClick={() => setEditingDevice(null)}
                  className="w-1/2 py-2 rounded-xl border border-slate-300 text-slate-700 text-xs font-semibold"
                >
                  İptal
                </button>
                <button
                  type="submit"
                  disabled={editSubmitting}
                  className="w-1/2 py-2 rounded-xl bg-slate-900 text-white text-xs font-semibold disabled:opacity-50"
                >
                  {editSubmitting ? "Kaydediliyor..." : "Kaydet"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* New Purchase / Stock Entry Form Modal */}
      <PurchaseFormModal
        isOpen={isAddPurchaseOpen}
        onClose={() => setIsAddPurchaseOpen(false)}
        onSuccess={() => {
          setIsAddPurchaseOpen(false);
          loadPurchases();
        }}
      />
    </div>
  );
}
