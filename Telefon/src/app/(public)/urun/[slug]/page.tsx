"use client";

import { useEffect } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { Smartphone } from "lucide-react";

export default function ProductDetailPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const slug = params?.slug as string;

  useEffect(() => {
    if (!slug) return;
    const query = new URLSearchParams(searchParams.toString());
    query.set("product", slug);
    router.replace(`/musteri?${query.toString()}`);
  }, [slug, searchParams, router]);

  return (
    <div className="min-h-[60vh] flex items-center justify-center p-6 text-center">
      <div className="space-y-3">
        <div className="w-12 h-12 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto" />
        <div className="flex items-center justify-center gap-2 text-sm font-semibold text-slate-600 dark:text-slate-300">
          <Smartphone className="w-4 h-4 text-emerald-600" />
          <span>Müşteri Vitrini Yönlendiriliyor...</span>
        </div>
      </div>
    </div>
  );
}
