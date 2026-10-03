"use client";

import React from "react";
import { MessageCircle, PhoneCall, Smartphone, ShieldCheck } from "lucide-react";
import { APP_CONFIG } from "@/lib/constants";

export function TrustContactSection() {
  return (
    <section className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-3xl p-6 sm:p-10 text-white shadow-xl border border-slate-800 relative overflow-hidden my-8">
      {/* Subtle decorative background blur */}
      <div className="absolute -right-10 -bottom-10 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -left-10 -top-10 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="relative z-10 max-w-3xl">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-xs font-bold uppercase tracking-wider mb-3">
          <ShieldCheck className="w-3.5 h-3.5" />
          Doğrudan İletişim
        </div>
        <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight mb-2">
          TeknoReha İle Kolayca İletişime Geçin
        </h2>
        <p className="text-slate-300 text-xs sm:text-sm leading-relaxed mb-6">
          Aradığınız telefon modeli, renk tercihiniz veya 3 günde özel teslimat talepleriniz için WhatsApp hattımızdan doğrudan bilgi alabilirsiniz.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <a
            href={`https://wa.me/${APP_CONFIG.whatsappCleanNumber}`}
            target="_blank"
            rel="noopener noreferrer"
            className="p-4 rounded-2xl bg-white/10 hover:bg-white/15 border border-white/10 backdrop-blur transition-all duration-200 group"
          >
            <div className="w-9 h-9 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
              <MessageCircle className="w-5 h-5" />
            </div>
            <h3 className="text-sm font-bold text-white mb-1">WhatsApp Destek</h3>
            <p className="text-xs text-slate-300 font-semibold">Hızlı Yanıt</p>
            <span className="text-[11px] text-emerald-400 font-bold block mt-2">Mesaj Gönder →</span>
          </a>

          <div className="p-4 rounded-2xl bg-white/10 border border-white/10 backdrop-blur">
            <div className="w-9 h-9 rounded-xl bg-blue-500/20 text-blue-400 flex items-center justify-center mb-3">
              <PhoneCall className="w-5 h-5" />
            </div>
            <h3 className="text-sm font-bold text-white mb-1">Hızlı İletişim</h3>
            <p className="text-xs text-slate-300">Anında stok ve fiyat teyidi</p>
            <span className="text-[11px] text-slate-400 block mt-2">Müşteri Odaklı Hizmet</span>
          </div>

          <div className="p-4 rounded-2xl bg-white/10 border border-white/10 backdrop-blur">
            <div className="w-9 h-9 rounded-xl bg-purple-500/20 text-purple-400 flex items-center justify-center mb-3">
              <Smartphone className="w-5 h-5" />
            </div>
            <h3 className="text-sm font-bold text-white mb-1">Güncel Seçenekler</h3>
            <p className="text-xs text-slate-300">En popüler telefon modelleri</p>
            <span className="text-[11px] text-slate-400 block mt-2">Orijinal Cihaz Listesi</span>
          </div>
        </div>
      </div>
    </section>
  );
}
