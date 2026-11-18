import { NextRequest, NextResponse } from "next/server";
import { GetObjectCommand } from "@aws-sdk/client-s3";
import {
  getStorageClient,
  isStorageConfigured,
  STORAGE_BUCKET_NAME,
} from "@/lib/storage";

export const dynamic = "force-dynamic";

// Güvenli MIME type haritası
const MIME_TYPES: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
};

// Sadece izin verilen klasörler ve güvenli dosya adı deseni
const ALLOWED_PREFIXES = new Set(["phones", "ads"]);
const SAFE_FILENAME_REGEX = /^[a-zA-Z0-9_-]+\.(jpg|jpeg|png|webp)$/i;

export async function GET(
  request: NextRequest,
  { params }: { params: { path?: string[] } }
) {
  try {
    const pathSegments = params.path;

    if (!pathSegments || pathSegments.length !== 2) {
      return new NextResponse("Geçersiz görsel yolu.", { status: 400 });
    }

    const [prefix, filename] = pathSegments;

    // 1. Prefix kontrolü (yalnızca phones veya ads)
    if (!ALLOWED_PREFIXES.has(prefix)) {
      return new NextResponse("Yetkisiz görsel dizini.", { status: 403 });
    }

    // 2. Dosya adı güvenlik kontrolü (Path traversal, null byte, garip karakterler engellenir)
    if (!SAFE_FILENAME_REGEX.test(filename)) {
      return new NextResponse("Geçersiz veya güvensiz dosya adı.", { status: 400 });
    }

    // 3. Storage yapılandırma kontrolü
    if (!isStorageConfigured()) {
      console.error("Cloudflare R2 yapılandırması eksik.");
      return new NextResponse("Depolama servisi yapılandırılmamış.", { status: 503 });
    }

    const key = `${prefix}/${filename}`;
    const s3 = getStorageClient();

    try {
      const command = new GetObjectCommand({
        Bucket: STORAGE_BUCKET_NAME,
        Key: key,
      });

      const s3Response = await s3.send(command);

      if (!s3Response.Body) {
        return new NextResponse("Görsel içeriği boş.", { status: 404 });
      }

      // ETag kontrolü (304 Not Modified)
      const clientEtag = request.headers.get("if-none-match");
      if (s3Response.ETag && clientEtag === s3Response.ETag) {
        return new NextResponse(null, { status: 304 });
      }

      // MIME type belirleme
      const ext = filename.split(".").pop()?.toLowerCase() || "jpg";
      const contentType = s3Response.ContentType || MIME_TYPES[ext] || "image/jpeg";

      // Stream'i ByteArray'e dönüştür
      const byteArray = await s3Response.Body.transformToByteArray();

      return new NextResponse(Buffer.from(byteArray), {
        status: 200,
        headers: {
          "Content-Type": contentType,
          "Cache-Control": "public, max-age=31536000, immutable",
          ...(s3Response.ETag ? { ETag: s3Response.ETag } : {}),
          ...(s3Response.ContentLength ? { "Content-Length": String(s3Response.ContentLength) } : {}),
        },
      });
    } catch (s3Error: unknown) {
      const err = s3Error as { name?: string; $metadata?: { httpStatusCode?: number } };
      if (err.name === "NoSuchKey" || err.$metadata?.httpStatusCode === 404) {
        return new NextResponse("Görsel bulunamadı.", { status: 404 });
      }
      console.error("R2 görsel getirme hatası:", s3Error);
      return new NextResponse("Görsel yüklenirken sunucu hatası oluştu.", { status: 500 });
    }
  } catch (error) {
    console.error("Görsel sunma API genel hatası:", error);
    return new NextResponse("Sunucu hatası.", { status: 500 });
  }
}
