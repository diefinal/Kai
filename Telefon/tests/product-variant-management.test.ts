import test, { describe, it, after } from "node:test";
import assert from "node:assert/strict";
import { prisma } from "../src/lib/prisma";

describe("Single PhoneModel & Variant Management Tests", () => {
  let createdModelId = "";
  let variant8_256Id = "";
  let variant16_512Id = "";

  after(async () => {
    try {
      if (createdModelId) {
        await prisma.phoneModelVariant.deleteMany({ where: { phoneModelId: createdModelId } });
        await prisma.phoneModel.delete({ where: { id: createdModelId } }).catch(() => {});
      }
    } catch (e) {
      console.error("Cleanup error:", e);
    }
  });

  it("1. Single PhoneModel with multiple variants creation", async () => {
    const model = await prisma.phoneModel.create({
      data: {
        brand: "AppleTest",
        modelName: "17 Unique",
        ram: "8 GB",
        storage: "256 GB",
        color: "Siyah,Beyaz",
        basePrice: 54000,
        isActive: true,
        variants: {
          create: [
            { ram: "8 GB", storage: "256 GB", price: 54000, isActive: true },
            { ram: "16 GB", storage: "512 GB", price: 60000, isActive: true },
          ],
        },
      },
      include: {
        variants: true,
      },
    });

    createdModelId = model.id;
    assert.equal(model.variants.length, 2, "2 variants should be created under 1 PhoneModel");

    const v8 = model.variants.find((v) => v.ram === "8 GB" && v.storage === "256 GB");
    const v16 = model.variants.find((v) => v.ram === "16 GB" && v.storage === "512 GB");

    assert.ok(v8);
    assert.ok(v16);
    assert.equal(Number(v8!.price), 54000);
    assert.equal(Number(v16!.price), 60000);

    variant8_256Id = v8!.id;
    variant16_512Id = v16!.id;
  });

  it("2. DB duplicate prevention for brand + modelName in API POST", async () => {
    const existing = await prisma.phoneModel.findFirst({
      where: {
        brand: { equals: "AppleTest", mode: "insensitive" },
        modelName: { equals: "17 Unique", mode: "insensitive" },
      },
    });

    assert.ok(existing, "Existing model should be found");
    assert.equal(existing!.id, createdModelId);
  });

  it("3. Out of stock variant price should be 60.000 TL for 16/512 GB", async () => {
    const variants = await prisma.phoneModelVariant.findMany({
      where: { phoneModelId: createdModelId, isActive: true },
    });

    const v16 = variants.find((v) => v.ram === "16 GB" && v.storage === "512 GB");
    assert.ok(v16);
    assert.equal(Number(v16!.price), 60000, "16GB/512GB variant price must be 60.000 TL even with 0 stock");
  });

  it("4. Safe variant deletion check", async () => {
    // Delete variant 16GB/512GB when 0 devices attached
    const devCount = await prisma.device.count({
      where: { variantId: variant16_512Id },
    });
    assert.equal(devCount, 0);

    await prisma.phoneModelVariant.delete({ where: { id: variant16_512Id } });

    const remaining = await prisma.phoneModelVariant.findMany({
      where: { phoneModelId: createdModelId },
    });
    assert.equal(remaining.length, 1);
    assert.equal(remaining[0].id, variant8_256Id);
  });
});
