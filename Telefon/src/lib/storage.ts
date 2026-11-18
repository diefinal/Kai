import {
  DeleteObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";

export const STORAGE_BUCKET_NAME = process.env.R2_BUCKET_NAME || "teknoreha-gorseller";
export const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB
export const ALLOWED_MIME_TYPES = ["image/jpeg", "image/png", "image/webp"];

const accountId = process.env.R2_ACCOUNT_ID;
const accessKeyId = process.env.R2_ACCESS_KEY_ID;
const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
const publicBaseUrl = process.env.R2_PUBLIC_URL?.replace(/\/$/, "");

let cachedClient: S3Client | null = null;

export function isStorageConfigured(): boolean {
  return Boolean(accountId && accessKeyId && secretAccessKey);
}

export function getStorageClient(): S3Client {
  if (!accountId || !accessKeyId || !secretAccessKey) {
    throw new Error(
      "Cloudflare R2 yapılandırması eksik. R2_ACCOUNT_ID, R2_ACCESS_KEY_ID ve R2_SECRET_ACCESS_KEY değişkenlerini tanımlayın."
    );
  }

  if (!cachedClient) {
    cachedClient = new S3Client({
      region: "auto",
      endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
      credentials: { accessKeyId, secretAccessKey },
    });
  }

  return cachedClient;
}

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

async function uploadImage(
  buffer: Buffer | Uint8Array,
  mimeType: string,
  prefix = "phones"
): Promise<{ publicUrl: string; path: string }> {
  if (!ALLOWED_MIME_TYPES.includes(mimeType)) {
    throw new Error("Desteklenmeyen dosya formatı. Yalnızca JPG, PNG veya WEBP formatı kabul edilir.");
  }

  if (buffer.byteLength > MAX_FILE_SIZE) {
    throw new Error("Dosya boyutu 5 MB sınırını aşıyor.");
  }

  const ext = getExtensionFromMime(mimeType);
  const path = `${prefix}/${crypto.randomUUID()}${ext}`;

  try {
    await getStorageClient().send(
      new PutObjectCommand({
        Bucket: STORAGE_BUCKET_NAME,
        Key: path,
        Body: buffer,
        ContentType: mimeType,
        CacheControl: "public, max-age=31536000, immutable",
      })
    );
  } catch (error) {
    console.error("Cloudflare R2 yükleme hatası:", error);
    const message = error instanceof Error ? error.message : "Bilinmeyen R2 hatası";
    throw new Error(`Görsel R2'ye yüklenemedi: ${message}`);
  }

  // Türkiye'deki ISP bağlantı kesilme (ERR_CONNECTION_RESET) sorunlarını önlemek için
  // istemciye doğrudan kendi güvenli /api/images proxy adresimizi dönüyoruz.
  const publicUrl = `/api/images/${path}`;

  return {
    publicUrl,
    path,
  };
}

export async function uploadPhoneImage(
  buffer: Buffer | Uint8Array,
  mimeType: string
): Promise<{ publicUrl: string; path: string }> {
  return uploadImage(buffer, mimeType, "phones");
}

export async function uploadAdImage(
  buffer: Buffer | Uint8Array,
  mimeType: string
): Promise<{ publicUrl: string; path: string }> {
  return uploadImage(buffer, mimeType, "ads");
}

export async function deletePhoneImage(imageUrlOrPath?: string | null): Promise<boolean> {
  if (!imageUrlOrPath || !isStorageConfigured()) {
    return false;
  }

  try {
    let path = imageUrlOrPath.trim();

    // 1. /api/images/phones/xxx.jpg veya /api/images/ads/xxx.jpg
    if (path.includes("/api/images/")) {
      const parts = path.split("/api/images/");
      if (parts.length > 1) {
        path = parts[1].split("?")[0];
      }
    }
    // 2. Yapılandırılmış publicBaseUrl (örn: https://pub-xxx.r2.dev/phones/...)
    else if (publicBaseUrl && path.startsWith(`${publicBaseUrl}/`)) {
      path = path.slice(publicBaseUrl.length + 1).split("?")[0];
    }
    // 3. Genel r2.dev bağlantıları (örn: https://pub-da2e5f2539444d4197ca6c8ba4d62012.r2.dev/phones/...)
    else if (path.includes(".r2.dev/")) {
      const parts = path.split(".r2.dev/");
      if (parts.length > 1) {
        path = parts[1].split("?")[0];
      }
    }
    // 4. Eski Supabase veya diğer harici linkleri R2'den silmeye çalışma
    else if (path.startsWith("http://") || path.startsWith("https://")) {
      return false;
    }

    // Temizlenen yol yalnızca "phones/..." veya "ads/..." şeklinde olmalıdır
    if (!path.startsWith("phones/") && !path.startsWith("ads/")) {
      console.warn("Geçersiz silme yolu, atlandı:", path);
      return false;
    }

    await getStorageClient().send(
      new DeleteObjectCommand({
        Bucket: STORAGE_BUCKET_NAME,
        Key: path,
      })
    );
    return true;
  } catch (error) {
    console.warn("R2 görsel silme hatası:", error);
    return false;
  }
}
