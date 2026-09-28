import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    // 1. Fetch active PhoneModels
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
      },
    });

    const activeModelIdMap = new Map<string, typeof activeModels[0]>();
    activeModels.forEach((m) => {
      activeModelIdMap.set(m.id, m);
    });

    // 2. Fetch saved product order setting from DB
    const setting = await prisma.systemSetting.findUnique({
      where: { key: "product_order" },
    });

    let savedOrder: string[] = [];
    if (setting && Array.isArray(setting.value)) {
      savedOrder = setting.value as string[];
    }

    // 3. Construct ordered models list preserving manual order for saved model IDs,
    // and appending any newly added active models at the end (sorted by brand then modelName).
    const orderedModels: typeof activeModels = [];
    const processedIds = new Set<string>();

    // Add saved active models in saved order
    savedOrder.forEach((id) => {
      const model = activeModelIdMap.get(id);
      if (model && !processedIds.has(model.id)) {
        orderedModels.push(model);
        processedIds.add(model.id);
      }
    });

    // Unranked active models appended at the end
    const unrankedModels = activeModels
      .filter((m) => !processedIds.has(m.id))
      .sort((a, b) => {
        if (a.brand !== b.brand) {
          return a.brand.localeCompare(b.brand, "tr");
        }
        return a.modelName.localeCompare(b.modelName, "tr");
      });

    const finalModels = [...orderedModels, ...unrankedModels];
    const productOrder = finalModels.map((m) => m.id);

    return NextResponse.json({
      success: true,
      data: {
        productOrder,
        models: finalModels,
      },
    });
  } catch (error: unknown) {
    console.error("Admin Product Order GET error:", error);
    return NextResponse.json(
      { success: false, error: "Ürün sıralaması alınırken hata oluştu." },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const { productOrder } = body;

    if (!Array.isArray(productOrder)) {
      return NextResponse.json(
        { success: false, error: "Geçersiz ürün sıralama verisi." },
        { status: 400 }
      );
    }

    const cleanProductOrder = productOrder
      .filter((id) => typeof id === "string" && id.trim().length > 0)
      .map((id) => id.trim());

    const updatedSetting = await prisma.systemSetting.upsert({
      where: { key: "product_order" },
      update: { value: cleanProductOrder },
      create: { key: "product_order", value: cleanProductOrder },
    });

    // Invalidate CDN & Next.js cache for public product listing and customer showcase
    try {
      revalidatePath("/api/public/products");
      revalidatePath("/musteri");
      revalidatePath("/urun/[slug]", "layout");
    } catch (e) {
      console.warn("revalidatePath error:", e);
    }

    return NextResponse.json({
      success: true,
      message: "Ürün sıralaması başarıyla kaydedildi.",
      data: updatedSetting.value,
    });
  } catch (error: unknown) {
    console.error("Admin Product Order PUT error:", error);
    return NextResponse.json(
      { success: false, error: "Ürün sıralaması kaydedilirken hata oluştu." },
      { status: 500 }
    );
  }
}
