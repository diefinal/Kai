import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { parsePositiveDecimal } from "@/lib/validations";

export const dynamic = "force-dynamic";

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const body = await request.json();

    // Find the device
    const device = await prisma.device.findUnique({
      where: { id },
      include: { model: true },
    });

    if (!device) {
      return NextResponse.json(
        { success: false, error: "Cihaz bulunamadı." },
        { status: 404 }
      );
    }

    const updates: { purchasePrice?: number; salePrice?: number } = {};
    let purchasePriceDiff = 0;

    // Handle purchasePrice change
    if (body.purchasePrice !== undefined) {
      const newPurchasePrice = parsePositiveDecimal(body.purchasePrice);
      if (newPurchasePrice === null || newPurchasePrice < 0) {
        return NextResponse.json(
          { success: false, error: "Geçerli bir alış fiyatı giriniz." },
          { status: 400 }
        );
      }
      purchasePriceDiff = newPurchasePrice - Number(device.purchasePrice);
      updates.purchasePrice = newPurchasePrice;
    }

    // Handle salePrice change
    if (body.salePrice !== undefined) {
      if (device.status === "SOLD") {
        return NextResponse.json(
          { success: false, error: "Satılmış cihazın hedef satış fiyatı değiştirilemez. Gerçekleşmiş satış fiyatı SaleItem kaydında korunmaktadır." },
          { status: 400 }
        );
      }
      const newSalePrice = parsePositiveDecimal(body.salePrice);
      if (newSalePrice === null || newSalePrice < 0) {
        return NextResponse.json(
          { success: false, error: "Geçerli bir hedef satış fiyatı giriniz." },
          { status: 400 }
        );
      }
      updates.salePrice = newSalePrice;
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json(
        { success: false, error: "Güncellenecek bir alan belirtilmedi." },
        { status: 400 }
      );
    }

    // If purchase price changed, update CariTransaction and supplier balance in a transaction
    if (purchasePriceDiff !== 0) {
      await prisma.$transaction(async (tx) => {
        // Update the device
        await tx.device.update({
          where: { id },
          data: updates,
        });

        // Find the related PURCHASE CariTransaction for this device's supplier
        // The referenceId points to the first device in the batch
        // We need to find the CariTransaction that was created for this device's purchase batch
        const cariTransaction = await tx.cariTransaction.findFirst({
          where: {
            cariId: device.supplierId,
            referenceType: "PURCHASE",
            // Match by date and approximate timing - find transactions around the device's purchase date
            date: device.purchaseDate,
          },
          orderBy: { createdAt: "desc" },
        });

        if (cariTransaction) {
          // Update the CariTransaction amount
          await tx.cariTransaction.update({
            where: { id: cariTransaction.id },
            data: {
              amount: { increment: purchasePriceDiff },
            },
          });
        }

        // Update supplier's current balance
        // Original purchase decremented balance (our debt increased)
        // If price increased, our debt increases more (decrement more)
        // If price decreased, our debt decreases (increment back)
        await tx.cari.update({
          where: { id: device.supplierId },
          data: {
            currentBalance: { decrement: purchasePriceDiff },
          },
        });
      });
    } else {
      // Only salePrice changed, no financial implications
      await prisma.device.update({
        where: { id },
        data: updates,
      });
    }

    // Fetch updated device
    const updatedDevice = await prisma.device.findUnique({
      where: { id },
      include: { model: true, supplier: { select: { id: true, name: true } } },
    });

    return NextResponse.json({
      success: true,
      message: "Cihaz fiyatları başarıyla güncellendi.",
      data: {
        id: updatedDevice!.id,
        purchasePrice: Number(updatedDevice!.purchasePrice),
        salePrice: Number(updatedDevice!.salePrice),
        status: updatedDevice!.status,
      },
    });
  } catch (error: unknown) {
    console.error("Device fiyat güncelleme hatası:", error);
    return NextResponse.json(
      { success: false, error: "Cihaz fiyatları güncellenirken hata oluştu." },
      { status: 500 }
    );
  }
}

// Alış Kaydı Silme (Tek Transaction, Cari Bakiye Düzeltme & SOLD Engel Kontrolü)
export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    const device = await prisma.device.findUnique({
      where: { id },
      include: { model: true, supplier: true },
    });

    if (!device) {
      return NextResponse.json(
        { success: false, error: "Alış kaydı/cihaz bulunamadı." },
        { status: 404 }
      );
    }

    // Bu alış grubuyla ilişkili CariTransaction kaydını bul
    const cariTransaction = await prisma.cariTransaction.findFirst({
      where: {
        cariId: device.supplierId,
        referenceType: "PURCHASE",
        OR: [
          { referenceId: device.id },
          { date: device.purchaseDate },
        ],
      },
      orderBy: { createdAt: "desc" },
    });

    // Aynı alış grubunda eklenen cihazları bul (Aynı tedarikçi, aynı alış tarihi ve eşleşen oluşturulma zamanı)
    const createdAtWindowStart = new Date(device.createdAt.getTime() - 5000);
    const createdAtWindowEnd = new Date(device.createdAt.getTime() + 5000);

    let batchDevices = await prisma.device.findMany({
      where: {
        supplierId: device.supplierId,
        purchaseDate: device.purchaseDate,
        createdAt: {
          gte: createdAtWindowStart,
          lte: createdAtWindowEnd,
        },
      },
    });

    if (batchDevices.length === 0) {
      batchDevices = [device];
    }

    // KONTROL: Alış grubundaki cihazlardan herhangi biri SOLD durumunda ise silmeye izin verme!
    const soldDevices = batchDevices.filter((d) => d.status === "SOLD");
    if (soldDevices.length > 0) {
      return NextResponse.json(
        {
          success: false,
          error: "Bu alışa ait satılmış cihaz bulunduğu için alış kaydı silinemez. Önce ilgili satış kaydını silmeniz/iptal etmeniz gerekir.",
        },
        { status: 400 }
      );
    }

    // Silme işlemini TEK PRISMA TRANSACTION içerisinde gerçekleştir
    await prisma.$transaction(async (tx) => {
      const batchDeviceIds = batchDevices.map((d) => d.id);
      const totalPurchaseCost = batchDevices.reduce(
        (acc, curr) => acc + Number(curr.purchasePrice),
        0
      );

      // 1. CariTransaction varsa kaldır
      if (cariTransaction) {
        await tx.cariTransaction.delete({
          where: { id: cariTransaction.id },
        });
      }

      // 2. Tedarikçi cari bakiyesini atomic olarak düzelt (Bizim borcumuz azaldığı için bakiye increment edilir)
      await tx.cari.update({
        where: { id: device.supplierId },
        data: {
          currentBalance: {
            increment: totalPurchaseCost,
          },
        },
      });

      // 3. Alış grubundaki tüm cihazları sil
      await tx.device.deleteMany({
        where: { id: { in: batchDeviceIds } },
      });
    });

    return NextResponse.json({
      success: true,
      message: `Alış kaydı (${batchDevices.length} adet cihaz) ve tedarikçi cari hareketi başarıyla silindi. Tedarikçi bakiyesi düzeltildi.`,
    });
  } catch (error: unknown) {
    console.error("Alış kaydı silme hatası:", error);
    return NextResponse.json(
      { success: false, error: "Alış kaydı silinirken bir hata oluştu ve tüm işlem geri alındı." },
      { status: 500 }
    );
  }
}

