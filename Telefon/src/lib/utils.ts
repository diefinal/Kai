import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number | string | { toString(): string }): string {
  const num = typeof amount === "number" ? amount : Number(amount.toString());
  if (isNaN(num)) return "0,00 ₺";
  return new Intl.NumberFormat("tr-TR", {
    style: "currency",
    currency: "TRY",
    minimumFractionDigits: 2,
  }).format(num);
}

export function formatDate(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return new Intl.DateTimeFormat("tr-TR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(d);
}

/**
 * Slug generator for URL routes (e.g. brand-modelName -> apple-17, xiaomi-17t-pro)
 */
export function slugify(text: string): string {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/ğ/g, "g")
    .replace(/ü/g, "u")
    .replace(/ş/g, "s")
    .replace(/ı/g, "i")
    .replace(/ö/g, "o")
    .replace(/ç/g, "c")
    .replace(/[\s\W-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function createProductSlug(brand: string, modelName: string): string {
  return slugify(`${brand}-${modelName}`);
}

/**
 * Normalizes multi-color strings (e.g. "Siyah,Mavi,Mor" or "Turuncu   Beyaz   Mavi" or "Siyah, Beyaz, Yeşil ,or")
 * into a clean array of unique, trimmed, properly cased color strings.
 */
export function parseColorList(raw: string | null | undefined): string[] {
  if (!raw || !raw.trim()) return [];

  let parts: string[] = [];
  if (raw.includes(",")) {
    parts = raw.split(",");
  } else if (raw.includes("/")) {
    parts = raw.split("/");
  } else if (/\s{2,}/.test(raw)) {
    parts = raw.split(/\s{2,}/);
  } else {
    parts = raw.split(/\s+/);
  }

  const result: string[] = [];
  const seen = new Set<string>();

  for (const part of parts) {
    let cleaned = part.trim();
    if (!cleaned) continue;
    
    // Clean unwanted punctuation like leading/trailing commas or typos
    cleaned = cleaned.replace(/^[^a-zA-ZçğıöşüÇĞİÖŞÜ0-9]+|[^a-zA-ZçğıöşüÇĞİÖŞÜ0-9]+$/g, "");
    if (!cleaned || cleaned.length < 2) continue; // Ignore single character typos like "or" from ",or"

    // Capitalize first letter of each word
    const normalized = cleaned
      .split(/\s+/)
      .map((w) => w.charAt(0).toLocaleUpperCase("tr-TR") + w.slice(1).toLocaleLowerCase("tr-TR"))
      .join(" ");

    const key = normalized.toLocaleLowerCase("tr-TR");
    if (!seen.has(key)) {
      seen.add(key);
      result.push(normalized);
    }
  }

  return result;
}
