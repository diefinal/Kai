import Link from "next/link";
import { Smartphone, ShieldCheck, ArrowRight, MessageCircle } from "lucide-react";
import { APP_CONFIG } from "@/lib/constants";

export default function Home() {
  return (
    <main className="flex-1 flex flex-col items-center justify-center p-6 text-center">
      <div className="max-w-xl w-full bg-white rounded-2xl shadow-sm border border-slate-200 p-8">
        <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-6">
          <Smartphone className="w-8 h-8" />
        </div>

        <h1 className="text-3xl font-bold text-slate-900 mb-2">
          {APP_CONFIG.name}
        </h1>
        <p className="text-slate-600 mb-8">
          En yeni akıllı telefon modelleri, stok durumu ve profesyonel cihaz yönetimi.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
          <Link
            href="/musteri"
            className="flex items-center justify-center gap-2 px-6 py-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold transition shadow-sm"
          >
            <Smartphone className="w-5 h-5" />
            <span>Müşteri Vitrini</span>
            <ArrowRight className="w-4 h-4" />
          </Link>

          <Link
            href="/yonetim"
            className="flex items-center justify-center gap-2 px-6 py-4 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-semibold transition shadow-sm"
          >
            <ShieldCheck className="w-5 h-5" />
            <span>Yönetim Paneli</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        <div className="pt-6 border-t border-slate-100 flex items-center justify-center gap-2 text-sm text-slate-500">
          <MessageCircle className="w-4 h-4 text-emerald-600" />
          <span>WhatsApp Destek</span>
        </div>
      </div>
    </main>
  );
}
