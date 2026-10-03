import test, { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  toCents,
  fromCents,
  calculateInstallmentDistribution,
  executeInstallmentCollectionTransaction,
  InstallmentData,
  PrismaTransactionClient,
} from "../src/lib/installmentService";

describe("Taksit Tahsilat ve Dağıtım Motoru Testleri", () => {
  // 1. Senaryo: Tek taksit tam ödeme
  it("1. Tek taksit tam ödeme: Taksit tutarı kadar ödeme yapıldığında taksit PAID olmalı", () => {
    const installments: InstallmentData[] = [
      {
        id: "ins-1",
        installmentNumber: 1,
        amount: 5833.33,
        paidAmount: 0,
        status: "PENDING",
        dueDate: new Date("2026-10-01"),
      },
    ];

    const plan = calculateInstallmentDistribution({
      installments,
      paymentAmount: 5833.33,
      startInstallmentId: "ins-1",
    });

    assert.equal(plan.totalCollected, 5833.33);
    assert.equal(plan.allocations.length, 1);
    const alloc = plan.allocations[0];
    assert.equal(alloc.installmentId, "ins-1");
    assert.equal(alloc.allocatedAmount, 5833.33);
    assert.equal(alloc.newPaidAmount, 5833.33);
    assert.equal(alloc.remainingAmount, 0);
    assert.equal(alloc.status, "PAID");
    assert.equal(alloc.isFullyPaid, true);
  });

  // 2. Senaryo: Tek taksit kısmi ödeme (taksit tutarından az)
  it("2. Tek taksit kısmi ödeme: Taksit tutarından az ödeme yapıldığında PARTIALLY_PAID olmalı ve kuruş hatası oluşmamalı", () => {
    const installments: InstallmentData[] = [
      {
        id: "ins-1",
        installmentNumber: 1,
        amount: 5833.33,
        paidAmount: 0,
        status: "PENDING",
        dueDate: new Date("2026-10-01"),
      },
    ];

    const plan = calculateInstallmentDistribution({
      installments,
      paymentAmount: 3000.0,
      startInstallmentId: "ins-1",
    });

    assert.equal(plan.totalCollected, 3000.0);
    assert.equal(plan.allocations.length, 1);
    const alloc = plan.allocations[0];
    assert.equal(alloc.allocatedAmount, 3000.0);
    assert.equal(alloc.newPaidAmount, 3000.0);
    assert.equal(alloc.remainingAmount, 2833.33);
    assert.equal(alloc.status, "PARTIALLY_PAID");
    assert.equal(alloc.isFullyPaid, false);
  });

  // 3. Senaryo: Seçilen taksidi aşan ve bir sonraki taksite taşan ödeme (örnekteki 10.000 TL senaryosu)
  it("3. Seçilen taksidi aşan ve sonraki taksite taşan 10.000 TL ödeme: 1. taksit PAID (5.833,33 TL), 2. taksit PARTIALLY_PAID (4.166,67 TL, kalan 1.666,66 TL)", () => {
    const installments: InstallmentData[] = [
      {
        id: "ins-1",
        installmentNumber: 1,
        amount: 5833.33,
        paidAmount: 0,
        status: "PENDING",
        dueDate: new Date("2026-10-01"),
      },
      {
        id: "ins-2",
        installmentNumber: 2,
        amount: 5833.33,
        paidAmount: 0,
        status: "PENDING",
        dueDate: new Date("2026-11-01"),
      },
    ];

    const plan = calculateInstallmentDistribution({
      installments,
      paymentAmount: 10000.0,
      startInstallmentId: "ins-1",
    });

    assert.equal(plan.totalCollected, 10000.0);
    assert.equal(plan.totalSaleRemaining, 11666.66);
    assert.equal(plan.allocations.length, 2);

    // 1. Taksit
    const alloc1 = plan.allocations[0];
    assert.equal(alloc1.installmentId, "ins-1");
    assert.equal(alloc1.allocatedAmount, 5833.33);
    assert.equal(alloc1.newPaidAmount, 5833.33);
    assert.equal(alloc1.remainingAmount, 0);
    assert.equal(alloc1.status, "PAID");
    assert.equal(alloc1.isFullyPaid, true);

    // 2. Taksit
    const alloc2 = plan.allocations[1];
    assert.equal(alloc2.installmentId, "ins-2");
    assert.equal(alloc2.allocatedAmount, 4166.67);
    assert.equal(alloc2.newPaidAmount, 4166.67);
    assert.equal(alloc2.remainingAmount, 1666.66);
    assert.equal(alloc2.status, "PARTIALLY_PAID");
    assert.equal(alloc2.isFullyPaid, false);

    // Kuruş sağlama toplamı
    assert.equal(toCents(alloc1.allocatedAmount) + toCents(alloc2.allocatedAmount), 1000000);
  });

  // 4. Senaryo: Birden fazla sonraki takside yayılan büyük ödeme
  it("4. Birden fazla sonraki takside yayılan ödeme: 13.500 TL 4 takside sırayla dağıtılmalı", () => {
    const installments: InstallmentData[] = [
      {
        id: "ins-1",
        installmentNumber: 1,
        amount: 5000,
        paidAmount: 0,
        status: "PENDING",
        dueDate: new Date("2026-10-01"),
      },
      {
        id: "ins-2",
        installmentNumber: 2,
        amount: 5000,
        paidAmount: 0,
        status: "PENDING",
        dueDate: new Date("2026-11-01"),
      },
      {
        id: "ins-3",
        installmentNumber: 3,
        amount: 5000,
        paidAmount: 0,
        status: "PENDING",
        dueDate: new Date("2026-12-01"),
      },
      {
        id: "ins-4",
        installmentNumber: 4,
        amount: 5000,
        paidAmount: 0,
        status: "PENDING",
        dueDate: new Date("2027-01-01"),
      },
    ];

    const plan = calculateInstallmentDistribution({
      installments,
      paymentAmount: 13500,
      startInstallmentId: "ins-1",
    });

    assert.equal(plan.totalCollected, 13500);
    assert.equal(plan.allocations.length, 3);

    assert.equal(plan.allocations[0].allocatedAmount, 5000);
    assert.equal(plan.allocations[0].status, "PAID");

    assert.equal(plan.allocations[1].allocatedAmount, 5000);
    assert.equal(plan.allocations[1].status, "PAID");

    assert.equal(plan.allocations[2].allocatedAmount, 3500);
    assert.equal(plan.allocations[2].status, "PARTIALLY_PAID");
    assert.equal(plan.allocations[2].remainingAmount, 1500);
  });

  // 5. Senaryo: Satışın tüm açık taksitlerini tek seferde kapatan tam erken kapama
  it("5. Tam erken kapama: Kalan tüm taksit borcu (17.500 TL) tek seferde ödendiğinde tüm taksitler PAID olmalı", () => {
    const installments: InstallmentData[] = [
      {
        id: "ins-1",
        installmentNumber: 1,
        amount: 5833.33,
        paidAmount: 0,
        status: "PENDING",
        dueDate: new Date("2026-10-01"),
      },
      {
        id: "ins-2",
        installmentNumber: 2,
        amount: 5833.33,
        paidAmount: 0,
        status: "PENDING",
        dueDate: new Date("2026-11-01"),
      },
      {
        id: "ins-3",
        installmentNumber: 3,
        amount: 5833.34,
        paidAmount: 0,
        status: "PENDING",
        dueDate: new Date("2026-12-01"),
      },
    ];

    const plan = calculateInstallmentDistribution({
      installments,
      paymentAmount: 17500.0,
      startInstallmentId: "ins-1",
    });

    assert.equal(plan.totalCollected, 17500.0);
    assert.equal(plan.allocations.length, 3);
    assert.ok(plan.allocations.every((a) => a.status === "PAID" && a.remainingAmount === 0));
  });

  // 6. Senaryo: Satışın toplam açık taksit borcundan fazla tutar girildiğinde işlemin reddedilmesi
  it("6. Satışın toplam kalan borcundan fazla tutar girildiğinde hata fırlatılmalı", () => {
    const installments: InstallmentData[] = [
      {
        id: "ins-1",
        installmentNumber: 1,
        amount: 5833.33,
        paidAmount: 0,
        status: "PENDING",
        dueDate: new Date("2026-10-01"),
      },
      {
        id: "ins-2",
        installmentNumber: 2,
        amount: 5833.33,
        paidAmount: 0,
        status: "PENDING",
        dueDate: new Date("2026-11-01"),
      },
    ];

    assert.throws(
      () => {
        calculateInstallmentDistribution({
          installments,
          paymentAmount: 12000.0, // Toplam 11.666,66 TL iken 12.000 TL
          startInstallmentId: "ins-1",
        });
      },
      (err: any) => {
        return (
          err instanceof Error &&
          err.message.includes("Tahsilat tutarı satışın toplam kalan borcundan")
        );
      }
    );
  });

  // 7 & 8. Senaryolar: Veritabanı Transaction bütünlüğü (Tek Payment, Tek CariTransaction, Tek Cari Bakiye Düşüşü)
  it("7 & 8. Veritabanı Transaction: 10.000 TL tahsilatta tam olarak TEK Payment, TEK CariTransaction ve TEK cari bakiye düşüşü yapılmalı", async () => {
    // Mock Transaction Client
    const createdPayments: any[] = [];
    const createdCariTransactions: any[] = [];
    const updatedInstallments: any[] = [];
    const updatedCaris: any[] = [];
    const updatedSales: any[] = [];

    const mockSale = {
      id: "sale-100",
      saleNumber: "SAT-100",
      status: "COMPLETED",
      totalAmount: 11666.66,
      paidAmount: 0,
      remainingAmount: 11666.66,
      installments: [
        {
          id: "ins-1",
          installmentNumber: 1,
          amount: 5833.33,
          paidAmount: 0,
          status: "PENDING",
          dueDate: new Date("2026-10-01"),
        },
        {
          id: "ins-2",
          installmentNumber: 2,
          amount: 5833.33,
          paidAmount: 0,
          status: "PENDING",
          dueDate: new Date("2026-11-01"),
        },
      ],
    };

    const mockTx = {
      sale: {
        findUnique: async () => mockSale,
        update: async (args: any) => {
          updatedSales.push(args);
          return { ...mockSale, ...args.data };
        },
      },
      payment: {
        create: async (args: any) => {
          const record = { id: "pay-1", ...args.data };
          createdPayments.push(record);
          return record;
        },
      },
      installment: {
        update: async (args: any) => {
          updatedInstallments.push(args);
          return args;
        },
      },
      cari: {
        update: async (args: any) => {
          updatedCaris.push(args);
          return args;
        },
      },
      cariTransaction: {
        create: async (args: any) => {
          const record = { id: "ctx-1", ...args.data };
          createdCariTransactions.push(record);
          return record;
        },
      },
    } as unknown as PrismaTransactionClient;

    const result = await executeInstallmentCollectionTransaction(mockTx, {
      cariId: "cari-1",
      saleId: "sale-100",
      startInstallmentId: "ins-1",
      amount: 10000.0,
      method: "CASH",
    });

    // 1. Tek bir Payment kaydı oluşmalı ve tutarı 10.000 TL olmalı
    assert.equal(createdPayments.length, 1, "Tam olarak 1 Payment kaydı oluşmalı");
    assert.equal(createdPayments[0].amount, 10000.0);
    assert.equal(createdPayments[0].type, "INCOMING");
    assert.equal(createdPayments[0].saleId, "sale-100");

    // 2. Tek bir CariTransaction kaydı oluşmalı ve tutarı 10.000 TL CREDIT olmalı
    assert.equal(createdCariTransactions.length, 1, "Tam olarak 1 CariTransaction kaydı oluşmalı");
    assert.equal(createdCariTransactions[0].amount, 10000.0);
    assert.equal(createdCariTransactions[0].type, "CREDIT");
    assert.equal(createdCariTransactions[0].referenceType, "COLLECTION");
    assert.equal(createdCariTransactions[0].referenceId, "pay-1");

    // 3. Müşteri cari bakiyesinden sadece tek seferde tam olarak 10.000 TL düşülmeli
    assert.equal(updatedCaris.length, 1, "Müşteri bakiyesi tek bir update ile güncellenmeli");
    assert.deepEqual(updatedCaris[0].data.currentBalance, { decrement: 10000.0 });

    // 4. İki taksit güncellenmiş olmalı
    assert.equal(updatedInstallments.length, 2);
    assert.equal(updatedInstallments[0].where.id, "ins-1");
    assert.equal(updatedInstallments[0].data.paidAmount, 5833.33);
    assert.equal(updatedInstallments[0].data.status, "PAID");

    assert.equal(updatedInstallments[1].where.id, "ins-2");
    assert.equal(updatedInstallments[1].data.paidAmount, 4166.67);
    assert.equal(updatedInstallments[1].data.status, "PARTIALLY_PAID");

    // 5. Satış toplamı güncellenmiş olmalı (kalan 1.666,66 TL)
    assert.equal(updatedSales.length, 1);
    assert.equal(updatedSales[0].data.remainingAmount, 1666.66);
  });

  // 9. Senaryo: Hata durumunda rollback davranışı
  it("9. Hata durumunda rollback: Ara bir adımda hata oluştuğunda exception fırlatılmalı ve transaction iptal edilmeli", async () => {
    let transactionCommitted = false;
    let transactionRolledBack = false;

    const mockSale = {
      id: "sale-error",
      saleNumber: "SAT-ERR",
      status: "COMPLETED",
      totalAmount: 5000,
      paidAmount: 0,
      remainingAmount: 5000,
      installments: [
        {
          id: "ins-err-1",
          installmentNumber: 1,
          amount: 5000,
          paidAmount: 0,
          status: "PENDING",
          dueDate: new Date("2026-10-01"),
        },
      ],
    };

    // Cari update sırasında veritabanı hatası simüle et
    const failingTx = {
      sale: {
        findUnique: async () => mockSale,
        update: async () => ({}),
      },
      payment: {
        create: async () => ({ id: "pay-err" }),
      },
      installment: {
        update: async () => ({}),
      },
      cari: {
        update: async () => {
          throw new Error("DB Connection Lost / Constraint Violation");
        },
      },
      cariTransaction: {
        create: async () => ({}),
      },
    } as unknown as PrismaTransactionClient;

    // Simüle edilmiş $transaction sarmalayıcısı
    const runInTransaction = async (callback: (tx: PrismaTransactionClient) => Promise<any>) => {
      try {
        const res = await callback(failingTx);
        transactionCommitted = true;
        return res;
      } catch (err) {
        transactionRolledBack = true;
        throw err;
      }
    };

    await assert.rejects(
      async () => {
        await runInTransaction(async (tx) => {
          return await executeInstallmentCollectionTransaction(tx, {
            cariId: "cari-err",
            saleId: "sale-error",
            amount: 5000,
          });
        });
      },
      /DB Connection Lost \/ Constraint Violation/
    );

    assert.equal(transactionCommitted, false, "İşlem commit EDİLMEMELİ");
    assert.equal(transactionRolledBack, true, "Hata durumunda transaction ROLLBACK olmalı");
  });
});
