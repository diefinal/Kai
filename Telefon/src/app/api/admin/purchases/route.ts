import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { isValidIMEI, parsePositiveDecimal } from "@/lib/validations";
import { parseColorList } from "@/lib/utils";

export const dynamic = "force-dynamic";

// Alış Girişlerini Listeleme (Arama, Tarih & Tedarikçi Filtreleri ile)
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search")?.trim();
    const supplierId = searchParams.get("supplierId");
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");

    const where: Prisma.DeviceWhereInput = {};

    if (supplierId && supplierId !== "ALL") {
      where.supplierId = supplierId;
    }

    if (startDate || endDate) {
      where.purchaseDate = {};
      if (startDate) {
        where.purchaseDate.gte = new Date(startDate);
      }
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        where.purchaseDate.lte = end;
      }
    }

    if (search) {
      where.OR = [
        { imei: { contains: search, mode: "insensitive" } },
        { model: { brand: { contains: search, mode: "insensitive" } } },
        { model: { modelName: { contains: search, mode: "insensitive" } } },
        { supplier: { name: { contains: search, mode: "insensitive" } } },
      ];
    }

    const devices = await prisma.device.findMany({
      where,
      include: {
        model: true,
        supplier: {
          select: {
            id: true,
            name: true,
            phone: true,
          },
        },
      },
      orderBy: { purchaseDate: "desc" },
    });

    const formatted = devices.map((d) => ({
      id: d.id,
      imei: d.imei,
      purchasePrice: Number(d.purchasePrice),
      salePrice: Number(d.salePrice),
      purchaseDate: d.purchaseDate,
      status: d.status,
      notes: d.notes,
      createdAt: d.createdAt,
      model: {
        id: d.model.id,
        brand: d.model.brand,
        modelName: d.model.modelName,
        ram: d.ram,
        storage: d.storage,
        color: d.color,
        imageUrl: d.model.imageUrl,
      },
      supplier: d.supplier,
    }));

    return NextResponse.json({ success: true, data: formatted });
  } catch (error: unknown) {
    console.error("Purchases GET hatası:", error);
    return NextResponse.json(
      { success: false, error: "Alış kayıtları listelenirken hata oluştu." },
      { status: 500 }
    );
  }
}

