import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { parsePositiveDecimal } from "@/lib/validations";

export const dynamic = "force-dynamic";

// Satışları Listeleme
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search")?.trim();
    const customerId = searchParams.get("customerId");
    const status = searchParams.get("status"); // COMPLETED, CANCELLED
    const paymentType = searchParams.get("paymentType"); // CASH, PARTIAL, INSTALLMENT
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");

    const where: Prisma.SaleWhereInput = {};

    if (customerId && customerId !== "ALL") {
      where.customerId = customerId;
    }

    if (status && status !== "ALL") {
      where.status = status as "COMPLETED" | "CANCELLED";
    }

    if (paymentType && paymentType !== "ALL") {
      where.paymentType = paymentType as "CASH" | "PARTIAL" | "INSTALLMENT";
    }

    if (startDate || endDate) {
      where.saleDate = {};
      if (startDate) where.saleDate.gte = new Date(startDate);
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        where.saleDate.lte = end;
      }
    }

    if (search) {
      where.OR = [
        { saleNumber: { contains: search, mode: "insensitive" } },
        { customer: { name: { contains: search, mode: "insensitive" } } },
        { customer: { phone: { contains: search, mode: "insensitive" } } },
        {
          items: {
            some: {
              device: {
                OR: [
                  { imei: { contains: search, mode: "insensitive" } },
                  { model: { brand: { contains: search, mode: "insensitive" } } },
                  { model: { modelName: { contains: search, mode: "insensitive" } } },
                ],
              },
            },
          },
        },
      ];
    }

    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const limit = Math.max(1, parseInt(searchParams.get("limit") || "20", 10));
    const skip = (page - 1) * limit;

    const [total, sales] = await Promise.all([
      prisma.sale.count({ where }),
      prisma.sale.findMany({
        where,
        skip,
        take: limit,
        select: {
          id: true,
          saleNumber: true,
          saleDate: true,
          totalAmount: true,
          totalProfit: true,
          paidAmount: true,
          remainingAmount: true,
          paymentType: true,
          status: true,
          notes: true,
          cancelledAt: true,
          cancelReason: true,
          customer: {
            select: {
              id: true,
              name: true,
              phone: true,
              currentBalance: true,
            },
          },
          items: {
            select: {
              id: true,
              deviceId: true,
              soldPrice: true,
              purchasePriceSnapshot: true,
              profit: true,
              device: {
                select: {
                  id: true,
                  imei: true,
                  ram: true,
                  storage: true,
                  color: true,
                  model: {
                    select: {
                      id: true,
                      brand: true,
                      modelName: true,
                    },
                  },
                },
              },
            },
          },
          installments: {
            select: {
              id: true,
              installmentNumber: true,
              amount: true,
              dueDate: true,
              paidAmount: true,
              status: true,
              paidDate: true,
            },
            orderBy: { installmentNumber: "asc" },
          },
          payments: {
            select: {
              id: true,
              amount: true,
              type: true,
              method: true,
              date: true,
              description: true,
            },
            orderBy: { date: "desc" },
          },
        },
        orderBy: { saleDate: "desc" },
      }),
    ]);

    const formatted = sales.map((s) => ({
      id: s.id,
      saleNumber: s.saleNumber,
      saleDate: s.saleDate,
      totalAmount: Number(s.totalAmount),
      totalProfit: Number(s.totalProfit),
      paidAmount: Number(s.paidAmount),
      remainingAmount: Number(s.remainingAmount),
      paymentType: s.paymentType,
      status: s.status,
      notes: s.notes,
      cancelledAt: s.cancelledAt,
      cancelReason: s.cancelReason,
      customer: {
        id: s.customer.id,
        name: s.customer.name,
        phone: s.customer.phone,
        currentBalance: Number(s.customer.currentBalance),
      },
      items: s.items.map((it) => ({
        id: it.id,
        deviceId: it.deviceId,
        soldPrice: Number(it.soldPrice),
        purchasePriceSnapshot: Number(it.purchasePriceSnapshot),
        profit: Number(it.profit),
        imei: it.device.imei,
        model: {
          id: it.device.model.id,
          brand: it.device.model.brand,
          modelName: it.device.model.modelName,
          ram: it.device.ram,
          storage: it.device.storage,
          color: it.device.color,
        },
      })),
      installments: s.installments.map((ins) => ({
        id: ins.id,
        installmentNumber: ins.installmentNumber,
        amount: Number(ins.amount),
        dueDate: ins.dueDate,
        paidAmount: Number(ins.paidAmount),
        status: ins.status,
        paidDate: ins.paidDate,
      })),
      payments: s.payments.map((p) => ({
        id: p.id,
        amount: Number(p.amount),
        type: p.type,
        method: p.method,
        date: p.date,
        description: p.description,
      })),
    }));

    return NextResponse.json({
      success: true,
      data: formatted,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error: unknown) {
    console.error("Sales GET hatası:", error);
    return NextResponse.json(
      { success: false, error: "Satış kayıtları yüklenirken hata oluştu." },
      { status: 500 }
    );
  }
}

