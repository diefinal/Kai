/**
 * Image URL normalization and fallback utilities.
 * Handles Cloudflare R2 proxying, Supabase legacy URLs, and placeholders.
 */

/**
 * Cloudflare r2.dev adreslerini Next.js güvenli /api/images proxy adresine dönüştürür.
 * Böylece Türkiye ISP'lerindeki ERR_CONNECTION_RESET sorununu tamamen ortadan kaldırır.
 */
export function getOptimizedImageUrl(url?: string | null): string | null {
  if (!url || typeof url !== "string") return null;
  const trimmed = url.trim();
  if (!trimmed) return null;

  // Cloudflare r2.dev adresi ise (/phones/... veya /ads/... formatında)
  const r2Match = trimmed.match(/^https?:\/\/[^/]+\.r2\.dev\/(phones\/[^?#]+|ads\/[^?#]+)/i);
  if (r2Match) {
    return `/api/images/${r2Match[1]}`;
  }

  return trimmed;
}

/**
 * Görsel URL'sinin depolama sağlayıcısını tespit eder.
 */
export function getImageStorageProvider(url?: string | null): "r2" | "supabase" | "local" | "external" | "none" {
  if (!url || typeof url !== "string") return "none";
  const trimmed = url.trim();
  if (!trimmed) return "none";

  if (trimmed.startsWith("/api/images/") || trimmed.includes(".r2.dev") || trimmed.includes("r2.cloudflarestorage.com")) {
    return "r2";
  }

  if (trimmed.includes("supabase.co")) {
    return "supabase";
  }

  if (trimmed.startsWith("/")) {
    return "local";
  }

  return "external";
}

/**
 * Görselin depolama durumunu açıklayan kullanıcı dostu metin döner.
 */
export function getImageStorageLabel(url?: string | null): string {
  const provider = getImageStorageProvider(url);
  switch (provider) {
    case "r2":
      return "Cloudflare R2 üzerinde kayıtlı";
    case "supabase":
      return "Eski Supabase Storage (Kota aşımı - Yenileme önerilir)";
    case "local":
      return "Yerel sunucu görseli";
    case "external":
      return "Harici bağlantı";
    default:
      return "Görsel yok";
  }
}
