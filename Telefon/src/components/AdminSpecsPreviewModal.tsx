"use client";

import React, { useState, useEffect } from "react";
import { X, CheckCircle2, AlertCircle, ExternalLink, Sparkles, Layers } from "lucide-react";
import { NormalizedPhoneSpecs } from "@/types";
import { SpecCategory } from "@/data/productSpecs";

export interface CandidateData {
  id: number | string;
  matchedTitle: string;
  source: string;
  sourceUrl?: string;
  lastUpdated: string;
  specs: NormalizedPhoneSpecs;
  previewCategories: SpecCategory[];
}

export interface SpecsPreviewData {
  matchedTitle: string;
  source: string;
  sourceUrl?: string;
  lastUpdated: string;
  specs: NormalizedPhoneSpecs;
  previewCategories: SpecCategory[];
  isCloudflareBlocked?: boolean;
  httpStatus?: number;
  statusNote?: string;
  candidates?: CandidateData[];
}

interface AdminSpecsPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (specs: NormalizedPhoneSpecs) => void;
  previewData: SpecsPreviewData | null;
}

export function AdminSpecsPreviewModal({
  isOpen,
  onClose,
  onConfirm,
  previewData,
}: AdminSpecsPreviewModalProps) {
  const [selectedIndex, setSelectedIndex] = useState<number>(0);

  useEffect(() => {
    setSelectedIndex(0);
  }, [previewData]);

  if (!isOpen || !previewData) return null;

  const candidates = previewData.candidates && previewData.candidates.length > 0
    ? previewData.candidates
    : [
        {
          id: 1,
          matchedTitle: previewData.matchedTitle,
          source: previewData.source,
          sourceUrl: previewData.sourceUrl,
          lastUpdated: previewData.lastUpdated,
          specs: previewData.specs,
          previewCategories: previewData.previewCategories,
        },
      ];

  const activeCandidate = candidates[selectedIndex] || candidates[0];

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl max-w-2xl w-full p-6 shadow-2xl border border-slate-200 relative max-h-[90vh] flex flex-col overflow-hidden text-slate-900">
        {/* Header */}
        <div className="pb-4 border-b border-slate-100 flex items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2 py-0.5 rounded-full text-[11px] font-extrabold uppercase tracking-wider bg-emerald-100 text-emerald-800">
                Bulunan Eşleşme
              </span>
              <span className="text-xs font-semibold text-slate-400">
                Kaynak: {activeCandidate.source}
              </span>
            </div>
            <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <span>{activeCandidate.matchedTitle}</span>
              {activeCandidate.sourceUrl && (
                <a
                  href={activeCandidate.sourceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-xs text-emerald-600 hover:underline font-normal"
                >
                  <span>[Ürünü Gör]</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              )}
            </h3>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Candidate Selector Tabs (If multiple plausible matches exist) */}
        {candidates.length > 1 && (
          <div className="mt-3 p-3 bg-slate-50 border border-slate-200 rounded-2xl">
            <div className="text-xs font-bold text-slate-600 mb-2 flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-emerald-600" />
              <span>Birden Fazla Eşleşme Bulundu (Lütfen Seçiniz):</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {candidates.map((cand, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setSelectedIndex(idx)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition border ${
                    selectedIndex === idx
                      ? "bg-emerald-600 text-white border-emerald-600 shadow-sm"
                      : "bg-white text-slate-700 border-slate-200 hover:bg-slate-100"
                  }`}
                >
                  {cand.matchedTitle}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Live HTTP Status Notice */}
        {previewData.statusNote && (
          <div className="mt-3 p-3 bg-amber-50 border border-amber-200/80 rounded-2xl text-xs text-amber-800 flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <div className="space-y-0.5">
              <span className="font-bold">Eşleşme Raporu:</span>
              <p className="leading-relaxed">{previewData.statusNote}</p>
            </div>
          </div>
        )}

        {/* Scrollable Categories List */}
        <div className="my-4 overflow-y-auto space-y-4 flex-1 pr-1">
          <div className="text-xs font-extrabold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
            <Sparkles className="w-4 h-4 text-emerald-600" />
            <span>Kategorize Edilmiş Teknik Özellik Önizlemesi</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {activeCandidate.previewCategories.map((cat, idx) => (
              <div
                key={idx}
                className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/70 space-y-2"
              >
                <div className="text-xs font-bold text-emerald-700 flex items-center gap-1.5 border-b border-slate-200 pb-1.5">
                  <span>{cat.icon}</span>
                  <span>{cat.title}</span>
                </div>
                <dl className="space-y-1 text-xs">
                  {cat.items.map((item, iIdx) => (
                    <div key={iIdx} className="flex justify-between gap-2">
                      <dt className="text-slate-500 font-medium shrink-0">{item.label}</dt>
                      <dd className="font-semibold text-slate-800 text-right">{item.value}</dd>
                    </div>
                  ))}
                </dl>
              </div>
            ))}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-100 transition"
          >
            İptal
          </button>
          <button
            onClick={() => onConfirm(activeCandidate.specs)}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition shadow-sm"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>✓ Teknik Özellikleri Kaydet</span>
          </button>
        </div>
      </div>
    </div>
  );
}