// Yeni Satış Oluşturma (Tam Transaction & Concurrency Korumalı)
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      customerId,
      saleDate,
      paymentType = "CASH", // CASH, PARTIAL, INSTALLMENT
      paidAmount: inputPaidAmount,
      items, // Array of { deviceId: string, soldPrice?: number }
      installmentPlan, // { count: number, firstDueDate: string, periodDays?: number }
      notes,
    } = body;

    // 1. Temel Doğrulamalar
    if (!customerId) {
      return NextResponse.json(
        { success: false, error: "Lütfen satış yapılacak müşteriyi seçiniz." },
        { status: 400 }
      );
    }

    if (!Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { success: false, error: "Satış için en az bir cihaz seçilmelidir." },
        { status: 400 }
      );
    }

    if (!["CASH", "PARTIAL", "INSTALLMENT"].includes(paymentType)) {
      return NextResponse.json(
        { success: false, error: "Geçersiz ödeme türü." },
        { status: 400 }
      );
    }

    // Müşteri Kontrolü
    const customer = await prisma.cari.findUnique({
      where: { id: customerId },
    });

    if (!customer) {
      return NextResponse.json(
        { success: false, error: "Seçilen müşteri sistemde bulunamadı." },
        { status: 404 }
      );
    }

    if (!["CUSTOMER", "BOTH"].includes(customer.type)) {
      return NextResponse.json(
        { success: false, error: "Yalnızca Müşteri (CUSTOMER veya BOTH) tipindeki carilere satış yapılabilir." },
        { status: 400 }
      );
    }

    // Seçilen cihazların mükerrerlik kontrolü (Aynı satışta aynı cihaz iki kez seçilemez)
    const deviceIdSet = new Set<string>();
    for (const item of items) {
      if (!item.deviceId) {
        return NextResponse.json(
          { success: false, error: "Cihaz kimliği (deviceId) eksik." },
          { status: 400 }
        );
      }
      if (deviceIdSet.has(item.deviceId)) {
        return NextResponse.json(
          { success: false, error: "Aynı cihaz aynı satış işlemine birden fazla kez eklenemez." },
          { status: 400 }
        );
      }
      deviceIdSet.add(item.deviceId);
    }

    const deviceIds = Array.from(deviceIdSet);

    // 2. Transaction ve Concurrency Koruması (İki farklı tarayıcıdan aynı cihazın satılmasını engelleme)
    const sDate = saleDate ? new Date(saleDate) : new Date();

    const result = await prisma.$transaction(async (tx) => {
      // Cihazları veritabanından kilitleyerek ve status kontrolü yaparak çek
      const devices = await tx.device.findMany({
        where: {
          id: { in: deviceIds },
        },
        include: {
          model: true,
        },
      });

      if (devices.length !== deviceIds.length) {
        throw new Error("Seçilen cihazlardan bazıları sistemde bulunamadı.");
      }

      // Concurrency doğrulaması: Cihazların TAMAMI şu anda IN_STOCK olmak ZORUNDADIR!
      const notInStock = devices.filter((d) => d.status !== "IN_STOCK");
      if (notInStock.length > 0) {
        const busyImeis = notInStock
          .map((d) => (d.imei ? `IMEI: ${d.imei}` : `${d.model.brand} ${d.model.modelName} (ID: ${d.id.slice(0, 8)})`))
          .join(", ");
        const error = new Error(`Şu cihaz(lar) artık stokta değil veya başka bir işlemde satılmış: ${busyImeis}`);
        error.name = "DeviceNotInStockError";
        throw error;
      }

      // Kalem tutarlarını ve kârı hesapla
      let totalAmount = 0;
      let totalCost = 0;
      const cleanItems = [];

      for (const item of items) {
        const dev = devices.find((d) => d.id === item.deviceId)!;
        const soldPrice =
          item.soldPrice !== undefined
            ? parsePositiveDecimal(item.soldPrice)
            : Number(dev.salePrice);

        if (soldPrice === null || soldPrice < 0) {
          const identifier = dev.imei ? `IMEI: ${dev.imei}` : `${dev.model.brand} ${dev.model.modelName}`;
          throw new Error(`Cihaz (${identifier}) için geçerli bir satış fiyatı giriniz.`);
        }

        const cost = Number(dev.purchasePrice);
        const profit = soldPrice - cost;

        totalAmount += soldPrice;
        totalCost += cost;

        cleanItems.push({
          deviceId: dev.id,
          soldPrice,
          purchasePriceSnapshot: cost,
          profit,
          modelName: `${dev.model.brand} ${dev.model.modelName}`,
          imei: dev.imei,
        });
      }

      const totalProfit = totalAmount - totalCost;

      // Ödeme hesaplamaları
      let paidAmount = 0;
      let remainingAmount = 0;

      if (paymentType === "CASH") {
        paidAmount = totalAmount;
        remainingAmount = 0;
      } else if (paymentType === "PARTIAL") {
        const parsedPaid = parsePositiveDecimal(inputPaidAmount);
        if (parsedPaid === null || parsedPaid < 0) {
          throw new Error("Kısmi satış için geçerli bir ödenen tutar giriniz.");
        }
        if (parsedPaid > totalAmount) {
          throw new Error("Ödenen tutar toplam satış tutarından büyük olamaz.");
        }
        paidAmount = parsedPaid;
        remainingAmount = Math.round((totalAmount - paidAmount) * 100) / 100;
      } else if (paymentType === "INSTALLMENT") {
        const parsedPaid = inputPaidAmount !== undefined ? parsePositiveDecimal(inputPaidAmount) : 0;
        if (parsedPaid === null || parsedPaid < 0) {
          throw new Error("Geçerli bir peşinat tutarı giriniz.");
        }
        if (parsedPaid > totalAmount) {
          throw new Error("Peşinat tutarı toplam satış tutarından büyük olamaz.");
        }
        paidAmount = parsedPaid;
        remainingAmount = Math.round((totalAmount - paidAmount) * 100) / 100;

        if (remainingAmount > 0) {
          const count = Number(installmentPlan?.count);
          if (!count || count < 1 || count > 36) {
            throw new Error("Taksit sayısı 1 ile 36 arasında olmalıdır.");
          }
        }
      }

      // Benzersiz Satış Numarası Üret (Örn: SAT-20260921-0001)
      const dateStr = sDate.toISOString().slice(0, 10).replace(/-/g, "");
      const countToday = await tx.sale.count({
        where: {
          saleDate: {
            gte: new Date(new Date(sDate).setHours(0, 0, 0, 0)),
            lte: new Date(new Date(sDate).setHours(23, 59, 59, 999)),
          },
        },
      });
      const saleNumber = `SAT-${dateStr}-${String(countToday + 1).padStart(4, "0")}`;

      // A) Sale Kaydını Oluştur
      const createdSale = await tx.sale.create({
        data: {
          saleNumber,
          customerId,
          saleDate: sDate,
          totalAmount,
          totalProfit,
          paidAmount,
          remainingAmount,
          paymentType,
          status: "COMPLETED",
          notes: notes?.trim() || null,
        },
      });

      // B) SaleItem Kayıtlarını Oluştur & Device Durumlarını SOLD Yap
      for (const it of cleanItems) {
        await tx.saleItem.create({
          data: {
            saleId: createdSale.id,
            deviceId: it.deviceId,
            soldPrice: it.soldPrice,
            purchasePriceSnapshot: it.purchasePriceSnapshot,
            profit: it.profit,
          },
        });

        // Cihazı SOLD yap
        await tx.device.update({
          where: { id: it.deviceId },
          data: {
            status: "SOLD",
          },
        });
      }

      // C) Peşin / Peşinat Ödemesi Varsa Payment Kaydı Oluştur
      if (paidAmount > 0) {
        await tx.payment.create({
          data: {
            cariId: customerId,
            saleId: createdSale.id,
            type: "INCOMING",
            amount: paidAmount,
            method: "CASH",
            date: sDate,
            description:
              paymentType === "CASH"
                ? `Satış Tahsilatı (${saleNumber})`
                : `Satış Peşinatı (${saleNumber})`,
            reference: saleNumber,
          },
        });
      }

      // D) Cari Hareketleri & Bakiye Güncellemesi (Muhasebe Standardı: Bakiye = Borç - Alacak)
      // Satış toplamı müşteriye BORÇ (DEBIT) yazılır
      await tx.cariTransaction.create({
        data: {
          cariId: customerId,
          type: "DEBIT",
          amount: totalAmount,
          description: `Cihaz Satışı (${saleNumber} - ${cleanItems.length} adet)`,
          date: sDate,
          referenceType: "SALE",
          referenceId: createdSale.id,
        },
      });

      // Ödenen kısım müşteriye ALACAK (CREDIT) yazılır (borcunu azaltır)
      if (paidAmount > 0) {
        await tx.cariTransaction.create({
          data: {
            cariId: customerId,
            type: "CREDIT",
            amount: paidAmount,
            description:
              paymentType === "CASH"
                ? `Satış Bedeli Tahsilatı (${saleNumber})`
                : `Satış Peşinatı Tahsilatı (${saleNumber})`,
            date: sDate,
            referenceType: "COLLECTION",
            referenceId: createdSale.id,
          },
        });
      }

      // Müşteri cari bakiyesine net kalan borç yansıtılır (Bizim Alacağımız artar)
      if (remainingAmount > 0) {
        await tx.cari.update({
          where: { id: customerId },
          data: {
            currentBalance: {
              increment: remainingAmount,
            },
          },
        });
      }

      // E) Taksitli Satış İse Taksit Planını Oluştur (Kuruş Farkı Son Taksite Dengelenir)
      if (paymentType === "INSTALLMENT" && remainingAmount > 0) {
        const count = Number(installmentPlan?.count) || 1;
        const firstDueDateStr = installmentPlan?.firstDueDate;
        const baseDueDate = firstDueDateStr ? new Date(firstDueDateStr) : new Date(sDate.getTime() + 30 * 86400000);
        const periodDays = Number(installmentPlan?.periodDays) || 30;

        const baseInstallmentAmount = Math.floor((remainingAmount / count) * 100) / 100;
        const lastInstallmentAmount = Math.round((remainingAmount - baseInstallmentAmount * (count - 1)) * 100) / 100;

        for (let i = 1; i <= count; i++) {
          const installmentDueDate = new Date(baseDueDate.getTime() + (i - 1) * periodDays * 86400000);
          const insAmount = i === count ? lastInstallmentAmount : baseInstallmentAmount;

          await tx.installment.create({
            data: {
              saleId: createdSale.id,
              installmentNumber: i,
              amount: insAmount,
              dueDate: installmentDueDate,
              paidAmount: 0,
              status: "PENDING",
            },
          });
        }
      }

      return createdSale;
    });

    return NextResponse.json({
      success: true,
      message: "Satış işlemi başarıyla tamamlandı.",
      data: result,
    });
  } catch (error: unknown) {
    console.error("Satış oluşturma hatası:", error);
    const err = error as Error;
    if (err.name === "DeviceNotInStockError") {
      return NextResponse.json(
        { success: false, error: err.message },
        { status: 409 }
      );
    }
    return NextResponse.json(
      { success: false, error: err.message || "Satış kaydedilirken hata oluştu ve tüm işlem geri alındı." },
      { status: 400 }
    );
  }
}
