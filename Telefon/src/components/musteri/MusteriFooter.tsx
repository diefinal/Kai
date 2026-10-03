"use client";

import React from "react";
import Image from "next/image";
import Link from "next/link";
import { MessageCircle } from "lucide-react";
import { APP_CONFIG } from "@/lib/constants";

export function MusteriFooter() {
  return (
    <footer className="bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 py-8 text-center text-sm text-slate-500 dark:text-slate-400 transition-colors">
      <div className="max-w-7xl mx-auto px-4 flex flex-col items-center">
        {/* Logo */}
        <Link href="/musteri" className="mb-3">
          <Image
            src="/teknoreha-logo.png"
            alt="TeknoReha"
            width={160}
            height={45}
            className="h-9 w-auto object-contain opacity-90 hover:opacity-100 transition"
          />
        </Link>

        {/* Tagline */}
        <p className="text-xs font-semibold text-slate-600 dark:text-slate-300 mb-2">
          Yurt Dışı Telefon Satışı & TeknoReha Online Vitrin
        </p>

        <p className="text-xs text-slate-400 dark:text-slate-500">
          © {new Date().getFullYear()} {APP_CONFIG.name}. Tüm hakları saklıdır.
        </p>

        {/* Links */}
        <div className="flex flex-wrap items-center justify-center gap-4 mt-3 text-xs text-slate-500 dark:text-slate-400">
          <a
            href={`https://wa.me/${APP_CONFIG.whatsappCleanNumber}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 hover:underline font-bold"
          >
            <MessageCircle className="w-3.5 h-3.5" />
            <span>WhatsApp</span>
          </a>
        </div>
      </div>
    </footer>
  );
}
