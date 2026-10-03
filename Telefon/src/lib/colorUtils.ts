/**
 * Safe Turkish & English color swatch helper.
 * Maps known color names to CSS colors or gradients.
 * Returns null for unrecognized colors so UI can fallback gracefully to neutral swatches or text chips.
 */

export interface ColorSwatchStyle {
  bg: string;
  border?: string;
  isDark?: boolean;
}

/**
 * Normalizes Turkish & English characters and casing for uniform matching.
 */
export function normalizeColorName(name: string): string {
  if (!name) return "";
  return name
    .trim()
    .toLowerCase()
    .replace(/ı/g, "i")
    .replace(/İ/g, "i")
    .replace(/ş/g, "s")
    .replace(/ğ/g, "g")
    .replace(/ü/g, "u")
    .replace(/ö/g, "o")
    .replace(/ç/g, "c");
}

export function getColorSwatchStyle(colorName: string): ColorSwatchStyle | null {
  if (!colorName) return null;

  const n = normalizeColorName(colorName);

  // 1. Siyah / Black / Space Black / Midnight / Graphite
  if (
    n.includes("siyah") ||
    n.includes("black") ||
    n.includes("midnight") ||
    n.includes("gece yarisi") ||
    n.includes("grafit") ||
    n.includes("graphite") ||
    n.includes("dark")
  ) {
    return { bg: "#17171c", border: "#3f3f46", isDark: true };
  }

  // 2. Beyaz / White / Starlight
  if (
    n.includes("beyaz") ||
    n.includes("white") ||
    n.includes("starlight") ||
    n.includes("yildiz isigi") ||
    n.includes("kar") ||
    n.includes("polar")
  ) {
    return { bg: "#ffffff", border: "#cbd5e1", isDark: false };
  }

  // 3. Titanium Specific Gradients (Must be evaluated before basic colors)
  if (n.includes("mavi titanyum") || n.includes("blue titanium")) {
    return { bg: "linear-gradient(135deg, #3b82f6 0%, #1e3a8a 100%)", border: "#1d4ed8", isDark: true };
  }
  if (n.includes("siyah titanyum") || n.includes("black titanium")) {
    return { bg: "linear-gradient(135deg, #27272a 0%, #09090b 100%)", border: "#3f3f46", isDark: true };
  }
  if (
    n.includes("naturel titanyum") ||
    n.includes("natural titanium") ||
    n.includes("dogal titanyum") ||
    n.includes("titanyum") ||
    n.includes("titanium")
  ) {
    return { bg: "linear-gradient(135deg, #a8a29e 0%, #78716c 100%)", border: "#78716c", isDark: true };
  }

  // 4. Lacivert / Navy / Dark Blue (Check BEFORE general Mavi/Blue)
  if (
    n.includes("lacivert") ||
    n.includes("navy") ||
    n.includes("dark blue") ||
    n.includes("gece mavisi") ||
    n.includes("derin mavi")
  ) {
    return { bg: "#1e3a8a", border: "#1e40af", isDark: true };
  }

  // 5. Mavi / Blue / Sky / Pacific / Sierra / Okyanus
  if (
    n.includes("mavi") ||
    n.includes("blue") ||
    n.includes("sierra blue") ||
    n.includes("pacific blue") ||
    n.includes("okyanus") ||
    n.includes("sky") ||
    n.includes("gok")
  ) {
    return { bg: "#3b82f6", border: "#2563eb", isDark: true };
  }

  // 6. Mor / Purple / Lavender / Violet
  if (
    n.includes("mor") ||
    n.includes("purple") ||
    n.includes("deep purple") ||
    n.includes("derin mor") ||
    n.includes("lavanta") ||
    n.includes("lavender") ||
    n.includes("violet") ||
    n.includes("eflatun")
  ) {
    return { bg: "#8b5cf6", border: "#7c3aed", isDark: true };
  }

  // 7. Yeşil / Green / Mint / Olive
  if (
    n.includes("yesil") ||
    n.includes("green") ||
    n.includes("alpine green") ||
    n.includes("zeytin") ||
    n.includes("olive") ||
    n.includes("nane") ||
    n.includes("mint")
  ) {
    return { bg: "#10b981", border: "#059669", isDark: true };
  }

  // 8. Kırmızı / Red / Bordo / Maroon / Burgundy
  if (
    n.includes("kirmizi") ||
    n.includes("red") ||
    n.includes("product red") ||
    n.includes("bordo") ||
    n.includes("burgundy") ||
    n.includes("maroon")
  ) {
    return { bg: "#ef4444", border: "#dc2626", isDark: true };
  }

  // 9. Turuncu / Orange / Coral / Mercan
  if (
    n.includes("turuncu") ||
    n.includes("orange") ||
    n.includes("mercan") ||
    n.includes("coral")
  ) {
    return { bg: "#f97316", border: "#ea580c", isDark: true };
  }

  // 10. Sarı / Yellow / Amber
  if (
    n.includes("sari") ||
    n.includes("yellow") ||
    n.includes("amber")
  ) {
    return { bg: "#eab308", border: "#ca8a04", isDark: false };
  }

  // 11. Pembe / Pink / Rose
  if (
    n.includes("pembe") ||
    n.includes("pink") ||
    n.includes("rose") ||
    n.includes("gul")
  ) {
    return { bg: "#ec4899", border: "#db2777", isDark: false };
  }

  // 12. Gümüş / Silver
  if (
    n.includes("gumus") ||
    n.includes("silver")
  ) {
    return { bg: "#e2e8f0", border: "#94a3b8", isDark: false };
  }

  // 13. Altın / Gold
  if (
    n.includes("altin") ||
    n.includes("gold")
  ) {
    return { bg: "#f59e0b", border: "#d97706", isDark: false };
  }

  // 14. Gri / Gray / Grey / Fümey
  if (
    n.includes("gri") ||
    n.includes("gray") ||
    n.includes("grey") ||
    n.includes("fume")
  ) {
    return { bg: "#6b7280", border: "#4b5563", isDark: true };
  }

  // Fallback null for unrecognized colors
  return null;
}
