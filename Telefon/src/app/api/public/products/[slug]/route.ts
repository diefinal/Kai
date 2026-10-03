import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createProductSlug, slugify } from "@/lib/utils";
import { buildPublicProductDTO } from "@/lib/productVariantUtils";

export const dynamic = "force-dynamic";

export async function GET(
  request: Request,
  { params }: { params: { slug: string } }
) {
  try {
    const { slug } = params;
    const { searchParams } = new URL(request.url);
    const selectedRam = searchParams.get("ram");
    const selectedStorage = searchParams.get("storage");
    const selectedColor = searchParams.get("color");

    if (!slug) {
      return NextResponse.json(
        { success: false, error: "Geçersiz ürün bağlantısı." },
        { status: 400 }
      );
    }

    const cleanSlug = slug.toLowerCase().trim();

    // 1. Fetch active PhoneModels with variants and in-stock devices
    const targetModels = await prisma.phoneModel.findMany({
      where: {
        isActive: true,
      },
      include: {
        variants: {
          where: { isActive: true },
          include: { colorPrices: true },
          orderBy: [{ price: "asc" }],
        },
        devices: {
          where: { status: "IN_STOCK" },
          select: {
            id: true,
            ram: true,
            storage: true,
            color: true,
            salePrice: true,
            status: true,
            variantId: true,
          },
        },
      },
    });

    let baseModel = targetModels.find(
      (m) => createProductSlug(m.brand, m.modelName) === cleanSlug
    );

    if (!baseModel) {
      baseModel = targetModels.find((m) => slugify(m.modelName) === cleanSlug);
    }

    if (!baseModel) {
      return NextResponse.json(
        { success: false, error: "Aradığınız ürün bulunamadı." },
        { status: 404 }
      );
    }

    // 2. Gather available RAMs & Storages across all variants
    const allVariants = baseModel.variants;
    const availableStoragesPerRam: Record<string, string[]> = {};
    const ramSet = new Set<string>();
    const allStorageSet = new Set<string>();

    allVariants.forEach((v) => {
      if (v.ram) {
        ramSet.add(v.ram);
        if (!availableStoragesPerRam[v.ram]) {
          availableStoragesPerRam[v.ram] = [];
        }
        if (v.storage && !availableStoragesPerRam[v.ram].includes(v.storage)) {
          availableStoragesPerRam[v.ram].push(v.storage);
        }
      }
      if (v.storage) allStorageSet.add(v.storage);
    });

    // Fallback if no variants exist in DB
    if (ramSet.size === 0) {
      ramSet.add(baseModel.ram || "8 GB");
      availableStoragesPerRam[baseModel.ram || "8 GB"] = [baseModel.storage || "256 GB"];
      allStorageSet.add(baseModel.storage || "256 GB");
    }

    const availableRams = Array.from(ramSet).sort(
      (a, b) => parseInt(a) - parseInt(b)
    );
    const availableStorages = Array.from(allStorageSet).sort(
      (a, b) => parseInt(a) - parseInt(b)
    );

    Object.keys(availableStoragesPerRam).forEach((r) => {
      availableStoragesPerRam[r].sort((a, b) => parseInt(a) - parseInt(b));
    });

    // 3. Build PublicProductDTO for selected or default variant
    const productDto = buildPublicProductDTO(
      baseModel,
      selectedRam,
      selectedStorage,
      selectedColor
    );

    return NextResponse.json({
      success: true,
      data: {
        ...productDto,
        availableRams,
        availableStorages,
        availableStoragesPerRam,
        overallInStock: baseModel.devices.length > 0,
      },
    });
  } catch (error: unknown) {
    console.error("Public ürün detay hatası:", error);
    return NextResponse.json(
      { success: false, error: "Ürün detayları alınırken bir hata oluştu." },
      { status: 500 }
    );
  }
}
