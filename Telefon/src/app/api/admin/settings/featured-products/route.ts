import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    // 1. Fetch all active PhoneModels with devices count
    const activeModels = await prisma.phoneModel.findMany({
      where: { isActive: true },
      select: {
        id: true,
        brand: true,
        modelName: true,
        ram: true,
        storage: true,
        color: true,
        imageUrl: true,
        basePrice: true,
        isActive: true,
        devices: {
          where: { status: "IN_STOCK" },
          select: { id: true },
        },
      },
      orderBy: [{ brand: "asc" }, { modelName: "asc" }],
    });

    const activeModelIdMap = new Map<string, typeof activeModels[0]>();
    activeModels.forEach((m) => {
      activeModelIdMap.set(m.id, m);
    });

    // 2. Fetch featured settings from SystemSetting
    const [enabledSetting, orderSetting] = await Promise.all([
      prisma.systemSetting.findUnique({ where: { key: "featured_products_enabled" } }),
      prisma.systemSetting.findUnique({ where: { key: "featured_product_order" } }),
    ]);

    const enabled = enabledSetting ? Boolean(enabledSetting.value) : true;
    let savedOrder: string[] = [];
    if (orderSetting && Array.isArray(orderSetting.value)) {
      savedOrder = orderSetting.value as string[];
    }

    // 3. Filter and order featured models according to savedOrder
    const featuredModels: Array<typeof activeModels[0] & { inStock: boolean }> = [];
    const processedIds = new Set<string>();

    savedOrder.forEach((id) => {
      const model = activeModelIdMap.get(id);
      if (model && !processedIds.has(model.id)) {
        featuredModels.push({
          ...model,
          inStock: model.devices.length > 0,
        });
        processedIds.add(model.id);
      }
    });

    const allModelsFormatted = activeModels.map((m) => ({
      ...m,
      inStock: m.devices.length > 0,
    }));

    return NextResponse.json({
      success: true,
      data: {
        enabled,
        featuredProductOrder: Array.from(processedIds),
        featuredModels,
        allModels: allModelsFormatted,
      },
    });
  } catch (error: unknown) {
    console.error("Admin Featured Products GET error:", error);
    return NextResponse.json(
      { success: false, error: "Öne çıkan ürün ayarları alınırken hata oluştu." },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const { enabled, featuredProductOrder } = body;

    if (typeof enabled !== "boolean" || !Array.isArray(featuredProductOrder)) {
      return NextResponse.json(
        { success: false, error: "Geçersiz öne çıkan ürün ayar verisi." },
        { status: 400 }
      );
    }

    const cleanOrder = featuredProductOrder
      .filter((id) => typeof id === "string" && id.trim().length > 0)
      .map((id) => id.trim());

    await Promise.all([
      prisma.systemSetting.upsert({
        where: { key: "featured_products_enabled" },
        update: { value: enabled },
        create: { key: "featured_products_enabled", value: enabled },
      }),
      prisma.systemSetting.upsert({
        where: { key: "featured_product_order" },
        update: { value: cleanOrder },
        create: { key: "featured_product_order", value: cleanOrder },
      }),
    ]);

    // Invalidate CDN & Next.js cache for public listing and showcase pages
    try {
      revalidatePath("/api/public/products");
      revalidatePath("/musteri");
      revalidatePath("/");
    } catch (e) {
      console.warn("revalidatePath error:", e);
    }

    return NextResponse.json({
      success: true,
      message: "Öne çıkan ürün ayarları başarıyla kaydedildi.",
      data: {
        enabled,
        featuredProductOrder: cleanOrder,
      },
    });
  } catch (error: unknown) {
    console.error("Admin Featured Products PUT error:", error);
    return NextResponse.json(
      { success: false, error: "Öne çıkan ürün ayarları kaydedilirken hata oluştu." },
      { status: 500 }
    );
  }
}
