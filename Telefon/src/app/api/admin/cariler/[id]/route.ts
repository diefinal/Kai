import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCariBalanceStatus } from "@/lib/accounting";

export const dynamic = "force-dynamic";

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    const cari = await prisma.cari.findUnique({
      where: { id },
      include: {
        transactions: {
          orderBy: { date: "asc" },
        },
        sales: {
          orderBy: { saleDate: "desc" },
          take: 10,
        },
        suppliedDevices: {
          orderBy: { purchaseDate: "desc" },
          take: 10,
          include: {
            model: true,
          },
        },
      },
    });

    if (!cari) {
      return NextResponse.json(
        { success: false, error: "Cari bulunamadı." },
        { status: 404 }
      );
    }

    const currentBalance = Number(cari.currentBalance);
    const balanceStatus = getCariBalanceStatus(currentBalance);

    // Kümülatif ekstre hesaplama (Kronolojik sırada Bakiye = Borç - Alacak)
    let runningBalance = 0;
    const ekstre = cari.transactions.map((t) => {
      const amount = Number(t.amount);
      const isDebit = t.type === "DEBIT";
      if (isDebit) {
        runningBalance += amount;
      } else {
        runningBalance -= amount;
      }

      return {
        id: t.id,
        date: t.date,
        type: t.type, // DEBIT veya CREDIT
        amount,
        description: t.description,
        referenceType: t.referenceType,
        referenceId: t.referenceId,
        debitAmount: isDebit ? amount : null,
        creditAmount: !isDebit ? amount : null,
        runningBalance: Math.round(runningBalance * 100) / 100,
      };
    });

    // En yeni işlemler en üstte görünsün diye ters çevirelim
    ekstre.reverse();

    return NextResponse.json({
      success: true,
      data: {
        id: cari.id,
        name: cari.name,
        phone: cari.phone,
        email: cari.email,
        address: cari.address,
        type: cari.type,
        notes: cari.notes,
        currentBalance,
        balanceStatus,
        createdAt: cari.createdAt,
        ekstre,
      },
    });
  } catch (error: unknown) {
    console.error("Cari detay GET hatası:", error);
    return NextResponse.json(
      { success: false, error: "Cari detayları yüklenemedi." },
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

    const name = body.name?.trim();
    if (!name) {
      return NextResponse.json(
        { success: false, error: "Cari adı zorunludur." },
        { status: 400 }
      );
    }

    const phone = body.phone !== undefined ? (body.phone?.trim() || null) : undefined;
    const email = body.email !== undefined ? (body.email?.trim() || null) : undefined;
    const address = body.address !== undefined ? (body.address?.trim() || null) : undefined;
    const notes = body.notes !== undefined ? (body.notes?.trim() || null) : undefined;
    const type = body.type;

    const validTypes = ["CUSTOMER", "SUPPLIER", "BOTH"];
    if (type && !validTypes.includes(type)) {
      return NextResponse.json(
        { success: false, error: "Geçersiz cari tipi." },
        { status: 400 }
      );
    }

    const updated = await prisma.cari.update({
      where: { id },
      data: {
        name,
        ...(phone !== undefined && { phone }),
        ...(email !== undefined && { email }),
        ...(address !== undefined && { address }),
        ...(notes !== undefined && { notes }),
        ...(type && { type }),
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        ...updated,
        currentBalance: Number(updated.currentBalance),
      },
    });
  } catch (error: unknown) {
    console.error("Cari güncelleme hatası:", error);
    return NextResponse.json(
      { success: false, error: "Cari güncellenirken bir hata oluştu." },
      { status: 500 }
    );
  }
}
