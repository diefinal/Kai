import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { parsePositiveDecimal } from "@/lib/validations";
import { deletePhoneImage } from "@/lib/storage";

export const dynamic = "force-dynamic";

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const model = await prisma.phoneModel.findUnique({
      where: { id },
      include: {
        variants: {
          orderBy: [{ ram: "asc" }, { storage: "asc" }],
        },
        devices: {
          include: {
            supplier: {
              select: {
                id: true,
                name: true,
                phone: true,
              },
            },
          },
          orderBy: { purchaseDate: "desc" },
        },
      },
    });

    if (!model) {
      return NextResponse.json(
        { success: false, error: "Model bulunamadı." },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        ...model,
        basePrice: Number(model.basePrice),
        variants: model.variants.map((v) => ({
          id: v.id,
          phoneModelId: v.phoneModelId,
          ram: v.ram,
          storage: v.storage,
          price: Number(v.price),
          customerPrice: v.customerPrice != null ? Number(v.customerPrice) : null,
          isActive: v.isActive,
        })),
        devices: model.devices.map((d) => ({
          ...d,
          purchasePrice: Number(d.purchasePrice),
          salePrice: Number(d.salePrice),
        })),
      },
    });
  } catch (error: unknown) {
    console.error("Admin model GET [id] hatası:", error);
    return NextResponse.json(
      { success: false, error: "Model bilgileri yüklenemedi." },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const body = await request.json();

    const existing = await prisma.phoneModel.findUnique({
      where: { id },
      include: { variants: true },
    });

    if (!existing) {
      return NextResponse.json(
        { success: false, error: "Güncellenecek model bulunamadı." },
        { status: 404 }
      );
    }

    const brand = body.brand?.trim() || existing.brand;
    const modelName = body.modelName?.trim() || existing.modelName;
    const color = body.color !== undefined ? body.color?.trim() : existing.color;
    const description = body.description !== undefined ? body.description?.trim() : existing.description;
    const imageUrl = body.imageUrl !== undefined ? body.imageUrl?.trim() : existing.imageUrl;
    const colorImages = body.colorImages !== undefined ? body.colorImages : existing.colorImages;
    const specs = body.specs !== undefined ? body.specs : existing.specs;
    const isActive = body.isActive !== undefined ? Boolean(body.isActive) : existing.isActive;

    // Duplicate marka + modelName kontrolü (kendi ID'si hariç)
    if (brand !== existing.brand || modelName !== existing.modelName) {
      const duplicate = await prisma.phoneModel.findFirst({
        where: {
          id: { not: id },
          brand: { equals: brand, mode: "insensitive" },
          modelName: { equals: modelName, mode: "insensitive" },
        },
      });

      if (duplicate) {
        return NextResponse.json(
          {
            success: false,
            error: `"${brand} ${modelName}" ismiyle başka bir ana ürün zaten mevcut.`,
          },
          { status: 409 }
        );
      }
    }

    // Update main model details
    await prisma.phoneModel.update({
      where: { id },
      data: {
        brand,
        modelName,
        color,
        description,
        imageUrl,
        colorImages,
        specs,
        isActive,
      },
    });

    // Handle variant updates/creations/deletions if variants array is provided
    if (Array.isArray(body.variants)) {
      for (const v of body.variants) {
        if (v.id) {
          if (v.delete) {
            // Check if variant can be safely deleted
            const deviceCount = await prisma.device.count({
              where: { OR: [{ variantId: v.id }, { modelId: id, ram: v.ram, storage: v.storage }] },
            });
            if (deviceCount > 0) {
              // Passivate instead of hard delete
              await prisma.phoneModelVariant.update({
                where: { id: v.id },
                data: { isActive: false },
              });
            } else {
              await prisma.phoneModelVariant.delete({ where: { id: v.id } });
            }
          } else {
            const price = parsePositiveDecimal(v.price) || 0;
            const parsedCustPrice = parsePositiveDecimal(v.customerPrice);
            await prisma.phoneModelVariant.update({
              where: { id: v.id },
              data: {
                ram: v.ram?.trim(),
                storage: v.storage?.trim(),
                price: price > 0 ? price : 10000,
                customerPrice: parsedCustPrice != null && parsedCustPrice > 0 ? parsedCustPrice : null,
                isActive: v.isActive !== undefined ? Boolean(v.isActive) : true,
              },
            });
          }
        } else {
          // New variant to create
          const price = parsePositiveDecimal(v.price) || 0;
          const parsedCustPrice = parsePositiveDecimal(v.customerPrice);
          await prisma.phoneModelVariant.create({
            data: {
              phoneModelId: id,
              ram: v.ram?.trim() || "8 GB",
              storage: v.storage?.trim() || "256 GB",
              price: price > 0 ? price : 10000,
              customerPrice: parsedCustPrice != null && parsedCustPrice > 0 ? parsedCustPrice : null,
              isActive: true,
            },
          });
        }
      }
    }

    // Refetch updated model with variants
    const fullUpdated = await prisma.phoneModel.findUnique({
      where: { id },
      include: {
        variants: {
          orderBy: [{ ram: "asc" }, { storage: "asc" }],
        },
      },
    });

    // Image cleanup if changed
    if (existing.imageUrl && existing.imageUrl !== imageUrl) {
      deletePhoneImage(existing.imageUrl).catch((err) =>
        console.warn("Eski görsel silinirken uyarı:", err)
      );
    }

    return NextResponse.json({
      success: true,
      message: "Model ve varyantları başarıyla güncellendi.",
      data: {
        ...fullUpdated,
        basePrice: Number(fullUpdated?.basePrice || 0),
        variants: fullUpdated?.variants.map((v) => ({
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
    console.error("Admin model PUT hatası:", error);
    return NextResponse.json(
      { success: false, error: "Model güncellenirken hata oluştu." },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const { searchParams } = new URL(request.url);
    const variantId = searchParams.get("variantId")?.trim();

    const existing = await prisma.phoneModel.findUnique({
      where: { id },
      include: { variants: true },
    });

    if (!existing) {
      return NextResponse.json(
        { success: false, error: "Silinecek model bulunamadı." },
        { status: 404 }
      );
    }

    // 1. Varyant Silme İşlemi (variantId query param varsa)
    if (variantId) {
      const targetVariant = existing.variants.find((v) => v.id === variantId);
      if (!targetVariant) {
        return NextResponse.json(
          { success: false, error: "Silinecek varyant bulunamadı." },
          { status: 404 }
        );
      }

      // Varyant ile ilişkili cihazlar (stok, satılmış veya rezerv) var mı?
      const deviceCount = await prisma.device.count({
        where: {
          OR: [
            { variantId: targetVariant.id },
            {
              modelId: id,
              ram: targetVariant.ram,
              storage: targetVariant.storage,
            },
          ],
        },
      });

      if (deviceCount > 0) {
        // Finansal/stok geçmişini koru: varyantı pasif yap, hard-delete yapma!
        await prisma.phoneModelVariant.update({
          where: { id: targetVariant.id },
          data: { isActive: false },
        });

        return NextResponse.json({
          success: true,
          message: `Bu varyanta ait ${deviceCount} adet cihaz/stok kaydı bulunmaktadır. Finansal geçmişi korumak adına varyant silinmek yerine 'Pasif' duruma getirildi.`,
          isSoftDelete: true,
        });
      }

      // Cihaz kaydı yoksa güvenli hard-delete
      await prisma.phoneModelVariant.delete({
        where: { id: targetVariant.id },
      });

      return NextResponse.json({
        success: true,
        message: "Varyant başarıyla silindi.",
      });
    }

    // 2. Ana Ürün Silme İşlemi (tüm ürünü sil)
    const deviceCount = await prisma.device.count({
      where: { modelId: id },
    });

    const leadCount = await prisma.salesLead.count({
      where: { phoneModelId: id },
    });

    const adCount = await prisma.ad.count({
      where: { phoneModelId: id },
    });

    if (deviceCount > 0 || leadCount > 0 || adCount > 0) {
      // Pasife al, finansal ve işlem geçmişini asla silme!
      await prisma.phoneModel.update({
        where: { id },
        data: { isActive: false },
      });

      await prisma.phoneModelVariant.updateMany({
        where: { phoneModelId: id },
        data: { isActive: false },
      });

      return NextResponse.json({
        success: true,
        message: `Bu ürüne ait işlem/stok geçmişi (${deviceCount} Cihaz, ${leadCount} Fırsat, ${adCount} Reklam) bulunmaktadır. Finansal geçmişi korumak için ürün silinmek yerine 'Pasif' duruma getirildi.`,
        isSoftDelete: true,
      });
    }

    // Hiç işlem görmemişse hard-delete
    await prisma.phoneModelVariant.deleteMany({
      where: { phoneModelId: id },
    });

    await prisma.phoneModel.delete({
      where: { id },
    });

    if (existing.imageUrl) {
      deletePhoneImage(existing.imageUrl).catch((err) =>
        console.warn("Silinen modelin görseli kaldırılırken uyarı:", err)
      );
    }

    return NextResponse.json({
      success: true,
      message: "Ürün ve bağlı varyantları başarıyla silindi.",
    });
  } catch (error: unknown) {
    console.error("Admin model DELETE hatası:", error);
    return NextResponse.json(
      { success: false, error: "Model silinirken hata oluştu." },
      { status: 500 }
    );
  }
}
