"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import Link from "next/link";
import {
  Users,
  Plus,
  Search,
  X,
  Edit2,
  Phone,
  Mail,
  MapPin,
  ArrowUpRight,
} from "lucide-react";
import { formatDate } from "@/lib/utils";

interface CariRow {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  address: string | null;
  type: "CUSTOMER" | "SUPPLIER" | "BOTH";
  currentBalance: number;
  notes: string | null;
  createdAt: string;
}

export default function CariTanimlariPage() {
  const [cariler, setCariler] = useState<CariRow[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("ALL"); // ALL, CUSTOMER, SUPPLIER, BOTH

  // Add Cari Modal
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [address, setAddress] = useState("");
  const [type, setType] = useState<"CUSTOMER" | "SUPPLIER" | "BOTH">("CUSTOMER");
  const [notes, setNotes] = useState("");
  const [submittingAdd, setSubmittingAdd] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);

  // Edit Cari Modal
  const [editingCari, setEditingCari] = useState<CariRow | null>(null);
  const [editName, setEditName] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editAddress, setEditAddress] = useState("");
  const [editType, setEditType] = useState<"CUSTOMER" | "SUPPLIER" | "BOTH">("CUSTOMER");
  const [editNotes, setEditNotes] = useState("");
  const [submittingEdit, setSubmittingEdit] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

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

  // Open Edit Modal
  const handleOpenEdit = (c: CariRow) => {
    setEditingCari(c);
    setEditName(c.name);
    setEditPhone(c.phone || "");
    setEditEmail(c.email || "");
    setEditAddress(c.address || "");
    setEditType(c.type);
    setEditNotes(c.notes || "");
    setEditError(null);
  };

  // Submit Add Cari
  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setAddError("Cari adı / firma adı zorunludur.");
      return;
    }

    try {
      setSubmittingAdd(true);
      setAddError(null);
      const res = await fetch("/api/admin/cariler", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          phone: phone.trim() || null,
          email: email.trim() || null,
          address: address.trim() || null,
          type,
          notes: notes.trim() || null,
        }),
      });

      const json = await res.json();
      if (!json.success) {
        setAddError(json.error || "Cari oluşturulamadı.");
        return;
      }

      setIsAddOpen(false);
      setName("");
      setPhone("");
      setEmail("");
      setAddress("");
      setType("CUSTOMER");
      setNotes("");
      await fetchCariler();
    } catch (err: unknown) {
      setAddError(err instanceof Error ? err.message : "Bağlantı hatası.");
    } finally {
      setSubmittingAdd(false);
    }
  };

  // Submit Edit Cari
  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCari) return;
    if (!editName.trim()) {
      setEditError("Cari adı / firma adı zorunludur.");
      return;
    }

    try {
      setSubmittingEdit(true);
      setEditError(null);
      const res = await fetch(`/api/admin/cariler/${editingCari.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: editName.trim(),
          phone: editPhone.trim() || null,
          email: editEmail.trim() || null,
          address: editAddress.trim() || null,
          type: editType,
          notes: editNotes.trim() || null,
        }),
      });

      const json = await res.json();
      if (!json.success) {
        setEditError(json.error || "Cari güncellenemedi.");
        return;
      }

      setEditingCari(null);
      await fetchCariler();
    } catch (err: unknown) {
      setEditError(err instanceof Error ? err.message : "Bağlantı hatası.");
    } finally {
      setSubmittingEdit(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
            Cari Tanımları
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            Müşteri ve tedarikçi kartlarının oluşturulması ve iletişim yönetimi.
          </p>
        </div>
        <button
          onClick={() => setIsAddOpen(true)}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-semibold shadow-sm transition"
        >
          <Plus className="w-4 h-4" />
          <span>Yeni Cari Kartı</span>
        </button>
      </div>

      {/* Filters & Search */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col md:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
          <input
            type="text"
            placeholder="Cari adı, telefon veya e-posta ara..."
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
                    ? "bg-slate-900 text-white border border-slate-700/60"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                {labels[t]}
              </button>
            );
          })}
        </div>
      </div>

      {/* Cari List Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 border-b border-slate-200 text-xs text-slate-500 uppercase tracking-wider font-semibold">
              <tr>
                <th className="px-6 py-3.5">Cari / Firma Adı</th>
                <th className="px-6 py-3.5">İletişim</th>
                <th className="px-6 py-3.5">Adres</th>
                <th className="px-6 py-3.5">Cari Tipi</th>
                <th className="px-6 py-3.5">Kayıt Tarihi</th>
                <th className="px-6 py-3.5 text-right">İşlemler</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-slate-400">
                    <div className="inline-block animate-spin rounded-full h-6 w-6 border-2 border-emerald-600 border-t-transparent mb-2" />
                    <div>Cari tanımları yükleniyor...</div>
                  </td>
                </tr>
              ) : filteredCariler.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-slate-500">
                    <Users className="w-8 h-8 mx-auto mb-2 text-slate-400 opacity-60" />
                    Kayıtlı cari kartı bulunamadı.
                  </td>
                </tr>
              ) : (
                filteredCariler.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-50/60 transition">
                    <td className="px-6 py-4 font-semibold text-slate-900">
                      <div>{c.name}</div>
                      {c.notes && (
                        <div className="text-xs text-slate-400 font-normal truncate max-w-xs">
                          {c.notes}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 text-slate-600">
                      {c.phone && (
                        <div className="flex items-center gap-1.5 text-xs text-slate-700">
                          <Phone className="w-3.5 h-3.5 text-slate-400" />
                          <span>{c.phone}</span>
                        </div>
                      )}
                      {c.email && (
                        <div className="flex items-center gap-1.5 text-xs text-slate-500 mt-0.5">
                          <Mail className="w-3.5 h-3.5 text-slate-400" />
                          <span>{c.email}</span>
                        </div>
                      )}
                      {!c.phone && !c.email && (
                        <span className="text-xs text-slate-400">-</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-xs text-slate-500 max-w-xs truncate">
                      {c.address ? (
                        <div className="flex items-center gap-1">
                          <MapPin className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                          <span className="truncate">{c.address}</span>
                        </div>
                      ) : (
                        "-"
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${
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
                    <td className="px-6 py-4 text-xs text-slate-400">
                      {formatDate(c.createdAt)}
                    </td>
                    <td className="px-6 py-4 text-right space-x-2">
                      <button
                        onClick={() => handleOpenEdit(c)}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs font-medium text-slate-700 hover:bg-slate-100 transition"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                        <span>Düzenle</span>
                      </button>
                      <Link
                        href={`/yonetim/cari-hesap?cariId=${c.id}`}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-900 text-white text-xs font-medium hover:bg-slate-800 transition"
                      >
                        <span>Cari Hesap</span>
                        <ArrowUpRight className="w-3.5 h-3.5" />
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Cari Modal */}
      {isAddOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h2 className="text-lg font-bold text-slate-900">Yeni Cari Kartı</h2>
              <button
                onClick={() => setIsAddOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {addError && (
              <div className="p-3 bg-red-50 text-red-700 text-xs rounded-xl border border-red-200">
                {addError}
              </div>
            )}

            <form onSubmit={handleAddSubmit} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Adı / Firma Adı *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Örn: Ahmet Yılmaz veya ABC İletişim"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Telefon
                  </label>
                  <input
                    type="text"
                    placeholder="05XX XXX XX XX"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Cari Tipi
                  </label>
                  <select
                    value={type}
                    onChange={(e) => setType(e.target.value as "CUSTOMER" | "SUPPLIER" | "BOTH")}
                    className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 bg-white"
                  >
                    <option value="CUSTOMER">Müşteri</option>
                    <option value="SUPPLIER">Tedarikçi</option>
                    <option value="BOTH">Hem Müşteri Hem Tedarikçi</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  E-posta
                </label>
                <input
                  type="email"
                  placeholder="ornek@domain.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Adres
                </label>
                <textarea
                  rows={2}
                  placeholder="Adres bilgisi..."
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Notlar
                </label>
                <textarea
                  rows={2}
                  placeholder="Opsiyonel notlar..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAddOpen(false)}
                  className="px-4 py-2 text-sm rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 font-medium"
                >
                  İptal
                </button>
                <button
                  type="submit"
                  disabled={submittingAdd}
                  className="px-4 py-2 text-sm rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold shadow-sm transition disabled:opacity-50"
                >
                  {submittingAdd ? "Kaydediliyor..." : "Cariyi Kaydet"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Cari Modal */}
      {editingCari && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h2 className="text-lg font-bold text-slate-900">Cari Kartını Düzenle</h2>
              <button
                onClick={() => setEditingCari(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {editError && (
              <div className="p-3 bg-red-50 text-red-700 text-xs rounded-xl border border-red-200">
                {editError}
              </div>
            )}

            <form onSubmit={handleEditSubmit} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Adı / Firma Adı *
                </label>
                <input
                  type="text"
                  required
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Telefon
                  </label>
                  <input
                    type="text"
                    value={editPhone}
                    onChange={(e) => setEditPhone(e.target.value)}
                    className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Cari Tipi
                  </label>
                  <select
                    value={editType}
                    onChange={(e) => setEditType(e.target.value as "CUSTOMER" | "SUPPLIER" | "BOTH")}
                    className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 bg-white"
                  >
                    <option value="CUSTOMER">Müşteri</option>
                    <option value="SUPPLIER">Tedarikçi</option>
                    <option value="BOTH">Hem Müşteri Hem Tedarikçi</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  E-posta
                </label>
                <input
                  type="email"
                  value={editEmail}
                  onChange={(e) => setEditEmail(e.target.value)}
                  className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Adres
                </label>
                <textarea
                  rows={2}
                  value={editAddress}
                  onChange={(e) => setEditAddress(e.target.value)}
                  className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Notlar
                </label>
                <textarea
                  rows={2}
                  value={editNotes}
                  onChange={(e) => setEditNotes(e.target.value)}
                  className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingCari(null)}
                  className="px-4 py-2 text-sm rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 font-medium"
                >
                  İptal
                </button>
                <button
                  type="submit"
                  disabled={submittingEdit}
                  className="px-4 py-2 text-sm rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold shadow-sm transition disabled:opacity-50"
                >
                  {submittingEdit ? "Güncelleniyor..." : "Değişiklikleri Kaydet"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
