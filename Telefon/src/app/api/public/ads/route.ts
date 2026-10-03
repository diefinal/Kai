import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { PublicAdDTO } from "@/types";
import { generateWhatsAppLink } from "@/lib/whatsapp";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const position = searchParams.get("position"); // HERO_SLIDER, IN_FEED, ALL

    const now = new Date();

    const whereClause: Prisma.AdWhereInput = {
      isActive: true,
      startDate: { lte: now },
      OR: [
        { endDate: null },
        { endDate: { gte: now } },
      ],
    };

    if (position && (position === "HERO_SLIDER" || position === "IN_FEED")) {
      whereClause.position = position;
    }

    const ads = await prisma.ad.findMany({
      where: whereClause,
      include: {
        phoneModel: {
          select: {
            id: true,
            brand: true,
            modelName: true,
            ram: true,
            storage: true,
            color: true,
            basePrice: true,
            devices: {
              where: { status: "IN_STOCK" },
              select: {
                id: true,
                salePrice: true,
                ram: true,
                storage: true,
                color: true,
              },
            },
          },
        },
      },
      orderBy: [{ order: "asc" }, { createdAt: "desc" }],
    });

    const publicAds: PublicAdDTO[] = [];

    for (const ad of ads) {
      // 1. Stok Kontrolü: Telefona/Varyanta bağlı bir reklam ise ve IN_STOCK = 0 ise vitrinde GÖSTERİLMEZ
      if (ad.phoneModelId) {
        if (!ad.phoneModel) {
          continue; // Bağlı model silindiyse veya erişilemiyorsa atla
        }

        let matchingDevices = ad.phoneModel.devices;
        if (ad.targetRam) {
          matchingDevices = matchingDevices.filter((d) => d.ram === ad.targetRam);
        }
        if (ad.targetStorage) {
          matchingDevices = matchingDevices.filter((d) => d.storage === ad.targetStorage);
        }

        if (matchingDevices.length === 0) {
          // İlgili özel varyantta stok kalmadı, reklam otomatik gizlenir
          continue;
        }

        // Stoktaki cihazlardan en düşük satış fiyatını bul
        const minSalePrice = Math.min(
          ...matchingDevices.map((d) => Number(d.salePrice))
        );

        const firstDev = matchingDevices[0];
        const targetRamVal = ad.targetRam || firstDev.ram || ad.phoneModel.ram;
        const targetStorageVal = ad.targetStorage || firstDev.storage || ad.phoneModel.storage;

        const whatsappLink = generateWhatsAppLink({
          brand: ad.phoneModel.brand,
          modelName: ad.phoneModel.modelName,
          ram: targetRamVal,
          storage: targetStorageVal,
          color: firstDev.color || ad.phoneModel.color,
          inStock: true,
        });

        publicAds.push({
          id: ad.id,
          title: ad.title,
          description: ad.description,
          imageUrl: ad.imageUrl,
          position: ad.position,
          displayType: ad.displayType,
          buttonText: ad.buttonText,
          startDate: ad.startDate.toISOString(),
          endDate: ad.endDate ? ad.endDate.toISOString() : null,
          targetRam: ad.targetRam,
          targetStorage: ad.targetStorage,
          connectedPhone: {
            modelId: ad.phoneModel.id,
            brand: ad.phoneModel.brand,
            modelName: ad.phoneModel.modelName,
            ram: targetRamVal,
            storage: targetStorageVal,
            minSalePrice,
            inStock: true,
            whatsappLink,
          },
        });
      } else {
        // Genel kampanya reklamı (telefona bağlı değil) - stok kısıtından etkilenmez
        publicAds.push({
          id: ad.id,
          title: ad.title,
          description: ad.description,
          imageUrl: ad.imageUrl,
          position: ad.position,
          displayType: ad.displayType,
          buttonText: ad.buttonText,
          startDate: ad.startDate.toISOString(),
          endDate: ad.endDate ? ad.endDate.toISOString() : null,
          connectedPhone: null,
        });
      }
    }

    return NextResponse.json({
      success: true,
      data: publicAds,
    });
  } catch (error: unknown) {
    console.error("Public reklam listeleme hatası:", error);
    return NextResponse.json(
      { success: false, error: "Reklamlar yüklenirken bir hata oluştu." },
      { status: 500 }
    );
  }
}
