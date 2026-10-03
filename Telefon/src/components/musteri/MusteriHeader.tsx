"use client";

import React, { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { MessageCircle, Menu, X, Smartphone, CheckCircle2 } from "lucide-react";
import { APP_CONFIG } from "@/lib/constants";
import { ThemeToggle } from "@/components/ThemeToggle";

import { useSearchParams } from "next/navigation";

export function MusteriHeader() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const searchParams = useSearchParams();
  const isStokActive = searchParams ? searchParams.get("stok") === "true" : false;

  return (
    <header className="sticky top-0 z-40 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Logo */}
        <Link href="/musteri" className="flex items-center h-10 shrink-0">
          <Image
            src="/teknoreha-logo.png"
            alt="TeknoReha"
            width={180}
            height={50}
            className="h-9 sm:h-10 w-auto object-contain"
            priority
          />
        </Link>

        {/* Desktop Navigation Links */}
        <nav className="hidden md:flex items-center gap-3 text-sm font-semibold text-slate-700 dark:text-slate-200">
          <Link
            href="/musteri?stok=false#urunler"
            className={`transition flex items-center gap-1.5 px-3 py-1.5 rounded-xl ${
              !isStokActive
                ? "bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white font-extrabold border border-slate-200/80 dark:border-slate-700/80 shadow-xs"
                : "text-slate-600 dark:text-slate-300 hover:text-emerald-600 dark:hover:text-emerald-400"
            }`}
          >
            <Smartphone className="w-4 h-4 text-slate-400" />
            <span>Tüm Ürünler</span>
          </Link>

          <Link
            href="/musteri?stok=true#urunler"
            className={`transition flex items-center gap-1.5 px-3 py-1.5 rounded-xl ${
              isStokActive
                ? "bg-emerald-100/90 dark:bg-emerald-950/90 text-emerald-800 dark:text-emerald-300 font-extrabold border border-emerald-300 dark:border-emerald-700/80 shadow-xs"
                : "text-slate-600 dark:text-slate-300 hover:text-emerald-600 dark:hover:text-emerald-400"
            }`}
          >
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
            <span>Stoktakiler</span>
          </Link>

          <a
            href={`https://wa.me/${APP_CONFIG.whatsappCleanNumber}`}
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-emerald-600 dark:hover:text-emerald-400 transition flex items-center gap-1.5"
          >
            <MessageCircle className="w-4 h-4 text-emerald-500" />
            <span>WhatsApp</span>
          </a>
        </nav>

        {/* Action Buttons Right */}
        <div className="flex items-center gap-2 sm:gap-3">
          <ThemeToggle />

          {/* WhatsApp Primary Header Button */}
          <a
            href={`https://wa.me/${APP_CONFIG.whatsappCleanNumber}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs sm:text-sm font-bold px-3 sm:px-3.5 py-2 rounded-xl transition shadow-sm"
          >
            <MessageCircle className="w-4 h-4 shrink-0" />
            <span className="hidden sm:inline">WhatsApp</span>
          </a>

          {/* Mobile Hamburger Toggle Button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 rounded-xl text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
            aria-label="Menüyü Aç/Kapat"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer Navigation Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-4 py-4 space-y-3 animate-in slide-in-from-top-2">
          <Link
            href="/musteri#urunler"
            onClick={() => setMobileMenuOpen(false)}
            className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm font-bold text-slate-800 dark:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <Smartphone className="w-4 h-4 text-emerald-600" />
            <span>Tüm Ürünler</span>
          </Link>

          <Link
            href="/musteri?stok=true#urunler"
            onClick={() => setMobileMenuOpen(false)}
            className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm font-bold text-slate-800 dark:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>Stoktaki Telefonlar</span>
          </Link>

          <a
            href={`https://wa.me/${APP_CONFIG.whatsappCleanNumber}`}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => setMobileMenuOpen(false)}
            className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm font-bold text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/50"
          >
            <MessageCircle className="w-4 h-4" />
            <span>WhatsApp Destek</span>
          </a>
        </div>
      )}
    </header>
  );
}
