"use client";

import { PublicAdDTO } from "@/types";
import { Sparkles, MessageCircle, ArrowRight } from "lucide-react";
import { formatCurrency } from "@/lib/utils";

interface AdInFeedBannerProps {
  ad: PublicAdDTO;
  onSelectPhoneModel?: (modelId: string) => void;
}

export function AdInFeedBanner({ ad, onSelectPhoneModel }: AdInFeedBannerProps) {
  const handleAction = () => {
    if (ad.connectedPhone) {
      if (ad.buttonText.includes("Bilgi Al") || ad.buttonText.includes("WhatsApp")) {
        window.open(ad.connectedPhone.whatsappLink, "_blank", "noopener,noreferrer");
      } else if (onSelectPhoneModel) {
        onSelectPhoneModel(ad.connectedPhone.modelId);
      }
    }
  };

  return (
    <div className="col-span-1 sm:col-span-2 lg:col-span-3 xl:col-span-4 bg-gradient-to-r from-emerald-900/90 via-slate-900 to-slate-900 border border-emerald-500/30 rounded-3xl p-6 sm:p-8 text-white shadow-lg relative overflow-hidden my-2 group transition duration-300">
      {ad.displayType === "IMAGE_ONLY" ? (
        <div className="w-full h-44 sm:h-56 rounded-2xl overflow-hidden relative flex items-center justify-center border border-white/10">
          {ad.imageUrl ? (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img src={ad.imageUrl} alt={ad.title} className="w-full h-full object-cover" />
          ) : (
            <span className="text-slate-300 text-sm">{ad.title}</span>
          )}
        </div>
      ) : (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-6 relative z-10">
          <div className="space-y-3 flex-1">
            <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-400 text-xs font-semibold uppercase tracking-wider border border-emerald-500/30">
              <Sparkles className="w-3.5 h-3.5" />
              Kampanya Fırsatı
            </div>

            <h3 className="text-xl sm:text-2xl font-bold tracking-tight text-white leading-snug">
              {ad.title}
            </h3>

            {ad.description && (
              <p className="text-slate-300 text-xs sm:text-sm leading-relaxed max-w-2xl line-clamp-2">
                {ad.description}
              </p>
            )}

            {ad.connectedPhone && (
              <div className="inline-flex items-center gap-2 text-xs font-medium text-emerald-300 bg-emerald-950/60 border border-emerald-800/60 px-3 py-1.5 rounded-xl">
                <span>📱 {ad.connectedPhone.brand} {ad.connectedPhone.modelName}</span>
                <span>•</span>
                <span className="font-bold text-white">{formatCurrency(ad.connectedPhone.minSalePrice)}</span>
              </div>
            )}
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-4 flex-shrink-0">
            {ad.imageUrl && (
              <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-2xl overflow-hidden bg-slate-800 border border-white/10 flex-shrink-0">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={ad.imageUrl} alt={ad.title} className="w-full h-full object-cover" />
              </div>
            )}

            {ad.connectedPhone && (
              <button
                onClick={handleAction}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition shadow-md whitespace-nowrap"
              >
                {ad.buttonText.includes("Bilgi Al") ? (
                  <MessageCircle className="w-4 h-4" />
                ) : (
                  <ArrowRight className="w-4 h-4" />
                )}
                <span>{ad.buttonText}</span>
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
