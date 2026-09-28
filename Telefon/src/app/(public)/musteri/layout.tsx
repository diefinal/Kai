import React, { Suspense } from "react";
import { MusteriHeader } from "@/components/musteri/MusteriHeader";
import { MusteriFooter } from "@/components/musteri/MusteriFooter";

export default function MusteriLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 transition-colors">
      <Suspense fallback={<div className="h-16 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800" />}>
        <MusteriHeader />
      </Suspense>

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        {children}
      </main>

      <MusteriFooter />
    </div>
  );
}
