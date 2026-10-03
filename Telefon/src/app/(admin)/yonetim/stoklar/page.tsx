"use client";

import { useEffect, useState, useMemo } from "react";
import {
  Boxes,
  Plus,
  Search,
  CheckCircle,
  Clock,
  ChevronRight,
  X,
} from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/utils";
import { PurchaseFormModal } from "@/components/PurchaseFormModal";

interface PhysicalDevice {
  id: string;
  imei: string | null;
  ram: string;
  storage: string;
  color: string;
  purchasePrice: number;
  salePrice: number;
  status: "IN_STOCK" | "RESERVED" | "SOLD";
  purchaseDate: string;
  notes: string | null;
  supplier: {
    id: string;
    name: string;
    phone: string | null;
  };
}

interface StockModelItem {
  id: string;
  brand: string;
  modelName: string;
  ram: string;
  storage: string;
  color: string;
  description: string | null;
  imageUrl: string | null;
  basePrice: number;
  isActive: boolean;
  inStockCount: number;
  reservedCount: number;
  soldCount: number;
  inStockCost: number;
  devices: PhysicalDevice[];
}

export default function StoklarPage() {
  const [stocks, setStocks] = useState<StockModelItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [stockFilter, setStockFilter] = useState("all"); // all, in_stock, out_of_stock

  // Modals
  const [selectedModelForDetail, setSelectedModelForDetail] = useState<StockModelItem | null>(null);
  const [isAddStockOpen, setIsAddStockOpen] = useState(false);

  // Fetch stocks
  const loadData = async () => {
    try {
      setLoading(true);
      const stockRes = await fetch("/api/admin/stocks");
      const stockJson = await stockRes.json();

      if (stockJson.success && Array.isArray(stockJson.data)) {
        setStocks(stockJson.data);
      }
    } catch (err) {
      console.error("Veriler yüklenirken hata:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Filtered models
  const filteredStocks = useMemo(() => {
    return stocks.filter((m) => {
      const matchStock =
        stockFilter === "all" ||
        (stockFilter === "in_stock" && m.inStockCount > 0) ||
        (stockFilter === "out_of_stock" && m.inStockCount === 0);

      const q = search.toLowerCase();
      const matchSearch =
        !search ||
        m.brand.toLowerCase().includes(q) ||
        m.modelName.toLowerCase().includes(q) ||
        m.ram?.toLowerCase().includes(q) ||
        m.storage.toLowerCase().includes(q) ||
        m.color.toLowerCase().includes(q) ||
        m.devices.some((d) => d.imei && d.imei.toLowerCase().includes(q));

      return matchStock && matchSearch;
    });
  }, [stocks, stockFilter, search]);

  const handleOpenAddStock = (preselectModelId?: string) => {
    if (preselectModelId) {
      const foundModel = stocks.find((s) => s.id === preselectModelId);
      setSelectedModelForDetail(foundModel || null);
    }
    setIsAddStockOpen(true);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
            Stoklar ve Cihazlar
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            Modellerin fiziksel cihaz stokları, IMEI takibi ve anlık depo durumu.
          </p>
        </div>

        <button
          onClick={() => handleOpenAddStock()}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-semibold transition shadow-sm"
        >
          <Plus className="w-4 h-4" />
          <span>Yeni Stok Ekle</span>
        </button>
      </div>

      {/* Filter Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Model, hafıza, renk veya IMEI ara..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-slate-900"
          />
        </div>

        <div className="flex items-center gap-2">
          <select
            value={stockFilter}
            onChange={(e) => setStockFilter(e.target.value)}
            className="text-xs font-medium px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-900"
          >
            <option value="all">Tüm Modeller</option>
            <option value="in_stock">Sadece Stokta Olanlar</option>
            <option value="out_of_stock">Stokta Olmayanlar (3 Günde Teslim)</option>
          </select>
        </div>
      </div>

      {/* Stocks Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-slate-400 text-sm">Stoklar yükleniyor...</div>
        ) : filteredStocks.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <Boxes className="w-10 h-10 text-slate-300 mx-auto" />
            <p className="text-slate-600 font-medium">Stok kaydı bulunamadı.</p>
            <p className="text-xs text-slate-400">
              Cihaz girişi yapmak için &quot;Yeni Stok Ekle&quot; butonunu kullanabilirsiniz.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200 text-xs uppercase font-semibold text-slate-500 tracking-wider">
                  <th className="py-3.5 px-4">Telefon Modeli</th>
                  <th className="py-3.5 px-4">Özellikler</th>
                  <th className="py-3.5 px-4">Satış Fiyatı</th>
                  <th className="py-3.5 px-4">Aktif Stok</th>
                  <th className="py-3.5 px-4">Rezerve</th>
                  <th className="py-3.5 px-4">Satılan</th>
                  <th className="py-3.5 px-4">Stok Maliyeti</th>
                  <th className="py-3.5 px-4 text-right">Cihazlar</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredStocks.map((m) => (
                  <tr
                    key={m.id}
                    onClick={() => setSelectedModelForDetail(m)}
                    className="hover:bg-slate-50/80 transition cursor-pointer"
                  >
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-slate-900 text-white flex items-center justify-center font-bold text-xs flex-shrink-0">
                          {m.brand.substring(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <span className="font-semibold text-slate-900 block leading-tight">
                            {m.brand} {m.modelName}
                          </span>
                          <span className="text-xs text-slate-400">
                            {m.isActive ? "Vitrin Açık" : "Vitrin Kapalı"}
                          </span>
                        </div>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-slate-600">
                      <span className="inline-block px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-semibold mr-1.5">
                        {m.ram} RAM
                      </span>
                      <span className="inline-block px-2 py-0.5 rounded bg-slate-100 text-xs font-medium mr-1.5">
                        {m.storage}
                      </span>
                      <span className="text-xs text-slate-500">{m.color}</span>
                    </td>
                    <td className="py-3.5 px-4 font-bold text-slate-900">
                      {formatCurrency(m.basePrice)}
                    </td>
                    <td className="py-3.5 px-4">
                      {m.inStockCount > 0 ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          <CheckCircle className="w-3.5 h-3.5" />
                          {m.inStockCount} adet
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                          <Clock className="w-3.5 h-3.5" />
                          3 Günde Teslim
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-slate-500 text-xs">
                      {m.reservedCount > 0 ? `${m.reservedCount} adet` : "-"}
                    </td>
                    <td className="py-3.5 px-4 text-slate-500 text-xs">
                      {m.soldCount > 0 ? `${m.soldCount} adet` : "-"}
                    </td>
                    <td className="py-3.5 px-4 text-xs font-semibold text-slate-700">
                      {formatCurrency(m.inStockCost)}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedModelForDetail(m);
                        }}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 text-xs font-medium text-slate-700 transition"
                      >
                        <span>Cihazlar ({m.devices.length})</span>
                        <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Physical Devices Drawer / Detail Modal */}
      {selectedModelForDetail && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-4xl w-full max-h-[90vh] flex flex-col shadow-2xl border border-slate-200">
            {/* Modal Header */}
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-slate-900">
                  {selectedModelForDetail.brand} {selectedModelForDetail.modelName}
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  {selectedModelForDetail.storage} • {selectedModelForDetail.color} • Toplam:{" "}
                  {selectedModelForDetail.devices.length} Cihaz (Stokta:{" "}
                  {selectedModelForDetail.inStockCount})
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    handleOpenAddStock(selectedModelForDetail.id);
                  }}
                  className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Bu Modele Stok Ekle</span>
                </button>
                <button
                  onClick={() => setSelectedModelForDetail(null)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Devices List */}
            <div className="flex-1 overflow-y-auto p-6">
              {selectedModelForDetail.devices.length === 0 ? (
                <div className="text-center py-12 text-slate-400 text-sm">
                  Bu modele ait henüz kayıtlı fiziksel cihaz bulunmuyor.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-slate-200 text-slate-500 uppercase font-semibold">
                        <th className="py-2.5 px-3">IMEI</th>
                        <th className="py-2.5 px-3">Varyant</th>
                        <th className="py-2.5 px-3">Durum</th>
                        <th className="py-2.5 px-3">Alış Fiyatı</th>
                        <th className="py-2.5 px-3">Hedef Satış</th>
                        <th className="py-2.5 px-3">Tedarikçi (Cari)</th>
                        <th className="py-2.5 px-3">Alış Tarihi</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {selectedModelForDetail.devices.map((device) => {
                        let statusBadge = (
                          <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            Stokta
                          </span>
                        );
                        if (device.status === "RESERVED") {
                          statusBadge = (
                            <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                              Rezerve
                            </span>
                          );
                        } else if (device.status === "SOLD") {
                          statusBadge = (
                            <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-600">
                              Satıldı
                            </span>
                          );
                        }

                        return (
                          <tr key={device.id} className="hover:bg-slate-50/60">
                            <td className="py-3 px-3 font-mono font-medium text-slate-900">
                              {device.imei || (
                                <span className="text-slate-400 italic font-sans font-normal text-[11px]">
                                  IMEI Yok
                                </span>
                              )}
                            </td>
                            <td className="py-3 px-3 text-xs text-slate-600">
                              <span className="font-semibold text-emerald-700">{device.ram}</span>
                              <span className="mx-1">•</span>
                              <span>{device.storage}</span>
                              <span className="mx-1">•</span>
                              <span>{device.color}</span>
                            </td>
                            <td className="py-3 px-3">{statusBadge}</td>
                            <td className="py-3 px-3 font-semibold text-slate-800">
                              {formatCurrency(device.purchasePrice)}
                            </td>
                            <td className="py-3 px-3 text-slate-600">
                              {formatCurrency(device.salePrice)}
                            </td>
                            <td className="py-3 px-3 text-slate-700">
                              {device.supplier?.name || "-"}
                            </td>
                            <td className="py-3 px-3 text-slate-500">
                              {formatDate(device.purchaseDate)}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Purchase / Stock Entry Form Modal */}
      <PurchaseFormModal
        isOpen={isAddStockOpen}
        preselectModelId={selectedModelForDetail?.id}
        onClose={() => setIsAddStockOpen(false)}
        onSuccess={() => {
          setIsAddStockOpen(false);
          loadData();
        }}
      />
    </div>
  );
}
