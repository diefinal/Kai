"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import { ChevronDown, Check, Plus } from "lucide-react";

interface BrandComboboxProps {
  value: string;
  onChange: (value: string) => void;
  availableBrands: string[];
  placeholder?: string;
  required?: boolean;
}

export function BrandCombobox({
  value,
  onChange,
  availableBrands,
  placeholder = "Marka seçin veya yazın...",
  required = false,
}: BrandComboboxProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState(value);
  const containerRef = useRef<HTMLDivElement>(null);

  // External sync if value changes (e.g. edit modal opened or form reset)
  useEffect(() => {
    setQuery(value);
  }, [value]);

  // Close dropdown on click outside and sync value
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
        const trimmed = query.trim();
        if (trimmed) {
          const exactMatch = availableBrands.find(
            (b) => b.toLowerCase() === trimmed.toLowerCase()
          );
          onChange(exactMatch || trimmed);
        } else {
          onChange("");
        }
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [query, availableBrands, onChange]);

  // Filter available brands based on query
  const filteredBrands = useMemo(() => {
    const trimmed = query.trim().toLowerCase();
    const cleanVal = value.trim().toLowerCase();
    if (!trimmed || trimmed === cleanVal) return availableBrands;
    return availableBrands.filter((b) => b.toLowerCase().includes(trimmed));
  }, [query, value, availableBrands]);

  // Check for exact case-insensitive match
  const exactMatch = useMemo(() => {
    const trimmed = query.trim().toLowerCase();
    if (!trimmed) return null;
    return availableBrands.find((b) => b.toLowerCase() === trimmed) || null;
  }, [query, availableBrands]);

  const showUseCustomOption = query.trim().length > 0 && !exactMatch;

  const handleSelectBrand = (brand: string) => {
    onChange(brand);
    setQuery(brand);
    setIsOpen(false);
  };

  return (
    <div className="relative w-full" ref={containerRef}>
      <div className="relative">
        <input
          type="text"
          value={query}
          required={required}
          placeholder={placeholder}
          onFocus={(e) => {
            setIsOpen(true);
            e.target.select();
          }}
          onChange={(e) => {
            const nextQuery = e.target.value;
            setQuery(nextQuery);
            // Check exact match while typing to preserve canonical casing if matched
            const trimmed = nextQuery.trim();
            const matched = availableBrands.find(
              (b) => b.toLowerCase() === trimmed.toLowerCase()
            );
            onChange(matched || nextQuery);
            if (!isOpen) setIsOpen(true);
          }}
          className="w-full py-2.5 pl-3 pr-10 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900 bg-white"
        />
        <button
          type="button"
          onClick={() => setIsOpen((prev) => !prev)}
          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1"
          tabIndex={-1}
        >
          <ChevronDown
            className={`w-4 h-4 transition-transform duration-200 ${
              isOpen ? "rotate-180" : ""
            }`}
          />
        </button>
      </div>

      {isOpen && (
        <div className="absolute z-50 left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-xl max-h-56 overflow-y-auto py-1">
          {showUseCustomOption && (
            <button
              type="button"
              onClick={() => handleSelectBrand(query.trim())}
              className="w-full text-left px-3 py-2 text-sm text-emerald-700 font-semibold bg-emerald-50/70 hover:bg-emerald-100/80 flex items-center gap-2 border-b border-emerald-100 transition"
            >
              <Plus className="w-4 h-4 text-emerald-600 flex-shrink-0" />
              <span>&quot;{query.trim()}&quot; markasını kullan</span>
            </button>
          )}

          {filteredBrands.length > 0 ? (
            filteredBrands.map((brand) => {
              const isSelected = value.toLowerCase() === brand.toLowerCase();
              return (
                <button
                  key={brand}
                  type="button"
                  onClick={() => handleSelectBrand(brand)}
                  className={`w-full text-left px-3 py-2 text-sm flex items-center justify-between transition ${
                    isSelected
                      ? "bg-slate-100 font-semibold text-slate-900"
                      : "text-slate-700 hover:bg-slate-50"
                  }`}
                >
                  <span>{brand}</span>
                  {isSelected && (
                    <Check className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                  )}
                </button>
              );
            })
          ) : (
            !showUseCustomOption && (
              <div className="px-3 py-2.5 text-xs text-slate-400 text-center">
                Uygun marka bulunamadı
              </div>
            )
          )}
        </div>
      )}
    </div>
  );
}
