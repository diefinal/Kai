import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type"); // SUPPLIER, BOTH, CUSTOMER
    const search = searchParams.get("search")?.trim();

    const where: Prisma.CariWhereInput = {};

    if (type === "SUPPLIER") {
      where.type = { in: ["SUPPLIER", "BOTH"] };
    } else if (type === "CUSTOMER") {
      where.type = { in: ["CUSTOMER", "BOTH"] };
    } else if (type === "BOTH") {
      where.type = "BOTH";
    }

    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { phone: { contains: search, mode: "insensitive" } },
        { email: { contains: search, mode: "insensitive" } },
      ];
    }

    const cariler = await prisma.cari.findMany({
      where,
      orderBy: { name: "asc" },
    });

    return NextResponse.json({
      success: true,
      data: cariler.map((c) => ({
        ...c,
        currentBalance: Number(c.currentBalance),
      })),
    });
  } catch (error: unknown) {
    console.error("Admin cariler GET hatası:", error);
    return NextResponse.json(
      { success: false, error: "Cariler listelenirken hata oluştu." },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const name = body.name?.trim();
    const phone = body.phone?.trim() || null;
    const email = body.email?.trim() || null;
    const address = body.address?.trim() || null;
    const type = body.type || "SUPPLIER"; // CUSTOMER, SUPPLIER, BOTH
    const notes = body.notes?.trim() || null;

    if (!name) {
      return NextResponse.json(
        { success: false, error: "Cari adı / Firma ünvanı zorunludur." },
        { status: 400 }
      );
    }

    if (!["CUSTOMER", "SUPPLIER", "BOTH"].includes(type)) {
      return NextResponse.json(
        { success: false, error: "Geçersiz cari tipi." },
        { status: 400 }
      );
    }

    const newCari = await prisma.cari.create({
      data: {
        name,
        phone,
        email,
        address,
        type,
        notes,
        currentBalance: 0,
      },
    });

    return NextResponse.json({
      success: true,
      message: "Cari başarıyla oluşturuldu.",
      data: {
        ...newCari,
        currentBalance: Number(newCari.currentBalance),
      },
    });
  } catch (error: unknown) {
    console.error("Admin cari POST hatası:", error);
    return NextResponse.json(
      { success: false, error: "Cari kaydedilirken bir hata oluştu." },
      { status: 500 }
    );
  }
}
