import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

/**
 * GET /api/admin/customer-prices
 * Returns all active phone models with variants, colorPrices, devices stock info
 */
export async function GET() {
  try {
    const models = await prisma.phoneModel.findMany({
      where: { isActive: true },
      include: {
        variants: {
          where: { isActive: true },
          include: {
            colorPrices: true,
          },
          orderBy: [{ ram: "asc" }, { storage: "asc" }],
        },
        devices: {
          select: {
            id: true,
            ram: true,
            storage: true,
            color: true,
            status: true,
            salePrice: true,
            variantId: true,
          },
        },
      },
      orderBy: [{ brand: "asc" }, { modelName: "asc" }],
    });

    return NextResponse.json({
      success: true,
      data: models,
    });
  } catch (error: unknown) {
    console.error("GET /api/admin/customer-prices Error:", error);
    return NextResponse.json(
      { success: false, error: "Müşteri ekranı fiyatları alınırken bir hata oluştu." },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/admin/customer-prices
 * Body: {
 *   variantId: string,
 *   customerPrice?: number | null, (Variant level price override)
 *   colorOverrides?: { color: string, customerPrice: number | null }[] (Color level price overrides)
 *   resetAll?: boolean (Reset variant and all color overrides to null/sale price)
 * }
 */
export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const { variantId, customerPrice, colorOverrides, resetAll } = body;

    if (!variantId) {
      return NextResponse.json(
        { success: false, error: "Geçersiz varyant seçimi." },
        { status: 400 }
      );
    }

    const variant = await prisma.phoneModelVariant.findUnique({
      where: { id: variantId },
    });

    if (!variant) {
      return NextResponse.json(
        { success: false, error: "Varyant bulunamadı." },
        { status: 404 }
      );
    }

    if (resetAll) {
      // 1. Reset variant level customerPrice to null
      await prisma.phoneModelVariant.update({
        where: { id: variantId },
        data: { customerPrice: null },
      });

      // 2. Delete all color-level overrides for this variant
      await prisma.phoneVariantColorPrice.deleteMany({
        where: { variantId },
      });
    } else {
      // Update variant-level customerPrice if provided
      if (customerPrice !== undefined) {
        const val = customerPrice != null && Number(customerPrice) > 0 ? Number(customerPrice) : null;
        await prisma.phoneModelVariant.update({
          where: { id: variantId },
          data: { customerPrice: val },
        });
      }

      // Update color-level overrides if provided
      if (Array.isArray(colorOverrides)) {
        for (const co of colorOverrides) {
          if (!co.color) continue;
          const colorClean = co.color.trim();
          const val = co.customerPrice != null && Number(co.customerPrice) > 0 ? Number(co.customerPrice) : null;

          if (val === null) {
            // Delete override if reset to null
            await prisma.phoneVariantColorPrice.deleteMany({
              where: {
                variantId,
                color: { equals: colorClean, mode: "insensitive" },
              },
            });
          } else {
            // Upsert color price record
            const existing = await prisma.phoneVariantColorPrice.findFirst({
              where: {
                variantId,
                color: { equals: colorClean, mode: "insensitive" },
              },
            });

            if (existing) {
              await prisma.phoneVariantColorPrice.update({
                where: { id: existing.id },
                data: { customerPrice: val },
              });
            } else {
              await prisma.phoneVariantColorPrice.create({
                data: {
                  variantId,
                  color: colorClean,
                  customerPrice: val,
                },
              });
            }
          }
        }
      }
    }

    // Return updated variant with colorPrices
    const updatedVariant = await prisma.phoneModelVariant.findUnique({
      where: { id: variantId },
      include: { colorPrices: true },
    });

    return NextResponse.json({
      success: true,
      data: updatedVariant,
    });
  } catch (error: unknown) {
    console.error("PUT /api/admin/customer-prices Error:", error);
    return NextResponse.json(
      { success: false, error: "Müşteri vitrin fiyatı güncellenirken hata oluştu." },
      { status: 500 }
    );
  }
}
