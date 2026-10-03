"use client";

import { ReactNode } from "react";
import { TrendingUp, TrendingDown } from "lucide-react";

interface ReportKpiCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon?: ReactNode;
  change?: number | null;
  changeLabel?: string;
  variant?: "default" | "emerald" | "amber" | "blue" | "red";
}

export function ReportKpiCard({
  title,
  value,
  subtitle,
  icon,
  change,
  changeLabel = "önceki döneme göre",
  variant = "default",
}: ReportKpiCardProps) {
  let valueColor = "text-slate-900";
  if (variant === "emerald") valueColor = "text-emerald-700";
  if (variant === "amber") valueColor = "text-amber-700";
  if (variant === "blue") valueColor = "text-blue-700";
  if (variant === "red") valueColor = "text-red-600";

  return (
    <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
      <div>
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            {title}
          </span>
          {icon && (
            <div className="w-8 h-8 rounded-xl bg-slate-100 flex items-center justify-center text-slate-600 flex-shrink-0">
              {icon}
            </div>
          )}
        </div>
        <div className={`mt-2 text-2xl font-bold tracking-tight ${valueColor}`}>
          {value}
        </div>
        {subtitle && (
          <p className="text-xs text-slate-400 mt-0.5">{subtitle}</p>
        )}
      </div>

      {change !== undefined && change !== null && (
        <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center gap-1.5 text-xs">
          {change >= 0 ? (
            <span className="inline-flex items-center gap-0.5 font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md">
              <TrendingUp className="w-3 h-3" />
              +{change}%
            </span>
          ) : (
            <span className="inline-flex items-center gap-0.5 font-semibold text-red-600 bg-red-50 px-2 py-0.5 rounded-md">
              <TrendingDown className="w-3 h-3" />
              {change}%
            </span>
          )}
          <span className="text-slate-400 text-[11px]">{changeLabel}</span>
        </div>
      )}
    </div>
  );
}
