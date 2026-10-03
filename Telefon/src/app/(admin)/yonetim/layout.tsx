"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  Smartphone,
  Boxes,
  ArrowDownLeft,
  ArrowUpRight,
  Users,
  BookOpen,
  CalendarDays,
  BarChart3,
  Settings,
  LogOut,
  Menu,
  X,
  ExternalLink,
  Megaphone,
  Sparkles,
} from "lucide-react";
import { ThemeToggle } from "@/components/ThemeToggle";

const navItems = [
  { href: "/yonetim", label: "Genel Bakış", icon: LayoutDashboard },
  { href: "/yonetim/satis-firsatlari", label: "Satış Fırsatları", icon: Sparkles },
  { href: "/yonetim/telefonlar", label: "Ürünler", icon: Smartphone },
  { href: "/yonetim/stoklar", label: "Stoklar", icon: Boxes },
  { href: "/yonetim/alislar", label: "Alış Girişleri", icon: ArrowDownLeft },
  { href: "/yonetim/satislar", label: "Satışlar", icon: ArrowUpRight },
  { href: "/yonetim/cariler", label: "Cari Tanımları", icon: Users },
  { href: "/yonetim/cari-hesap", label: "Cari Hesap", icon: BookOpen },
  { href: "/yonetim/taksitler", label: "Taksitler", icon: CalendarDays },
  { href: "/yonetim/raporlar", label: "Raporlar", icon: BarChart3 },
  { href: "/yonetim/reklamlar", label: "Reklam Yönetimi", icon: Megaphone },
  { href: "/yonetim/ayarlar", label: "Ayarlar", icon: Settings },
];

export default function YonetimLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      router.push("/login");
      router.refresh();
    } catch (err) {
      console.error("Çıkış hatası:", err);
    }
  };

  return (
    <div className="min-h-screen flex bg-slate-100">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex flex-col w-64 bg-slate-900 text-slate-300 border-r border-slate-800 flex-shrink-0">
        <div className="h-[74px] flex items-center px-3 border-b border-slate-800">
          <Link
            href="/yonetim"
            className="flex items-center justify-center bg-white rounded-xl px-2.5 py-1.5 hover:bg-slate-50 transition shadow-sm w-full h-[60px]"
          >
            <Image
              src="/teknoreha-logo.png"
              alt="TeknoReha"
              width={220}
              height={65}
              className="h-full w-auto object-contain"
              priority
            />
          </Link>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive =
              item.href === "/yonetim"
                ? pathname === "/yonetim"
                : pathname.startsWith(item.href);

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition ${
                  isActive
                    ? "bg-emerald-600 text-white shadow-sm"
                    : "text-slate-400 hover:text-white hover:bg-slate-800"
                }`}
              >
                <Icon className="w-4 h-4 flex-shrink-0" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="p-3 border-t border-slate-800 space-y-2">
          <div className="flex items-center justify-between px-2 py-1">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Tema</span>
            <ThemeToggle />
          </div>

          <Link
            href="/musteri"
            target="_blank"
            className="flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <span className="flex items-center gap-2">
              <ExternalLink className="w-3.5 h-3.5" />
              Müşteri Vitrini
            </span>
            <span className="text-[10px] bg-slate-800 px-1.5 py-0.5 rounded text-slate-400">
              Aç
            </span>
          </Link>

          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-red-400 hover:bg-red-500/10 hover:text-red-300 transition text-left"
          >
            <LogOut className="w-4 h-4" />
            <span>Güvenli Çıkış</span>
          </button>
        </div>
      </aside>

      {/* Mobile Drawer */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm lg:hidden"
          onClick={() => setMobileOpen(false)}
        >
          <div
            className="w-72 bg-slate-900 h-full p-4 flex flex-col text-slate-300"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
              <Link
                href="/yonetim"
                onClick={() => setMobileOpen(false)}
                className="flex items-center bg-white rounded-xl px-2.5 py-1.5 h-[50px] w-[170px]"
              >
                <Image
                  src="/teknoreha-logo.png"
                  alt="TeknoReha"
                  width={170}
                  height={48}
                  className="h-full w-auto object-contain"
                />
              </Link>
              <button
                onClick={() => setMobileOpen(false)}
                className="p-1 rounded text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <nav className="flex-1 py-4 space-y-1 overflow-y-auto">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive =
                  item.href === "/yonetim"
                    ? pathname === "/yonetim"
                    : pathname.startsWith(item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMobileOpen(false)}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium ${
                      isActive
                        ? "bg-emerald-600 text-white"
                        : "text-slate-400 hover:bg-slate-800 hover:text-white"
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </nav>
            <button
              onClick={handleLogout}
              className="flex items-center gap-3 px-3 py-2.5 text-sm text-red-400 hover:bg-red-500/10 rounded-xl"
            >
              <LogOut className="w-4 h-4" />
              <span>Çıkış Yap</span>
            </button>
          </div>
        </div>
      )}

      {/* Main Container */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Mobile Topbar */}
        <header className="lg:hidden h-16 bg-white border-b border-slate-200 px-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileOpen(true)}
              className="p-2 rounded-lg text-slate-600 hover:bg-slate-100"
            >
              <Menu className="w-5 h-5" />
            </button>
            <Link href="/yonetim" className="flex items-center h-10">
              <Image
                src="/teknoreha-logo.png"
                alt="TeknoReha"
                width={150}
                height={45}
                className="h-10 w-auto object-contain"
                priority
              />
            </Link>
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <Link
              href="/musteri"
              target="_blank"
              className="text-xs font-semibold text-emerald-600 hover:underline"
            >
              Vitrin →
            </Link>
          </div>
        </header>

        {/* Content Area */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
