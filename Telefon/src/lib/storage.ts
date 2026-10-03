import { createClient, SupabaseClient } from "@supabase/supabase-js";

export const STORAGE_BUCKET_NAME = "phone-images";
export const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB
export const ALLOWED_MIME_TYPES = ["image/jpeg", "image/png", "image/webp"];

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseSecretKey = process.env.SUPABASE_SECRET_KEY;

let cachedClient: SupabaseClient | null = null;

export function isStorageConfigured(): boolean {
  return Boolean(supabaseUrl && supabaseSecretKey);
}

export function getStorageClient(): SupabaseClient {
  if (!supabaseUrl || !supabaseSecretKey) {
    throw new Error(
      "Supabase Storage yapılandırması eksik. Lütfen .env dosyasında NEXT_PUBLIC_SUPABASE_URL ve SUPABASE_SECRET_KEY değişkenlerini tanımlayın."
    );
  }

  if (!cachedClient) {
    cachedClient = createClient(supabaseUrl, supabaseSecretKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });
  }

  return cachedClient;
}

/**
 * Dosya uzantısını MIME type'a göre belirler
 */
function getExtensionFromMime(mimeType: string): string {
  switch (mimeType) {
    case "image/jpeg":
      return ".jpg";
    case "image/png":
      return ".png";
    case "image/webp":
      return ".webp";
    default:
      return ".jpg";
  }
}

/**
 * Telefon görselini Supabase Storage (phone-images) bucket'ına yükler.
 * Çakışma olmaması için UUID tabanlı benzersiz dosya adı oluşturur.
 */
export async function uploadPhoneImage(
  buffer: Buffer | Uint8Array,
  mimeType: string
): Promise<{ publicUrl: string; path: string }> {
  if (!ALLOWED_MIME_TYPES.includes(mimeType)) {
    throw new Error("Desteklenmeyen dosya formatı. Yalnızca JPG, PNG veya WEBP formatı kabul edilir.");
  }

  if (buffer.byteLength > MAX_FILE_SIZE) {
    throw new Error("Dosya boyutu 5 MB sınırını aşıyor.");
  }

  const supabase = getStorageClient();
  const ext = getExtensionFromMime(mimeType);
  const filename = `${crypto.randomUUID()}${ext}`;

  const { data, error } = await supabase.storage
    .from(STORAGE_BUCKET_NAME)
    .upload(filename, buffer, {
      contentType: mimeType,
      cacheControl: "3600",
      upsert: false,
    });

  if (error) {
    console.error("Supabase Storage yükleme hatası:", error);
    throw new Error(`Görsel Storage'a yüklenemedi: ${error.message}`);
  }

  const { data: publicData } = supabase.storage
    .from(STORAGE_BUCKET_NAME)
    .getPublicUrl(data.path);

  return {
    publicUrl: publicData.publicUrl,
    path: data.path,
  };
}

/**
 * Reklam/Kampanya görselini Supabase Storage (phone-images) bucket'ına 'ads/' prefix'i altına yükler.
 */
export async function uploadAdImage(
  buffer: Buffer | Uint8Array,
  mimeType: string
): Promise<{ publicUrl: string; path: string }> {
  if (!ALLOWED_MIME_TYPES.includes(mimeType)) {
    throw new Error("Desteklenmeyen dosya formatı. Yalnızca JPG, PNG veya WEBP formatı kabul edilir.");
  }

  if (buffer.byteLength > MAX_FILE_SIZE) {
    throw new Error("Dosya boyutu 5 MB sınırını aşıyor.");
  }

  const supabase = getStorageClient();
  const ext = getExtensionFromMime(mimeType);
  const filename = `ads/${crypto.randomUUID()}${ext}`;

  const { data, error } = await supabase.storage
    .from(STORAGE_BUCKET_NAME)
    .upload(filename, buffer, {
      contentType: mimeType,
      cacheControl: "3600",
      upsert: false,
    });

  if (error) {
    console.error("Supabase Storage reklam yükleme hatası:", error);
    throw new Error(`Reklam görseli Storage'a yüklenemedi: ${error.message}`);
  }

  const { data: publicData } = supabase.storage
    .from(STORAGE_BUCKET_NAME)
    .getPublicUrl(data.path);

  return {
    publicUrl: publicData.publicUrl,
    path: data.path,
  };
}

/**
 * Storage'da bulunan görseli siler.
 * URL veya dosya yolu alır, Supabase dışı linkleri güvenle atlar.
 */
export async function deletePhoneImage(imageUrlOrPath?: string | null): Promise<boolean> {
  if (!imageUrlOrPath || !isStorageConfigured()) {
    return false;
  }

  try {
    const supabase = getStorageClient();
    let filename = imageUrlOrPath;

    // Tam URL geldiyse (https://.../phone-images/xyz.jpg)
    if (imageUrlOrPath.includes(STORAGE_BUCKET_NAME)) {
      const parts = imageUrlOrPath.split(`${STORAGE_BUCKET_NAME}/`);
      if (parts.length > 1) {
        filename = parts[1].split("?")[0];
      }
    } else if (imageUrlOrPath.startsWith("http://") || imageUrlOrPath.startsWith("https://")) {
      // Supabase harici harici bir link ise silme işlemi yapmadan geç
      return false;
    }

    const { error } = await supabase.storage
      .from(STORAGE_BUCKET_NAME)
      .remove([filename]);

    if (error) {
      console.warn("Storage görsel silme uyarısı:", error.message);
      return false;
    }

    return true;
  } catch (err) {
    console.warn("Storage görsel silme hatası:", err);
    return false;
  }
}
