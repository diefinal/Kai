import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { parsePositiveDecimal } from "@/lib/validations";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search")?.trim();
    const brand = searchParams.get("brand")?.trim();
    const active = searchParams.get("active");

    const where: Prisma.PhoneModelWhereInput = {};

    if (brand && brand !== "ALL") {
      where.brand = brand;
    }

    if (active === "true") {
      where.isActive = true;
    } else if (active === "false") {
      where.isActive = false;
    }

    if (search) {
      where.OR = [
        { brand: { contains: search, mode: "insensitive" } },
        { modelName: { contains: search, mode: "insensitive" } },
        { ram: { contains: search, mode: "insensitive" } },
        { storage: { contains: search, mode: "insensitive" } },
        { color: { contains: search, mode: "insensitive" } },
      ];
    }

    const models = await prisma.phoneModel.findMany({
      where,
      include: {
        devices: {
          select: {
            status: true,
          },
        },
        variants: {
          orderBy: [{ ram: "asc" }, { storage: "asc" }],
        },
      },
      orderBy: [{ brand: "asc" }, { modelName: "asc" }],
    });

    const result = models.map((m) => {
      const inStockCount = m.devices.filter((d) => d.status === "IN_STOCK").length;
      const reservedCount = m.devices.filter((d) => d.status === "RESERVED").length;
      const soldCount = m.devices.filter((d) => d.status === "SOLD").length;

      const formattedVariants = m.variants.map((v) => ({
        id: v.id,
        phoneModelId: v.phoneModelId,
        ram: v.ram,
        storage: v.storage,
        price: Number(v.price),
        customerPrice: v.customerPrice != null ? Number(v.customerPrice) : null,
        isActive: v.isActive,
      }));

      return {
        id: m.id,
        brand: m.brand,
        modelName: m.modelName,
        ram: m.ram,
        storage: m.storage,
        color: m.color,
        description: m.description,
        imageUrl: m.imageUrl,
        colorImages: m.colorImages || null,
        specs: m.specs || null,
        basePrice: Number(m.basePrice),
        isActive: m.isActive,
        createdAt: m.createdAt,
        updatedAt: m.updatedAt,
        inStockCount,
        reservedCount,
        soldCount,
        totalDeviceCount: m.devices.length,
        variants: formattedVariants,
      };
    });

    return NextResponse.json({ success: true, data: result });
  } catch (error: unknown) {
    console.error("Admin models GET hatası:", error);
    return NextResponse.json(
      { success: false, error: "Modeller yüklenirken hata oluştu." },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const brand = body.brand?.trim();
    const modelName = body.modelName?.trim();
    const ram = body.ram?.trim() || "8 GB";
    const storage = body.storage?.trim() || "256 GB";
    const color = body.color?.trim() || "Siyah";
    const description = body.description?.trim() || null;
    const imageUrl = body.imageUrl?.trim() || null;
    const colorImages = body.colorImages || null;
    const specs = body.specs || null;
    const isActive = body.isActive !== undefined ? Boolean(body.isActive) : true;
    const basePrice = parsePositiveDecimal(body.basePrice) || 0;
    const inputVariants: Array<{ ram: string; storage: string; price: number; customerPrice?: number | null }> = body.variants || [];

    if (!brand || !modelName) {
      return NextResponse.json(
        { success: false, error: "Marka ve model adı alanları zorunludur." },
        { status: 400 }
      );
    }

    // Duplicate Model Kontrolü: Marka + Model
    const existing = await prisma.phoneModel.findFirst({
      where: {
        brand: { equals: brand, mode: "insensitive" },
        modelName: { equals: modelName, mode: "insensitive" },
      },
    });

    if (existing) {
      return NextResponse.json(
        {
          success: false,
          error: `"${brand} ${modelName}" modeli sistemde zaten kayıtlıdır. Lütfen mevcut ürünü düzenleyerek yeni varyant ekleyiniz.`,
        },
        { status: 409 }
      );
    }

    // Build variants list to create
    const variantsToCreate = inputVariants.length > 0
      ? inputVariants.map((v) => {
          const parsedCustPrice = parsePositiveDecimal(v.customerPrice);
          return {
            ram: v.ram?.trim() || "8 GB",
            storage: v.storage?.trim() || "256 GB",
            price: parsePositiveDecimal(v.price) || basePrice || 10000,
            customerPrice: parsedCustPrice != null && parsedCustPrice > 0 ? parsedCustPrice : null,
            isActive: true,
          };
        })
      : [
          {
            ram,
            storage,
            price: basePrice > 0 ? basePrice : 10000,
            customerPrice: null,
            isActive: true,
          },
        ];

    const firstPrice = variantsToCreate[0]?.price || basePrice || 10000;

    const newModel = await prisma.phoneModel.create({
      data: {
        brand,
        modelName,
        ram: variantsToCreate[0].ram,
        storage: variantsToCreate[0].storage,
        color,
        basePrice: firstPrice,
        description,
        imageUrl,
        colorImages,
        specs,
        isActive,
        variants: {
          create: variantsToCreate,
        },
      },
      include: {
        variants: true,
      },
    });

    return NextResponse.json({
      success: true,
      message: "Model ve varyantları başarıyla oluşturuldu.",
      data: {
        ...newModel,
        basePrice: Number(newModel.basePrice),
        variants: newModel.variants.map((v) => ({
          id: v.id,
          phoneModelId: v.phoneModelId,
          ram: v.ram,
          storage: v.storage,
          price: Number(v.price),
          customerPrice: v.customerPrice != null ? Number(v.customerPrice) : null,
          isActive: v.isActive,
        })),
      },
    });
  } catch (error: unknown) {
    console.error("Admin model POST hatası:", error);
    const err = error as { code?: string };
    if (err.code === "P2002") {
      return NextResponse.json(
        { success: false, error: "Bu model kombinasyonu zaten mevcut." },
        { status: 409 }
      );
    }
    return NextResponse.json(
      { success: false, error: "Model kaydedilirken bir hata oluştu." },
      { status: 500 }
    );
  }
}
