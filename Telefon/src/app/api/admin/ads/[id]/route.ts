import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { deletePhoneImage } from "@/lib/storage";

export const dynamic = "force-dynamic";

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const ad = await prisma.ad.findUnique({
      where: { id },
      include: {
        phoneModel: true,
      },
    });

    if (!ad) {
      return NextResponse.json(
        { success: false, error: "Reklam bulunamadı." },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: ad });
  } catch (error: unknown) {
    console.error("Admin Ad GET [id] hatası:", error);
    return NextResponse.json(
      { success: false, error: "Reklam bilgileri yüklenemedi." },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const body = await request.json();

    const existing = await prisma.ad.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json(
        { success: false, error: "Güncellenecek reklam bulunamadı." },
        { status: 404 }
      );
    }

    const title = body.title !== undefined ? body.title.trim() : existing.title;
    const description = body.description !== undefined ? (body.description?.trim() || null) : existing.description;
    const imageUrl = body.imageUrl !== undefined ? (body.imageUrl?.trim() || null) : existing.imageUrl;
    const phoneModelId = body.phoneModelId !== undefined ? (body.phoneModelId?.trim() || null) : existing.phoneModelId;
    const targetRam = body.targetRam !== undefined ? (body.targetRam?.trim() || null) : existing.targetRam;
    const targetStorage = body.targetStorage !== undefined ? (body.targetStorage?.trim() || null) : existing.targetStorage;
    const buttonText = body.buttonText !== undefined ? (body.buttonText?.trim() || "İncele") : existing.buttonText;
    const startDate = body.startDate ? new Date(body.startDate) : existing.startDate;
    const endDate = body.endDate !== undefined ? (body.endDate ? new Date(body.endDate) : null) : existing.endDate;
    const isActive = body.isActive !== undefined ? Boolean(body.isActive) : existing.isActive;
    const position = body.position !== undefined ? (body.position === "IN_FEED" ? "IN_FEED" : "HERO_SLIDER") : existing.position;
    const displayType = body.displayType !== undefined ? (body.displayType === "IMAGE_ONLY" ? "IMAGE_ONLY" : "IMAGE_AND_TEXT") : existing.displayType;
    const order = body.order !== undefined && typeof body.order === "number" ? body.order : existing.order;

    if (!title) {
      return NextResponse.json(
        { success: false, error: "Reklam başlığı zorunludur." },
        { status: 400 }
      );
    }

    if (displayType === "IMAGE_ONLY" && !imageUrl) {
      return NextResponse.json(
        { success: false, error: "'Sadece Görsel' tipindeki reklamlar için bir görsel yüklenmelidir." },
        { status: 400 }
      );
    }

    if (phoneModelId && phoneModelId !== existing.phoneModelId) {
      const existingModel = await prisma.phoneModel.findUnique({
        where: { id: phoneModelId },
      });
      if (!existingModel) {
        return NextResponse.json(
          { success: false, error: "Seçilen telefon modeli sistemde bulunamadı." },
          { status: 404 }
        );
      }
    }

    // Eski görsel değiştirildiyse Storage'dan kaldır
    if (existing.imageUrl && imageUrl !== existing.imageUrl) {
      deletePhoneImage(existing.imageUrl).catch((err) =>
        console.warn("Eski reklam görseli silinirken uyarı:", err)
      );
    }

    const updated = await prisma.ad.update({
      where: { id },
      data: {
        title,
        description,
        imageUrl,
        phoneModelId,
        targetRam,
        targetStorage,
        buttonText,
        startDate,
        endDate,
        isActive,
        position,
        displayType,
        order,
      },
    });

    return NextResponse.json({
      success: true,
      message: "Reklam başarıyla güncellendi.",
      data: updated,
    });
  } catch (error: unknown) {
    console.error("Admin Ad PUT hatası:", error);
    return NextResponse.json(
      { success: false, error: "Reklam güncellenirken bir hata oluştu." },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    const existing = await prisma.ad.findUnique({
      where: { id },
      select: { id: true, imageUrl: true },
    });

    if (!existing) {
      return NextResponse.json(
        { success: false, error: "Silinecek reklam bulunamadı." },
        { status: 404 }
      );
    }

    await prisma.ad.delete({
      where: { id },
    });

    if (existing.imageUrl) {
      deletePhoneImage(existing.imageUrl).catch((err) =>
        console.warn("Silinen reklamın görseli kaldırılırken uyarı:", err)
      );
    }

    return NextResponse.json({
      success: true,
      message: "Reklam başarıyla silindi.",
    });
  } catch (error: unknown) {
    console.error("Admin Ad DELETE hatası:", error);
    return NextResponse.json(
      { success: false, error: "Reklam silinirken bir hata oluştu." },
      { status: 500 }
    );
  }
}
