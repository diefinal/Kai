import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";

export const dynamic = "force-dynamic";

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const lead = await prisma.salesLead.findUnique({
      where: { id },
      include: {
        device: {
          select: {
            id: true,
            status: true,
            imei: true,
            color: true,
            ram: true,
            storage: true,
            salePrice: true,
          },
        },
        customer: true,
        sale: true,
        depositPayment: true,
        refundPayment: true,
      },
    });

    if (!lead) {
      return NextResponse.json(
        { success: false, error: "Satış fırsatı bulunamadı." },
        { status: 404 }
      );
    }

    // Fetch available IN_STOCK devices matching brand & model for potential assignment
    const availableDevices = await prisma.device.findMany({
      where: {
        status: "IN_STOCK",
        model: {
          brand: { equals: lead.brand, mode: "insensitive" },
          modelName: { equals: lead.modelName, mode: "insensitive" },
        },
      },
      select: {
        id: true,
        imei: true,
        ram: true,
        storage: true,
        color: true,
        salePrice: true,
        status: true,
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({
      success: true,
      data: {
        ...lead,
        snapshotPrice: Number(lead.snapshotPrice),
        depositAmount: Number(lead.depositAmount),
        refundAmount: lead.refundAmount ? Number(lead.refundAmount) : null,
        availableDevices: availableDevices.map((d) => ({
          id: d.id,
          imei: d.imei,
          ram: d.ram,
          storage: d.storage,
          color: d.color,
          salePrice: Number(d.salePrice),
          status: d.status,
        })),
      },
    });
  } catch (error: unknown) {
    console.error("Satış fırsatı detay hatası:", error);
    return NextResponse.json(
      { success: false, error: "Detaylar alınırken bir hata oluştu." },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const body = await request.json();
    const { action } = body || {};

    const lead = await prisma.salesLead.findUnique({
      where: { id },
      include: {
        device: true,
        customer: true,
        depositPayment: true,
      },
    });

    if (!lead) {
      return NextResponse.json(
        { success: false, error: "Satış fırsatı bulunamadı." },
        { status: 404 }
      );
    }

    // -------------------------------------------------------------
    // ACTION 1: UPDATE_STATUS (Durum Güncelleme)
    // -------------------------------------------------------------
    if (action === "UPDATE_STATUS") {
      const { newStatus, notes } = body;
      if (!newStatus) {
        return NextResponse.json(
          { success: false, error: "Yeni durum belirtilmedi." },
          { status: 400 }
        );
      }

      const updated = await prisma.salesLead.update({
        where: { id },
        data: {
          status: newStatus,
          ...(notes ? { notes: `${lead.notes ? `${lead.notes}\n` : ""}${notes}` } : {}),
        },
      });

      return NextResponse.json({ success: true, data: updated });
    }

    // -------------------------------------------------------------
    // ACTION 2: RECORD_DEPOSIT (Kapora Alma)
    // -------------------------------------------------------------
    if (action === "RECORD_DEPOSIT") {
      const { depositAmount, depositMethod, depositNotes, recordedBy, deviceId } = body;
      const numAmount = Number(depositAmount);
      const snapshotPriceNum = Number(lead.snapshotPrice);

      // Rule 1 Validation: depositAmount > 0 ve depositAmount <= snapshotPrice
      if (isNaN(numAmount) || numAmount <= 0) {
        return NextResponse.json(
          { success: false, error: "Kapora tutarı 0'dan büyük olmalıdır." },
          { status: 400 }
        );
      }

      if (numAmount > snapshotPriceNum) {
        return NextResponse.json(
          {
            success: false,
            error: `Kapora tutarı ürün fiyatını (${snapshotPriceNum.toLocaleString("tr-TR")} ₺) aşamaz.`,
          },
          { status: 400 }
        );
      }

      // Rule 2 Validation: Mükerrer kapora engeli
      if (lead.depositStatus === "RECEIVED") {
        return NextResponse.json(
          { success: false, error: "Bu talep için kapora zaten alınmış." },
          { status: 400 }
        );
      }

      // Execute in atomic transaction
      const result = await prisma.$transaction(async (tx) => {
        // 1. Müşteri Cari kaydı var mı kontrol et veya oluştur
        let customerId = lead.customerId;
        if (!customerId) {
          // Telefon veya isme göre mevcut cariyi ara
          const existingCari = await tx.cari.findFirst({
            where: {
              OR: [
                { phone: lead.customerPhone },
                { name: { equals: lead.customerName, mode: "insensitive" } },
              ],
            },
          });

          if (existingCari) {
            customerId = existingCari.id;
          } else {
            const newCari = await tx.cari.create({
              data: {
                name: lead.customerName,
                phone: lead.customerPhone,
                type: "CUSTOMER",
              },
            });
            customerId = newCari.id;
          }
        }

        // 2. Cihaz Rezervasyonu (Gerekirse & Concurrency Control)
        let boundDeviceId = lead.deviceId;
        if (deviceId && deviceId !== lead.deviceId) {
          const deviceUpdate = await tx.device.updateMany({
            where: { id: deviceId, status: "IN_STOCK" },
            data: { status: "RESERVED" },
          });

          if (deviceUpdate.count === 0) {
            throw new Error(
              "Seçilen cihaz başka bir işlem tarafından rezerve edilmiş veya satılmış."
            );
          }

          // Eski cihaz varsa serbest bırak
          if (lead.deviceId) {
            await tx.device.update({
              where: { id: lead.deviceId },
              data: { status: "IN_STOCK" },
            });
          }

          boundDeviceId = deviceId;
        }

        const depositDecimal = new Prisma.Decimal(numAmount);

        // 3. Payment kaydı (INCOMING - Kasaya Kapora Tahsilatı)
        const payment = await tx.payment.create({
          data: {
            cariId: customerId,
            type: "INCOMING",
            amount: depositDecimal,
            method: depositMethod || "CASH",
            description: `Kapora Tahsilatı - Talep #${lead.leadNumber} (${lead.brand} ${lead.modelName})`,
            reference: lead.leadNumber,
          },
        });

        // 4. CariTransaction kaydı (CREDIT - Müşteri Kapora Alacaklısı Olur)
        await tx.cariTransaction.create({
          data: {
            cariId: customerId,
            type: "CREDIT",
            amount: depositDecimal,
            description: `Kapora Tahsilatı - Talep #${lead.leadNumber}`,
            referenceType: "LEAD_DEPOSIT",
            referenceId: lead.id,
          },
        });

        // 5. Cari Bakiye Güncellemesi (Alacaklandır: Pozitif bakiye azalsın / negatifleşsin)
        await tx.cari.update({
          where: { id: customerId },
          data: {
            currentBalance: { decrement: depositDecimal },
          },
        });

        // 6. SalesLead güncellemesi
        const updatedLead = await tx.salesLead.update({
          where: { id },
          data: {
            status: "KAPORA_ALINDI",
            depositAmount: depositDecimal,
            depositStatus: "RECEIVED",
            depositMethod: depositMethod || "CASH",
            depositDate: new Date(),
            depositNotes: depositNotes || null,
            depositRecordedBy: recordedBy || "Yönetici",
            customerId,
            depositPaymentId: payment.id,
            ...(boundDeviceId ? { deviceId: boundDeviceId } : {}),
          },
        });

        return updatedLead;
      });

      return NextResponse.json({ success: true, data: result });
    }

    // -------------------------------------------------------------
    // ACTION 3: REFUND_DEPOSIT (Kapora İadesi veya İade Edilmedi İşlemi)
    // -------------------------------------------------------------
    if (action === "REFUND_DEPOSIT") {
      const { isRefunded, refundAmount, refundMethod, refundNotes } = body;

      if (lead.depositStatus === "REFUNDED") {
        return NextResponse.json(
          { success: false, error: "Bu kaporanın iadesi zaten yapılmış." },
          { status: 400 }
        );
      }

      const collectedDeposit = Number(lead.depositAmount);

      if (isRefunded) {
        const numRefund = Number(refundAmount);
        if (isNaN(numRefund) || numRefund <= 0) {
          return NextResponse.json(
            { success: false, error: "İade tutarı 0'dan büyük olmalıdır." },
            { status: 400 }
          );
        }

        // Rule: Toplam iade edilen tutar tahsil edilmiş kaporayı aşamaz
        if (numRefund > collectedDeposit) {
          return NextResponse.json(
            {
              success: false,
              error: `İade tutarı tahsil edilen kaporayı (${collectedDeposit.toLocaleString("tr-TR")} ₺) aşamaz.`,
            },
            { status: 400 }
          );
        }
      }

      const result = await prisma.$transaction(async (tx) => {
        let refundPaymentId = null;
        const refundDecimal = new Prisma.Decimal(
          isRefunded ? Number(refundAmount) : 0
        );

        if (isRefunded && lead.customerId && Number(refundAmount) > 0) {
          // 1. Payment kaydı (OUTGOING - Kasadan İade Çıkışı)
          const payment = await tx.payment.create({
            data: {
              cariId: lead.customerId,
              type: "OUTGOING",
              amount: refundDecimal,
              method: refundMethod || "CASH",
              description: `Kapora İadesi - Talep #${lead.leadNumber}`,
              reference: lead.leadNumber,
            },
          });
          refundPaymentId = payment.id;

          // 2. CariTransaction kaydı (DEBIT - Müşteri Borçlandırılır/Alacak Kapanır)
          await tx.cariTransaction.create({
            data: {
              cariId: lead.customerId,
              type: "DEBIT",
              amount: refundDecimal,
              description: `Kapora İadesi - Talep #${lead.leadNumber}`,
              referenceType: "LEAD_REFUND",
              referenceId: lead.id,
            },
          });

          // 3. Cari Bakiye Güncellemesi (Borçlandır: Bakiye yükselir / nötrleşir)
          await tx.cari.update({
            where: { id: lead.customerId },
            data: {
              currentBalance: { increment: refundDecimal },
            },
          });
        }

        // 4. Rezerve cihaz varsa serbest bırak (IN_STOCK yap)
        if (lead.deviceId) {
          await tx.device.update({
            where: { id: lead.deviceId },
            data: { status: "IN_STOCK" },
          });
        }

        // 5. SalesLead güncellemesi
        const updatedLead = await tx.salesLead.update({
          where: { id },
          data: {
            status: "VAZGECTI",
            depositStatus: isRefunded ? "REFUNDED" : "NOT_REFUNDED",
            refundAmount: isRefunded ? refundDecimal : null,
            refundDate: isRefunded ? new Date() : null,
            refundMethod: isRefunded ? refundMethod || "CASH" : null,
            refundNotes: refundNotes || null,
            refundPaymentId,
            deviceId: null, // Rezervasyon kalktığı için cihaz bağı çözülür
          },
        });

        return updatedLead;
      });

      return NextResponse.json({ success: true, data: result });
    }

    // -------------------------------------------------------------
    // ACTION 4: CONVERT_TO_SALE (Satışa Dönüştürme)
    // -------------------------------------------------------------
    if (action === "CONVERT_TO_SALE") {
      const { finalPrice, confirmPriceChange, deviceId, spotPaymentAmount, spotPaymentMethod } = body;

      if (lead.status === "SATISA_DONUSTU") {
        return NextResponse.json(
          { success: false, error: "Bu talep zaten satışa dönüştürülmüş." },
          { status: 400 }
        );
      }

      // Cihaz Kontrolü: Satış için bağlı veya seçilmiş geçerli bir cihaz şarttır
      const targetDeviceId = deviceId || lead.deviceId;
      if (!targetDeviceId) {
        return NextResponse.json(
          { success: false, error: "Satışa dönüştürmek için stoktan bir cihaz seçilmelidir." },
          { status: 400 }
        );
      }

      // Price Snapshot Rule Check:
      const snapshotPriceNum = Number(lead.snapshotPrice);
      const salePriceNum = finalPrice !== undefined ? Number(finalPrice) : snapshotPriceNum;

      if (isNaN(salePriceNum) || salePriceNum <= 0) {
        return NextResponse.json(
          { success: false, error: "Geçerli bir satış fiyatı giriniz." },
          { status: 400 }
        );
      }

      // Fiyat değişikliği varsa manuel onay şartı
      if (salePriceNum !== snapshotPriceNum && !confirmPriceChange) {
        return NextResponse.json(
          {
            success: false,
            error: `Fiyat değişikliği tespit edildi. (Talep Fiyatı: ${snapshotPriceNum.toLocaleString(
              "tr-TR"
            )} ₺ -> Yeni Fiyat: ${salePriceNum.toLocaleString(
              "tr-TR"
            )} ₺). Lütfen fiyat değişikliğini onaylayınız.`,
            requiresConfirmation: true,
            snapshotPrice: snapshotPriceNum,
            requestedPrice: salePriceNum,
          },
          { status: 400 }
        );
      }

      const depositAmountNum = Number(lead.depositAmount);
      if (depositAmountNum > salePriceNum) {
        return NextResponse.json(
          { success: false, error: "Alınan kapora satış fiyatından büyük olamaz." },
          { status: 400 }
        );
      }

      const result = await prisma.$transaction(async (tx) => {
        // 1. Cihaz Durumunu Kontrol Et ve SOLD yap
        const device = await tx.device.findUnique({
          where: { id: targetDeviceId },
        });

        if (!device) {
          throw new Error("Seçilen cihaz veritabanında bulunamadı.");
        }

        if (device.status === "SOLD") {
          throw new Error("Seçilen cihaz zaten başkasına satılmış.");
        }

        // 2. Müşteri Cari Hesabı (Yoksa Oluştur)
        let customerId = lead.customerId;
        if (!customerId) {
          const existingCari = await tx.cari.findFirst({
            where: {
              OR: [
                { phone: lead.customerPhone },
                { name: { equals: lead.customerName, mode: "insensitive" } },
              ],
            },
          });

          if (existingCari) {
            customerId = existingCari.id;
          } else {
            const newCari = await tx.cari.create({
              data: {
                name: lead.customerName,
                phone: lead.customerPhone,
                type: "CUSTOMER",
              },
            });
            customerId = newCari.id;
          }
        }

        // 3. Cihaz Durumunu SOLD yap
        await tx.device.update({
          where: { id: targetDeviceId },
          data: { status: "SOLD" },
        });

        const salePriceDecimal = new Prisma.Decimal(salePriceNum);
        const purchasePriceDecimal = device.purchasePrice;
        const profitDecimal = salePriceDecimal.minus(purchasePriceDecimal);

        // Spot ödeme (Teslim anında alınan ekstra ödeme) varsa hesaba kat
        const spotAmountNum = spotPaymentAmount ? Number(spotPaymentAmount) : 0;
        const totalPaidSoFar = depositAmountNum + spotAmountNum;
        const remainingAmountNum = Math.max(0, salePriceNum - totalPaidSoFar);

        const paidDecimal = new Prisma.Decimal(totalPaidSoFar);
        const remainingDecimal = new Prisma.Decimal(remainingAmountNum);

        const paymentType =
          remainingAmountNum === 0 ? "CASH" : paidAmountNumGreaterThanZero() ? "PARTIAL" : "INSTALLMENT";

        function paidAmountNumGreaterThanZero() {
          return totalPaidSoFar > 0;
        }

        // 4. Sale Numarası Üret
        const saleCount = await tx.sale.count();
        const saleNumber = `SL-${new Date().getFullYear()}-${(saleCount + 1)
          .toString()
          .padStart(4, "0")}`;

        // 5. Sale Kaydı Oluştur
        const sale = await tx.sale.create({
          data: {
            saleNumber,
            customerId,
            totalAmount: salePriceDecimal,
            totalProfit: profitDecimal,
            paidAmount: paidDecimal,
            remainingAmount: remainingDecimal,
            paymentType,
            status: "COMPLETED",
            notes: `Satış Fırsatı #${lead.leadNumber} üzerinden dönüştürüldü.`,
          },
        });

        // 6. SaleItem Oluştur
        await tx.saleItem.create({
          data: {
            saleId: sale.id,
            deviceId: targetDeviceId,
            purchasePriceSnapshot: purchasePriceDecimal,
            soldPrice: salePriceDecimal,
            profit: profitDecimal,
          },
        });

        // 7. Mevcut Kapora Payment Kaydını Bağla (MÜKERRER ÖDEME OLUŞTURULMAZ!)
        if (lead.depositPaymentId) {
          await tx.payment.update({
            where: { id: lead.depositPaymentId },
            data: { saleId: sale.id },
          });
        }

        // 8. Teslim anında ek ödeme alındıysa spot Payment ve CariTransaction oluştur
        if (spotAmountNum > 0) {
          const spotDecimal = new Prisma.Decimal(spotAmountNum);
          await tx.payment.create({
            data: {
              cariId: customerId,
              saleId: sale.id,
              type: "INCOMING",
              amount: spotDecimal,
              method: spotPaymentMethod || "CASH",
              description: `Satış Teslimatı Ek Ödemesi - Satış #${saleNumber}`,
              reference: saleNumber,
            },
          });

          await tx.cariTransaction.create({
            data: {
              cariId: customerId,
              type: "CREDIT",
              amount: spotDecimal,
              description: `Satış Teslimatı Ek Ödemesi - Satış #${saleNumber}`,
              referenceType: "COLLECTION",
              referenceId: sale.id,
            },
          });

          await tx.cari.update({
            where: { id: customerId },
            data: { currentBalance: { decrement: spotDecimal } },
          });
        }

        // 9. Satış Tutarı İçin CariTransaction (DEBIT - Müşteri Satış Tutarı Kadar Borçlandırılır)
        await tx.cariTransaction.create({
          data: {
            cariId: customerId,
            type: "DEBIT",
            amount: salePriceDecimal,
            description: `Cihaz Satışı - #${saleNumber} (${lead.brand} ${lead.modelName})`,
            referenceType: "SALE",
            referenceId: sale.id,
          },
        });

        // 10. Cari Bakiye Güncellemesi (Borçlandır: Borç artar)
        await tx.cari.update({
          where: { id: customerId },
          data: {
            currentBalance: { increment: salePriceDecimal },
          },
        });

        // 11. SalesLead durumunu SATISA_DONUSTU olarak güncelle
        const updatedLead = await tx.salesLead.update({
          where: { id },
          data: {
            status: "SATISA_DONUSTU",
            saleId: sale.id,
            deviceId: targetDeviceId,
            customerId,
          },
        });

        return { lead: updatedLead, sale };
      });

      return NextResponse.json({ success: true, data: result });
    }

    return NextResponse.json(
      { success: false, error: "Geçersiz işlem aksiyonu." },
      { status: 400 }
    );
  } catch (error: unknown) {
    console.error("Satış fırsatı güncelleme hatası:", error);
    const message = error instanceof Error ? error.message : "İşlem sırasında bir hata oluştu.";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
