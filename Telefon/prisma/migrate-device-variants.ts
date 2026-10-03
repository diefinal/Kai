import { PrismaClient } from "@prisma/client";

/**
 * Mevcut Device kayıtlarının ram, storage, color alanlarını
 * bağlı PhoneModel'den kopyalar (tek seferlik migrasyon).
 *
 * Çalıştırma: npx tsx prisma/migrate-device-variants.ts
 */
async function main() {
  const prisma = new PrismaClient();

  try {
    console.log("Migrasyon başlıyor: Device kayıtlarına varyant bilgisi kopyalanıyor...");

    const devices = await prisma.device.findMany({
      include: {
        model: {
          select: {
            ram: true,
            storage: true,
            color: true,
          },
        },
      },
    });

    console.log(`Toplam ${devices.length} cihaz bulundu.`);

    let updatedCount = 0;

    for (const device of devices) {
      // Sadece default değerlerle kalmış (henüz güncellenmemiş) cihazları güncelle
      const needsUpdate =
        device.ram === "8 GB" &&
        device.storage === "128 GB" &&
        device.color === "Siyah" &&
        (device.model.ram !== "8 GB" ||
          device.model.storage !== "128 GB" ||
          device.model.color !== "Siyah");

      // Veya her durumda model'den eşitle (daha güvenli yaklaşım)
      if (
        device.ram !== device.model.ram ||
        device.storage !== device.model.storage ||
        device.color !== device.model.color
      ) {
        await prisma.device.update({
          where: { id: device.id },
          data: {
            ram: device.model.ram,
            storage: device.model.storage,
            color: device.model.color,
          },
        });
        updatedCount++;
      }
    }

    console.log(`Migrasyon tamamlandı: ${updatedCount} cihaz güncellendi.`);
    console.log(
      `${devices.length - updatedCount} cihaz zaten doğru değerlere sahipti (atlandı).`
    );
  } catch (error) {
    console.error("Migrasyon hatası:", error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
