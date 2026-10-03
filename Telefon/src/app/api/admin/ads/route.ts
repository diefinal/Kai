import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search")?.trim();
    const position = searchParams.get("position")?.trim();
    const active = searchParams.get("active");

    const where: Prisma.AdWhereInput = {};

    if (position && position !== "ALL") {
      where.position = position as "HERO_SLIDER" | "IN_FEED";
    }

    if (active === "true") {
      where.isActive = true;
    } else if (active === "false") {
      where.isActive = false;
    }

    if (search) {
      where.OR = [
        { title: { contains: search, mode: "insensitive" } },
        { description: { contains: search, mode: "insensitive" } },
        { phoneModel: { brand: { contains: search, mode: "insensitive" } } },
        { phoneModel: { modelName: { contains: search, mode: "insensitive" } } },
      ];
    }

    const ads = await prisma.ad.findMany({
      where,
      include: {
        phoneModel: {
          include: {
            devices: {
              where: { status: "IN_STOCK" },
              select: { id: true },
            },
          },
        },
      },
      orderBy: [{ order: "asc" }, { createdAt: "desc" }],
    });

    const formatted = ads.map((ad) => {
      let phoneModelData = null;
      if (ad.phoneModel) {
        phoneModelData = {
          id: ad.phoneModel.id,
          brand: ad.phoneModel.brand,
          modelName: ad.phoneModel.modelName,
          ram: ad.phoneModel.ram,
          storage: ad.phoneModel.storage,
          color: ad.phoneModel.color,
          basePrice: Number(ad.phoneModel.basePrice),
          inStockCount: ad.phoneModel.devices.length,
        };
      }

      return {
        id: ad.id,
        title: ad.title,
        description: ad.description,
        imageUrl: ad.imageUrl,
        phoneModelId: ad.phoneModelId,
        targetRam: ad.targetRam,
        targetStorage: ad.targetStorage,
        buttonText: ad.buttonText,
        startDate: ad.startDate.toISOString(),
        endDate: ad.endDate ? ad.endDate.toISOString() : null,
        isActive: ad.isActive,
        position: ad.position,
        displayType: ad.displayType,
        order: ad.order,
        createdAt: ad.createdAt.toISOString(),
        updatedAt: ad.updatedAt.toISOString(),
        phoneModel: phoneModelData,
      };
    });

    return NextResponse.json({ success: true, data: formatted });
  } catch (error: unknown) {
    console.error("Admin Ads GET hatası:", error);
    return NextResponse.json(
      { success: false, error: "Reklamlar listelenirken hata oluştu." },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const title = body.title?.trim();
    const description = body.description?.trim() || null;
    const imageUrl = body.imageUrl?.trim() || null;
    const phoneModelId = body.phoneModelId?.trim() || null;
    const targetRam = body.targetRam?.trim() || null;
    const targetStorage = body.targetStorage?.trim() || null;
    const buttonText = body.buttonText?.trim() || "İncele";
    const startDate = body.startDate ? new Date(body.startDate) : new Date();
    const endDate = body.endDate ? new Date(body.endDate) : null;
    const isActive = body.isActive !== undefined ? Boolean(body.isActive) : true;
    const position = body.position === "IN_FEED" ? "IN_FEED" : "HERO_SLIDER";
    const displayType = body.displayType === "IMAGE_ONLY" ? "IMAGE_ONLY" : "IMAGE_AND_TEXT";
    const order = typeof body.order === "number" ? body.order : 0;

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

    if (phoneModelId) {
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

    const newAd = await prisma.ad.create({
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
      message: "Reklam başarıyla oluşturuldu.",
      data: newAd,
    });
  } catch (error: unknown) {
    console.error("Admin Ad POST hatası:", error);
    return NextResponse.json(
      { success: false, error: "Reklam oluşturulurken bir hata oluştu." },
      { status: 500 }
    );
  }
}
