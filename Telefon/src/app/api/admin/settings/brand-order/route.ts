import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    // 1. Fetch active models to get unique active brands
    const activeModels = await prisma.phoneModel.findMany({
      where: { isActive: true },
      select: { brand: true },
    });

    const activeBrandsSet = new Set<string>();
    activeModels.forEach((m) => {
      if (m.brand && m.brand.trim()) {
        activeBrandsSet.add(m.brand.trim());
      }
    });
    const availableBrands = Array.from(activeBrandsSet);

    // 2. Fetch saved brand order setting from DB
    const setting = await prisma.systemSetting.findUnique({
      where: { key: "brand_order" },
    });

    let savedOrder: string[] = [];
    if (setting && Array.isArray(setting.value)) {
      savedOrder = setting.value as string[];
    }

    // 3. Construct ordered brands list preserving manual order for saved brands,
    // and appending any newly added active brands at the end (alphabetically sorted).
    const savedSet = new Set(savedOrder);
    const validSavedOrder = savedOrder.filter((b) => activeBrandsSet.has(b));
    const unrankedBrands = availableBrands
      .filter((b) => !savedSet.has(b))
      .sort((a, b) => a.localeCompare(b, "tr"));

    const brandOrder = [...validSavedOrder, ...unrankedBrands];

    return NextResponse.json({
      success: true,
      data: {
        brandOrder,
        availableBrands,
      },
    });
  } catch (error: unknown) {
    console.error("Admin Brand Order GET error:", error);
    return NextResponse.json(
      { success: false, error: "Marka sıralaması alınırken hata oluştu." },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const { brandOrder } = body;

    if (!Array.isArray(brandOrder)) {
      return NextResponse.json(
        { success: false, error: "Geçersiz marka sıralama verisi." },
        { status: 400 }
      );
    }

    const cleanBrandOrder = brandOrder
      .filter((b) => typeof b === "string" && b.trim().length > 0)
      .map((b) => b.trim());

    const updatedSetting = await prisma.systemSetting.upsert({
      where: { key: "brand_order" },
      update: { value: cleanBrandOrder },
      create: { key: "brand_order", value: cleanBrandOrder },
    });

    // Invalidate CDN & Next.js cache for public product listing and customer showcase
    try {
      revalidatePath("/api/public/products");
      revalidatePath("/musteri");
    } catch (e) {
      console.warn("revalidatePath error:", e);
    }

    return NextResponse.json({
      success: true,
      message: "Marka sıralaması başarıyla kaydedildi.",
      data: updatedSetting.value,
    });
  } catch (error: unknown) {
    console.error("Admin Brand Order PUT error:", error);
    return NextResponse.json(
      { success: false, error: "Marka sıralaması kaydedilirken hata oluştu." },
      { status: 500 }
    );
  }
}