// Yeni Alış / Stok Girişi (Tekli veya Çoklu/Adetli Giriş - Tam Transaction Bütünlüğü)
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { modelId, supplierId, purchaseDate, ram, storage, color } = body;

    // 1. Temel Doğrulamalar
    if (!modelId) {
      return NextResponse.json(
        { success: false, error: "Lütfen bir telefon modeli seçiniz." },
        { status: 400 }
      );
    }

    if (!supplierId) {
      return NextResponse.json(
        { success: false, error: "Lütfen alış yapılan tedarikçi/cariyi seçiniz." },
        { status: 400 }
      );
    }

    // 2. Model ve Tedarikçi Varlık Kontrolü
    const [model, supplier] = await Promise.all([
      prisma.phoneModel.findUnique({ where: { id: modelId } }),
      prisma.cari.findUnique({ where: { id: supplierId } }),
    ]);

    if (!model) {
      return NextResponse.json(
        { success: false, error: "Seçilen telefon modeli sistemde bulunamadı." },
        { status: 404 }
      );
    }

    if (!supplier) {
      return NextResponse.json(
        { success: false, error: "Seçilen tedarikçi cari sistemde bulunamadı." },
        { status: 404 }
      );
    }

    if (!["SUPPLIER", "BOTH"].includes(supplier.type)) {
      return NextResponse.json(
        { success: false, error: "Yalnızca Tedarikçi (SUPPLIER veya BOTH) tipindeki carilerden alış yapılabilir." },
        { status: 400 }
      );
    }

    // 3. Kalem Listesi Oluşturma (İster doğrudan items[], ister quantity + unitPrice)
    let rawItems = body.items;

    if (!Array.isArray(rawItems) && body.quantity !== undefined) {
      const qty = parseInt(String(body.quantity), 10);
      if (isNaN(qty) || qty < 1) {
        return NextResponse.json(
          { success: false, error: "Geçerli bir adet giriniz (en az 1 olmalıdır)." },
          { status: 400 }
        );
      }
      const uPurchase = parsePositiveDecimal(body.unitPurchasePrice);
      const uSale = parsePositiveDecimal(
        body.unitSalePrice !== undefined ? body.unitSalePrice : model.basePrice
      );
      const imeisArray = Array.isArray(body.imeis) ? body.imeis : [];

      if (uPurchase === null) {
        return NextResponse.json(
          { success: false, error: "Geçerli bir birim alış fiyatı giriniz." },
          { status: 400 }
        );
      }
      if (uSale === null) {
        return NextResponse.json(
          { success: false, error: "Geçerli bir birim satış fiyatı giriniz." },
          { status: 400 }
        );
      }

      rawItems = [];
      for (let i = 0; i < qty; i++) {
        rawItems.push({
          imei: imeisArray[i] || null,
          purchasePrice: uPurchase,
          salePrice: uSale,
          notes: body.notes?.trim() || null,
          ram: ram !== undefined ? ram : model.ram,
          storage: storage !== undefined ? storage : model.storage,
          color: color !== undefined ? color : model.color,
        });
      }
    }

    if (!Array.isArray(rawItems) || rawItems.length === 0) {
      return NextResponse.json(
        { success: false, error: "En az bir cihaz kalemi veya geçerli bir adet girilmelidir." },
        { status: 400 }
      );
    }

    // 4. Kalemlerin Doğrulanması ve Batch İçi Duplicate Kontrolü (IMEI Opsiyonel)
    const cleanItems: Array<{
      imei: string | null;
      purchasePrice: number;
      salePrice: number;
      notes?: string | null;
      ram: string;
      storage: string;
      color: string;
    }> = [];

    const incomingIMEIs = new Set<string>();

    for (let i = 0; i < rawItems.length; i++) {
      const item = rawItems[i];
      const rawImei = item.imei !== undefined && item.imei !== null ? String(item.imei).trim() : "";
      const imei = rawImei === "" ? null : rawImei;

      // Eğer IMEI girilmişse doğrulama ve mükerrer kontrolü yap
      if (imei !== null) {
        if (!isValidIMEI(imei)) {
          return NextResponse.json(
            {
              success: false,
              error: `${i + 1}. sıradaki IMEI (${imei}) geçersizdir. IMEI 14-16 haneli alfanümerik olmalıdır.`,
            },
            { status: 400 }
          );
        }

        if (incomingIMEIs.has(imei)) {
          return NextResponse.json(
            {
              success: false,
              error: `Girdiğiniz listede aynı IMEI (${imei}) birden fazla kez yer almaktadır.`,
            },
            { status: 400 }
          );
        }
        incomingIMEIs.add(imei);
      }

      const purchasePrice = parsePositiveDecimal(item.purchasePrice);
      if (purchasePrice === null) {
        return NextResponse.json(
          { success: false, error: `${i + 1}. sıradaki cihazın alış fiyatı geçerli bir sayı olmalıdır.` },
          { status: 400 }
        );
      }

      const salePrice = parsePositiveDecimal(
        item.salePrice !== undefined ? item.salePrice : model.basePrice
      );
      if (salePrice === null) {
        return NextResponse.json(
          { success: false, error: `${i + 1}. sıradaki cihazın satış fiyatı geçerli bir sayı olmalıdır.` },
          { status: 400 }
        );
      }

      const rawColor = item.color || color || model.color || "Siyah";
      const singleColorList = parseColorList(rawColor);
      const deviceColor = singleColorList[0] || "Siyah";

      cleanItems.push({
        imei,
        purchasePrice,
        salePrice,
        notes: item.notes?.trim() || null,
        ram: item.ram || ram || model.ram || "8 GB",
        storage: item.storage || storage || model.storage || "128 GB",
        color: deviceColor,
      });
    }

    // 5. Veritabanındaki Mevcut IMEI'ler ile Duplicate Kontrolü (Yalnızca girilen IMEI'ler için)
    if (incomingIMEIs.size > 0) {
      const existingDevices = await prisma.device.findMany({
        where: {
          imei: { in: Array.from(incomingIMEIs) },
        },
        select: { imei: true },
      });

      if (existingDevices.length > 0) {
        const existingList = existingDevices.map((d) => d.imei).filter(Boolean).join(", ");
        return NextResponse.json(
          {
            success: false,
            error: `Şu IMEI numaraları sistemde zaten kayıtlıdır: ${existingList}. Aynı IMEI tekrar eklenemez.`,
          },
          { status: 409 }
        );
      }
    }

    // 6. Database Transaction İle Bütünsel Kayıt (Tek Cari Hareketi & Bakiye Güncellemesi)
    const pDate = purchaseDate ? new Date(purchaseDate) : new Date();
    const totalPurchaseCost = cleanItems.reduce((acc, curr) => acc + curr.purchasePrice, 0);

    const transactionResult = await prisma.$transaction(async (tx) => {
      // A) N adet cihaz oluştur (Tümü IN_STOCK durumunda)
      const createdDevices = [];
      for (const item of cleanItems) {
        const device = await tx.device.create({
          data: {
            modelId,
            supplierId,
            imei: item.imei, // null veya string
            ram: item.ram,
            storage: item.storage,
            color: item.color,
            purchasePrice: item.purchasePrice,
            salePrice: item.salePrice,
            purchaseDate: pDate,
            status: "IN_STOCK",
            notes: item.notes,
          },
        });
        createdDevices.push(device);
      }

      // B) Tedarikçi cari bakiyesini güncelle (Tek işlem: Bizim borcumuz artar -> bakiye negatif yönde değişir)
      await tx.cari.update({
        where: { id: supplierId },
        data: {
          currentBalance: {
            decrement: totalPurchaseCost,
          },
        },
      });

      // C) Cari hareket kaydı oluştur (CREDIT = Alacak, tek hareket kaydı)
      const txDescription =
        cleanItems.length === 1
          ? (cleanItems[0].imei
              ? `Alış: ${model.brand} ${model.modelName} (IMEI: ${cleanItems[0].imei})`
              : `Alış: ${model.brand} ${model.modelName}`)
          : `Toplu Alış: ${model.brand} ${model.modelName} (${cleanItems.length} Adet Cihaz)`;

      const cariTx = await tx.cariTransaction.create({
        data: {
          cariId: supplierId,
          type: "CREDIT",
          amount: totalPurchaseCost,
          description: txDescription,
          date: pDate,
          referenceType: "PURCHASE",
          referenceId: createdDevices[0].id,
        },
      });

      return {
        createdDevices,
        totalCost: totalPurchaseCost,
        cariTransactionId: cariTx.id,
      };
    });

    return NextResponse.json({
      success: true,
      message: `${transactionResult.createdDevices.length} adet cihaz başarıyla stoğa eklendi ve tedarikçi cari hareketi oluşturuldu.`,
      data: {
        count: transactionResult.createdDevices.length,
        totalCost: transactionResult.totalCost,
      },
    });
  } catch (error: unknown) {
    console.error("Alış transaction hatası:", error);
    const err = error as { code?: string };
    if (err.code === "P2002") {
      return NextResponse.json(
        { success: false, error: "Girilen IMEI numaralarından biri zaten sistemde kayıtlı." },
        { status: 409 }
      );
    }
    return NextResponse.json(
      { success: false, error: "Alış işlemi sırasında bir hata oluştu ve tüm işlem geri alındı (rollback)." },
      { status: 500 }
    );
  }
}
