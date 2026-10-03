export const APP_CONFIG = {
  name: "TeknoReha",
  description: "Telefon Stok, Satış ve Cari Yönetim Sistemi",
  appUrl: process.env.NEXT_PUBLIC_APP_URL || "https://app.teknoreha.com",
  // Kullanıcının belirttiği merkezi WhatsApp numarası
  whatsappNumber: process.env.NEXT_PUBLIC_WHATSAPP_NUMBER || "+90 538 654 85 75",
  whatsappCleanNumber: (process.env.NEXT_PUBLIC_WHATSAPP_NUMBER || "+90 538 654 85 75").replace(/\D/g, ""),
  authCookieName: "telefon_auth_token",
  jwtSecret: process.env.JWT_SECRET || "telefon-ticaret-super-secret-jwt-key-2026-secure",
};
