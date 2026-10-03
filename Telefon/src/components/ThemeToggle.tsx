"use client";

import React, { useState, useRef, useEffect } from "react";
import { Sun, Moon, Waves, ChevronDown } from "lucide-react";
import { useTheme, ThemeMode } from "./ThemeProvider";

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const themeOptions: Array<{ id: ThemeMode; label: string; icon: React.ReactNode }> = [
    { id: "light", label: "Açık Tema", icon: <Sun className="w-4 h-4 text-amber-500" /> },
    { id: "dark", label: "Koyu Tema", icon: <Moon className="w-4 h-4 text-indigo-400" /> },
    { id: "ocean", label: "Okyanus Teması", icon: <Waves className="w-4 h-4 text-cyan-400" /> },
  ];

  const currentOption = themeOptions.find((t) => t.id === theme) || themeOptions[0];

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-200 transition shadow-sm"
        title="Sayfa Temasını Değiştir"
      >
        {currentOption.icon}
        <span className="hidden sm:inline">{currentOption.label}</span>
        <ChevronDown className="w-3.5 h-3.5 text-slate-400 ml-0.5" />
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-44 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl py-1.5 z-50 text-xs">
          <div className="px-3 py-1.5 font-semibold text-[11px] uppercase tracking-wider text-slate-400 border-b border-slate-100 dark:border-slate-800 mb-1">
            Sayfa Teması
          </div>
          {themeOptions.map((opt) => (
            <button
              key={opt.id}
              onClick={() => {
                setTheme(opt.id);
                setIsOpen(false);
              }}
              className={`w-full flex items-center gap-2.5 px-3 py-2 text-left transition ${
                theme === opt.id
                  ? "bg-slate-100 dark:bg-slate-800 font-bold text-slate-900 dark:text-white"
                  : "text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/60"
              }`}
            >
              {opt.icon}
              <span>{opt.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
