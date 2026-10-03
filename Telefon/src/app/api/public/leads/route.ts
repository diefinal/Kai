import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      customerName,
      customerPhone,
      notes,
      modelId,
      brand,
      modelName,
      ram,
      storage,
      color,
    } = body || {};

    // 1. Girdi Doğrulaması
    if (!customerName || typeof customerName !== "string" || !customerName.trim()) {
      return NextResponse.json(
        { success: false, error: "Lütfen adınızı ve soyadınızı giriniz." },
        { status: 400 }
      );
    }

    if (!customerPhone || typeof customerPhone !== "string" || !customerPhone.trim()) {
      return NextResponse.json(
        { success: false, error: "Lütfen telefon numaranızı giriniz." },
        { status: 400 }
      );
    }

    const cleanName = customerName.trim();
    const cleanPhone = customerPhone.trim();
    const cleanNotes = typeof notes === "string" ? notes.trim() : null;

    // 2. Ürün ve Varyant Bilgilerinin Sunucu Tarafında DB'den Doğrulanması
    let targetPhoneModel = null;
    if (modelId) {
      targetPhoneModel = await prisma.phoneModel.findUnique({
        where: { id: modelId },
      });
    }

    if (!targetPhoneModel && brand && modelName) {
      targetPhoneModel = await prisma.phoneModel.findFirst({
        where: {
          brand: { equals: brand, mode: "insensitive" },
          modelName: { equals: modelName, mode: "insensitive" },
          isActive: true,
        },
      });
    }

    if (!targetPhoneModel) {
      return NextResponse.json(
        { success: false, error: "Seçilen telefon modeli sistemde bulunamadı." },
        { status: 404 }
      );
    }

    const targetBrand = targetPhoneModel.brand;
    const targetModelName = targetPhoneModel.modelName;
    const targetRam = ram || targetPhoneModel.ram || "8 GB";
    const targetStorage = storage || targetPhoneModel.storage || "128 GB";
    const targetColor = color || targetPhoneModel.color || "Siyah";

    // 3. Stok Durumu ve Gerçek Fiyatın Belirlenmesi (Price Snapshot)
    const matchingDevices = await prisma.device.findMany({
      where: {
        status: "IN_STOCK",
        ram: { equals: targetRam, mode: "insensitive" },
        storage: { equals: targetStorage, mode: "insensitive" },
        color: { equals: targetColor, mode: "insensitive" },
        model: {
          brand: { equals: targetBrand, mode: "insensitive" },
          modelName: { equals: targetModelName, mode: "insensitive" },
          isActive: true,
        },
      },
      select: { salePrice: true },
    });

    const isStockAvailable = matchingDevices.length > 0;
    let snapshotPriceDecimal = targetPhoneModel.basePrice;

    if (isStockAvailable) {
      const minPrice = Math.min(...matchingDevices.map((d) => Number(d.salePrice)));
      if (minPrice > 0) {
        snapshotPriceDecimal = new Prisma.Decimal(minPrice);
      }
    }

    // 4. Anti-Spam / Çift Tıklama Koruması (Son 2 dakika kontrolü)
    const twoMinutesAgo = new Date(Date.now() - 2 * 60 * 1000);
    const recentDuplicate = await prisma.salesLead.findFirst({
      where: {
        customerPhone: cleanPhone,
        brand: targetBrand,
        modelName: targetModelName,
        ram: targetRam,
        storage: targetStorage,
        color: targetColor,
        createdAt: { gte: twoMinutesAgo },
      },
    });

    if (recentDuplicate) {
      // Çift tıklama durumunda mevcut talebi döndür (Spam engelleme)
      return NextResponse.json({
        success: true,
        data: {
          leadNumber: recentDuplicate.leadNumber,
          message: "Talebiniz zaten alındı. En kısa sürede sizinle iletişime geçeceğiz.",
        },
      });
    }

    // 5. Yeni Lead Numarası Üretme (TR-YYYY-XXXX)
    const year = new Date().getFullYear();
    const count = await prisma.salesLead.count();
    const leadNumber = `TR-${year}-${(count + 1).toString().padStart(4, "0")}`;

    // 6. Veritabanına Kayıt
    const newLead = await prisma.salesLead.create({
      data: {
        leadNumber,
        customerName: cleanName,
        customerPhone: cleanPhone,
        notes: cleanNotes,
        brand: targetBrand,
        modelName: targetModelName,
        ram: targetRam,
        storage: targetStorage,
        color: targetColor,
        snapshotPrice: snapshotPriceDecimal,
        snapshotStock: isStockAvailable,
        phoneModelId: targetPhoneModel.id,
        status: "YENI",
      },
    });

    // 7. Güvenli Public Response (Hassas hiçbir dahili alan sızdırılmaz)
    return NextResponse.json({
      success: true,
      data: {
        leadNumber: newLead.leadNumber,
        customerName: newLead.customerName,
        brand: newLead.brand,
        modelName: newLead.modelName,
        ram: newLead.ram,
        storage: newLead.storage,
        color: newLead.color,
        snapshotPrice: Number(newLead.snapshotPrice),
        snapshotStock: newLead.snapshotStock,
        status: newLead.status,
        createdAt: newLead.createdAt.toISOString(),
      },
    });
  } catch (error: unknown) {
    console.error("Public talep oluşturma hatası:", error);
    return NextResponse.json(
      { success: false, error: "Talep oluşturulurken bir hata meydana geldi." },
      { status: 500 }
    );
  }
}
