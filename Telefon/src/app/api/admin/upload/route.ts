import { NextResponse } from "next/server";
import {
  isStorageConfigured,
  uploadPhoneImage,
  deletePhoneImage,
  MAX_FILE_SIZE,
  ALLOWED_MIME_TYPES,
} from "@/lib/storage";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    if (!isStorageConfigured()) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Supabase Storage yapılandırması eksik. Lütfen .env dosyasında NEXT_PUBLIC_SUPABASE_URL ve SUPABASE_SECRET_KEY değişkenlerini tanımlayın.",
        },
        { status: 503 }
      );
    }

    const formData = await request.formData();
    const file = formData.get("file");

    if (!file || !(file instanceof File)) {
      return NextResponse.json(
        { success: false, error: "Yüklenecek dosya bulunamadı." },
        { status: 400 }
      );
    }

    // MIME type doğrulaması
    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
      return NextResponse.json(
        {
          success: false,
          error: "Geçersiz dosya türü. Yalnızca JPG, PNG veya WEBP formatındaki görseller kabul edilir.",
        },
        { status: 400 }
      );
    }

    // Dosya boyutu doğrulaması
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        {
          success: false,
          error: "Dosya boyutu 5 MB sınırını aşıyor. Lütfen daha küçük bir görsel seçin.",
        },
        { status: 400 }
      );
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const { publicUrl, path } = await uploadPhoneImage(buffer, file.type);

    return NextResponse.json({
      success: true,
      message: "Görsel başarıyla yüklendi.",
      data: {
        url: publicUrl,
        path,
      },
    });
  } catch (error: unknown) {
    console.error("Görsel yükleme API hatası:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Görsel yüklenirken bir hata oluştu.",
      },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  try {
    if (!isStorageConfigured()) {
      return NextResponse.json(
        { success: false, error: "Storage yapılandırılmamış." },
        { status: 503 }
      );
    }

    const body = await request.json();
    const target = body.url || body.path;

    if (!target) {
      return NextResponse.json(
        { success: false, error: "Silinecek görsel belirtilmedi." },
        { status: 400 }
      );
    }

    const deleted = await deletePhoneImage(target);

    return NextResponse.json({
      success: true,
      message: deleted ? "Görsel silindi." : "Görsel bulunamadı veya silinemedi.",
    });
  } catch (error: unknown) {
    console.error("Görsel silme API hatası:", error);
    return NextResponse.json(
      { success: false, error: "Görsel silinirken hata oluştu." },
      { status: 500 }
    );
  }
}
