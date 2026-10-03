"use client";

import { Calendar } from "lucide-react";
import { DateFilterPreset } from "@/lib/reports/date-utils";

interface ReportDateFilterProps {
  preset: DateFilterPreset;
  onPresetChange: (preset: DateFilterPreset) => void;
  startDate: string;
  onStartDateChange: (date: string) => void;
  endDate: string;
  onEndDateChange: (date: string) => void;
}

const PRESETS: { label: string; value: DateFilterPreset }[] = [
  { label: "Bugün", value: "TODAY" },
  { label: "Son 7 Gün", value: "LAST_7_DAYS" },
  { label: "Bu Ay", value: "THIS_MONTH" },
  { label: "Geçen Ay", value: "LAST_MONTH" },
  { label: "Bu Yıl", value: "THIS_YEAR" },
  { label: "Özel Tarih", value: "CUSTOM" },
];

export function ReportDateFilter({
  preset,
  onPresetChange,
  startDate,
  onStartDateChange,
  endDate,
  onEndDateChange,
}: ReportDateFilterProps) {
  return (
    <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
      {/* Presets */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
        {PRESETS.map((p) => (
          <button
            key={p.value}
            onClick={() => onPresetChange(p.value)}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition ${
              preset === p.value
                ? "bg-slate-900 text-white shadow-sm"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            {p.label}
          </button>
        ))}
      </div>

      {/* Custom Date Pickers */}
      {preset === "CUSTOM" && (
        <div className="flex items-center gap-2 text-xs bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-xl">
          <Calendar className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
          <input
            type="date"
            value={startDate}
            onChange={(e) => onStartDateChange(e.target.value)}
            className="bg-transparent text-slate-900 focus:outline-none"
          />
          <span className="text-slate-400">-</span>
          <input
            type="date"
            value={endDate}
            onChange={(e) => onEndDateChange(e.target.value)}
            className="bg-transparent text-slate-900 focus:outline-none"
          />
        </div>
      )}
    </div>
  );
}
