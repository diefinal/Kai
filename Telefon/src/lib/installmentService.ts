import { Prisma, PrismaClient } from "@prisma/client";
import { formatCurrency } from "./utils";

export interface InstallmentData {
  id: string;
  installmentNumber: number;
  amount: number | Prisma.Decimal;
  paidAmount: number | Prisma.Decimal;
  status: string;
  dueDate: Date | string;
  paidDate?: Date | string | null;
}

export interface InstallmentAllocation {
  installmentId: string;
  installmentNumber: number;
  previousPaidAmount: number;
  allocatedAmount: number;
  newPaidAmount: number;
  targetAmount: number;
  remainingAmount: number;
  status: "PENDING" | "PARTIALLY_PAID" | "PAID";
  isFullyPaid: boolean;
}

export interface DistributionPlan {
  totalSaleRemaining: number;
  totalCollected: number;
  allocations: InstallmentAllocation[];
  affectedInstallments: InstallmentAllocation[];
}

/**
 * Tutarları kuruş (cent) tamsayısına dönüştürür.
 * JavaScript floating-point hatalarını tamamen engeller.
 */
export function toCents(val: number | Prisma.Decimal | string): number {
  const num = typeof val === "number" ? val : Number(val.toString());
  return Math.round(num * 100);
}

/**
 * Kuruş (cent) tamsayısını 2 ondalıklı TL değerine dönüştürür.
 */
export function fromCents(cents: number): number {
  return Math.round(cents) / 100;
}

/**
 * Taksit tahsilat tutarını kuruş hassasiyetiyle açık taksitlere dağıtır.
 * Pure function: Veritabanı bağımlılığı olmadan %100 test edilebilir.
 */
export function calculateInstallmentDistribution(params: {
  installments: InstallmentData[];
  paymentAmount: number;
  startInstallmentId?: string | null;
}): DistributionPlan {
  const { installments, paymentAmount, startInstallmentId } = params;

  const paymentCents = toCents(paymentAmount);
  if (paymentCents <= 0) {
    throw new Error("Tahsilat tutarı 0'dan büyük olmalıdır.");
  }

  // 1. Henüz tam ödenmemiş açık taksitleri belirle
  const openInstallments = installments
    .filter((ins) => {
      const targetCents = toCents(ins.amount);
      const paidCents = toCents(ins.paidAmount);
      return targetCents > paidCents && ins.status !== "PAID";
    })
    .sort((a, b) => {
      const dateA = new Date(a.dueDate).getTime();
      const dateB = new Date(b.dueDate).getTime();
      if (dateA !== dateB) return dateA - dateB;
      return a.installmentNumber - b.installmentNumber;
    });

  if (openInstallments.length === 0) {
    throw new Error("Bu satışa ait ödenecek açık taksit bulunmamaktadır.");
  }

  // 2. Satışın toplam kalan taksit borcunu kuruş cinsinden hesapla
  const totalSaleRemainingCents = openInstallments.reduce((sum, ins) => {
    const targetCents = toCents(ins.amount);
    const paidCents = toCents(ins.paidAmount);
    return sum + (targetCents - paidCents);
  }, 0);

  // 3. Üst sınır kontrolü: Girilen tutar toplam kalan borçtan fazla olamaz
  if (paymentCents > totalSaleRemainingCents) {
    const formattedMax = formatCurrency(fromCents(totalSaleRemainingCents));
    throw new Error(
      `Tahsilat tutarı satışın toplam kalan borcundan (${formattedMax}) fazla olamaz.`
    );
  }

  // 4. Dağıtım sırasını belirle:
  // Seçilen taksit öncelikli, ardından sonraki açık taksitler, ardından varsa önceki açık taksitler
  let orderedInstallments: InstallmentData[] = [...openInstallments];
  if (startInstallmentId) {
    const selectedIdx = openInstallments.findIndex((ins) => ins.id === startInstallmentId);
    if (selectedIdx !== -1) {
      const selected = openInstallments[selectedIdx];
      const subsequent = openInstallments.filter(
        (ins) =>
          ins.id !== selected.id &&
          (new Date(ins.dueDate) > new Date(selected.dueDate) ||
            (new Date(ins.dueDate).getTime() === new Date(selected.dueDate).getTime() &&
              ins.installmentNumber > selected.installmentNumber))
      );
      const prior = openInstallments.filter(
        (ins) =>
          ins.id !== selected.id &&
          !subsequent.some((s) => s.id === ins.id)
      );
      orderedInstallments = [selected, ...subsequent, ...prior];
    }
  }

  // 5. Kuruş kuruş tahsilat dağıtımı
  let unallocatedCents = paymentCents;
  const allocations: InstallmentAllocation[] = [];

  for (const ins of orderedInstallments) {
    const targetCents = toCents(ins.amount);
    const currentPaidCents = toCents(ins.paidAmount);
    const remainingCents = Math.max(0, targetCents - currentPaidCents);

    if (remainingCents <= 0) continue;

    const allocatedCents = Math.min(unallocatedCents, remainingCents);
    const newPaidCents = currentPaidCents + allocatedCents;
    const newRemainingCents = targetCents - newPaidCents;
    const isFullyPaid = newPaidCents >= targetCents;

    const newStatus: "PENDING" | "PARTIALLY_PAID" | "PAID" = isFullyPaid
      ? "PAID"
      : newPaidCents > 0
      ? "PARTIALLY_PAID"
      : "PENDING";

    unallocatedCents -= allocatedCents;

    allocations.push({
      installmentId: ins.id,
      installmentNumber: ins.installmentNumber,
      previousPaidAmount: fromCents(currentPaidCents),
      allocatedAmount: fromCents(allocatedCents),
      newPaidAmount: fromCents(newPaidCents),
      targetAmount: fromCents(targetCents),
      remainingAmount: fromCents(newRemainingCents),
      status: newStatus,
      isFullyPaid,
    });

    if (unallocatedCents <= 0) break;
  }

  const affectedInstallments = allocations.filter((a) => a.allocatedAmount > 0);

  return {
    totalSaleRemaining: fromCents(totalSaleRemainingCents),
    totalCollected: fromCents(paymentCents),
    allocations,
    affectedInstallments,
  };
}

