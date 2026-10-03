"use client";

import { useEffect, useState, useRef } from "react";
import { PublicAdDTO } from "@/types";
import { Sparkles, ChevronLeft, ChevronRight, MessageCircle, ArrowRight } from "lucide-react";
import { formatCurrency } from "@/lib/utils";

interface AdHeroSliderProps {
  ads: PublicAdDTO[];
  onSelectPhoneModel?: (modelId: string) => void;
}

export function AdHeroSlider({ ads, onSelectPhoneModel }: AdHeroSliderProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const heroAds = ads.filter((a) => a.position === "HERO_SLIDER");

  // Auto-play timer (5 seconds)
  useEffect(() => {
    if (heroAds.length <= 1 || isPaused) return;

    timerRef.current = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % heroAds.length);
    }, 5000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [heroAds.length, isPaused]);

  if (heroAds.length === 0) return null;

  const currentAd = heroAds[currentIndex] || heroAds[0];

  const handlePrev = () => {
    setCurrentIndex((prev) => (prev - 1 + heroAds.length) % heroAds.length);
  };

  const handleNext = () => {
    setCurrentIndex((prev) => (prev + 1) % heroAds.length);
  };

  const handleActionClick = () => {
    if (currentAd.connectedPhone) {
      if (currentAd.buttonText.includes("Bilgi Al") || currentAd.buttonText.includes("WhatsApp")) {
        window.open(currentAd.connectedPhone.whatsappLink, "_blank", "noopener,noreferrer");
      } else if (onSelectPhoneModel) {
        onSelectPhoneModel(currentAd.connectedPhone.modelId);
      }
    }
  };

  return (
    <div
      className="relative rounded-3xl overflow-hidden shadow-xl border border-slate-700/50 bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-white transition-all duration-500"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      {/* Content Container */}
      <div className="p-6 sm:p-10 lg:p-12 min-h-[220px] sm:min-h-[260px] flex flex-col justify-center relative z-10">
        {currentAd.displayType === "IMAGE_ONLY" ? (
          <div className="w-full h-56 sm:h-72 rounded-2xl overflow-hidden relative flex items-center justify-center border border-white/10">
            {currentAd.imageUrl ? (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img
                src={currentAd.imageUrl}
                alt={currentAd.title}
                className="w-full h-full object-cover"
              />
            ) : (
              <span className="text-slate-400 text-sm">{currentAd.title}</span>
            )}
          </div>
        ) : (
          <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-8">
            <div className="max-w-2xl space-y-4">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-xs font-semibold uppercase tracking-wider">
                <Sparkles className="w-3.5 h-3.5" />
                Özel Fırsat
              </div>

              <h2 className="text-2xl sm:text-4xl font-extrabold tracking-tight leading-snug">
                {currentAd.title}
              </h2>

              {currentAd.description && (
                <p className="text-slate-300 text-sm sm:text-base leading-relaxed line-clamp-3">
                  {currentAd.description}
                </p>
              )}

              {/* Connected Phone Badge */}
              {currentAd.connectedPhone && (
                <div className="inline-flex flex-wrap items-center gap-2 text-xs text-slate-200 font-medium bg-white/10 backdrop-blur-md px-3.5 py-2 rounded-xl border border-white/15">
                  <span className="font-bold text-emerald-400">
                    {currentAd.connectedPhone.brand} {currentAd.connectedPhone.modelName}
                  </span>
                  <span>•</span>
                  <span>{currentAd.connectedPhone.ram} RAM</span>
                  <span>•</span>
                  <span>{currentAd.connectedPhone.storage}</span>
                  <span>•</span>
                  <span className="font-black text-white text-sm">
                    {formatCurrency(currentAd.connectedPhone.minSalePrice)}
                  </span>
                </div>
              )}

              {/* CTA Action */}
              <div className="pt-2">
                {currentAd.connectedPhone ? (
                  <button
                    onClick={handleActionClick}
                    className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm transition shadow-lg hover:shadow-emerald-600/30"
                  >
                    {currentAd.buttonText.includes("Bilgi Al") ? (
                      <MessageCircle className="w-4 h-4" />
                    ) : (
                      <ArrowRight className="w-4 h-4" />
                    )}
                    <span>{currentAd.buttonText}</span>
                  </button>
                ) : (
                  <span className="inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-white/10 backdrop-blur text-xs font-semibold text-slate-200 border border-white/15">
                    {currentAd.buttonText}
                  </span>
                )}
              </div>
            </div>

            {/* Ad Image right side */}
            {currentAd.imageUrl && (
              <div className="w-full lg:w-72 h-48 lg:h-56 rounded-2xl overflow-hidden bg-slate-800/80 border border-white/10 flex-shrink-0 shadow-lg">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={currentAd.imageUrl}
                  alt={currentAd.title}
                  className="w-full h-full object-cover"
                />
              </div>
            )}
          </div>
        )}
      </div>

      {/* Prev / Next Arrows (if > 1 ad) */}
      {heroAds.length > 1 && (
        <>
          <button
            onClick={handlePrev}
            className="absolute left-3 top-1/2 -translate-y-1/2 z-20 p-2.5 rounded-full bg-slate-900/60 hover:bg-slate-900/90 text-white border border-white/20 backdrop-blur transition shadow-md"
            aria-label="Önceki Reklam"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <button
            onClick={handleNext}
            className="absolute right-3 top-1/2 -translate-y-1/2 z-20 p-2.5 rounded-full bg-slate-900/60 hover:bg-slate-900/90 text-white border border-white/20 backdrop-blur transition shadow-md"
            aria-label="Sonraki Reklam"
          >
            <ChevronRight className="w-5 h-5" />
          </button>

          {/* Indicator Dots */}
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-20 flex items-center gap-1.5">
            {heroAds.map((_, idx) => (
              <button
                key={idx}
                onClick={() => setCurrentIndex(idx)}
                className={`h-2 rounded-full transition-all duration-300 ${
                  idx === currentIndex ? "w-6 bg-emerald-400" : "w-2 bg-white/40 hover:bg-white/70"
                }`}
                aria-label={`Slayt ${idx + 1}`}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