export type PrismaTransactionClient = Omit<
  PrismaClient,
  "$connect" | "$disconnect" | "$on" | "$transaction" | "$use" | "$extends"
>;

/**
 * Tek bir database transaction içerisinde taksit tahsilatını ve cari hareketini uygular.
 */
export async function executeInstallmentCollectionTransaction(
  tx: PrismaTransactionClient,
  params: {
    cariId: string;
    saleId: string;
    startInstallmentId?: string | null;
    amount: number;
    method?: "CASH" | "BANK_TRANSFER" | "CREDIT_CARD";
    date?: Date;
    description?: string | null;
  }
) {
  const {
    cariId,
    saleId,
    startInstallmentId,
    amount,
    method = "CASH",
    date = new Date(),
    description,
  } = params;

  // 1. Satışı ve taksitlerini çek
  const sale = await tx.sale.findUnique({
    where: { id: saleId },
    include: {
      installments: {
        orderBy: [{ dueDate: "asc" }, { installmentNumber: "asc" }],
      },
    },
  });

  if (!sale) {
    throw new Error("İlgili satış kaydı bulunamadı.");
  }

  if (sale.status === "CANCELLED") {
    throw new Error("İptal edilmiş bir satışa ait taksit tahsilatı yapılamaz.");
  }

  // 2. Kuruş hassasiyetiyle dağıtımı hesapla
  const plan = calculateInstallmentDistribution({
    installments: sale.installments,
    paymentAmount: amount,
    startInstallmentId,
  });

  // 3. Tek bir Payment kaydı oluştur
  const payment = await tx.payment.create({
    data: {
      cariId,
      saleId,
      installmentId: startInstallmentId || (plan.affectedInstallments[0]?.installmentId ?? null),
      type: "INCOMING",
      amount,
      method,
      date,
      description:
        description?.trim() ||
        `${sale.saleNumber} Taksit Tahsilatı (${plan.affectedInstallments.length} taksite uygulandı)`,
    },
  });

  // 4. Etkilenen taksitleri güncelle
  for (const alloc of plan.affectedInstallments) {
    await tx.installment.update({
      where: { id: alloc.installmentId },
      data: {
        paidAmount: alloc.newPaidAmount,
        status: alloc.status,
        paidDate: alloc.isFullyPaid ? date : undefined,
      },
    });
  }

  // 5. Satış toplam ödenen ve kalan tutarını kuruş hassasiyetiyle güncelle
  const saleRemainingCents = Math.max(0, toCents(sale.remainingAmount) - toCents(amount));
  await tx.sale.update({
    where: { id: saleId },
    data: {
      paidAmount: {
        increment: amount,
      },
      remainingAmount: fromCents(saleRemainingCents),
    },
  });

  // 6. Müşteri cari bakiyesini toplam tahsil edilen tutar kadar bir kez azalt (alacağımız azalır)
  await tx.cari.update({
    where: { id: cariId },
    data: {
      currentBalance: {
        decrement: amount,
      },
    },
  });

  // 7. Cari hareketini toplam tahsilat kadar bir kez oluştur (CREDIT)
  await tx.cariTransaction.create({
    data: {
      cariId,
      type: "CREDIT",
      amount,
      description:
        description?.trim() ||
        `${sale.saleNumber} Taksit Tahsilatı`,
      date,
      referenceType: "COLLECTION",
      referenceId: payment.id,
    },
  });

  return {
    payment,
    plan,
  };
}
