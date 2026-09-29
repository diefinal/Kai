import test, { describe } from "node:test";
import assert from "node:assert/strict";
import { buildPublicProductDTO, PhoneModelWithVariantsAndDevices } from "@/lib/productVariantUtils";

describe("PhoneModelVariant Selection & PublicProductDTO Tests", () => {
  test("Xiaomi 15T scenario: In-stock variant (12/512) should be selected over out-of-stock variant (12/256)", () => {
    const xiaomi15T: PhoneModelWithVariantsAndDevices = {
      id: "xiaomi-15t-id",
      brand: "Xiaomi",
      modelName: "15T",
      ram: "12 GB",
      storage: "256 GB",
      color: "Siyah,Gold,Gri",
      description: null,
      imageUrl: "https://example.com/xiaomi15t.png",
      colorImages: { Siyah: "https://example.com/siyah.png" },
      specs: null,
      basePrice: 25000,
      isActive: true,
      variants: [
        {
          id: "var-256",
          phoneModelId: "xiaomi-15t-id",
          ram: "12 GB",
          storage: "256 GB",
          price: 25000,
          isActive: true,
        },
        {
          id: "var-512",
          phoneModelId: "xiaomi-15t-id",
          ram: "12 GB",
          storage: "512 GB",
          price: 27500,
          isActive: true,
        },
      ],
      devices: [
        {
          id: "dev-1",
          ram: "12 GB",
          storage: "512 GB",
          color: "Siyah",
          salePrice: 27500,
          status: "IN_STOCK",
          variantId: "var-512",
        },
      ],
    };

    const dto = buildPublicProductDTO(xiaomi15T);

    assert.equal(dto.brand, "Xiaomi");
    assert.equal(dto.modelName, "15T");
    assert.equal(dto.ram, "12 GB");
    assert.equal(dto.storage, "512 GB");
    assert.equal(dto.basePrice, 27500);
    assert.equal(dto.inStock, true);
    assert.equal(dto.color, "Siyah");
  });

  test("Apple 17 multi-variant scenario: Should default to lowest price active variant when none in stock", () => {
    const apple17: PhoneModelWithVariantsAndDevices = {
      id: "apple-17-id",
      brand: "Apple",
      modelName: "17",
      ram: "8 GB",
      storage: "256 GB",
      color: "Siyah,Beyaz,Mavi",
      description: null,
      imageUrl: "https://example.com/apple17.png",
      colorImages: null,
      specs: null,
      basePrice: 54000,
      isActive: true,
      variants: [
        {
          id: "v-256",
          phoneModelId: "apple-17-id",
          ram: "8 GB",
          storage: "256 GB",
          price: 54000,
          isActive: true,
        },
        {
          id: "v-512",
          phoneModelId: "apple-17-id",
          ram: "16 GB",
          storage: "512 GB",
          price: 60000,
          isActive: true,
        },
      ],
      devices: [],
    };

    const defaultDto = buildPublicProductDTO(apple17);
    assert.equal(defaultDto.ram, "8 GB");
    assert.equal(defaultDto.storage, "256 GB");
    assert.equal(defaultDto.basePrice, 54000);
    assert.equal(defaultDto.inStock, false);

    const explicit512Dto = buildPublicProductDTO(apple17, "16 GB", "512 GB");
    assert.equal(explicit512Dto.ram, "16 GB");
    assert.equal(explicit512Dto.storage, "512 GB");
    assert.equal(explicit512Dto.basePrice, 60000);
    assert.equal(explicit512Dto.inStock, false);
  });

  test("All DTO fields (RAM, Storage, Price, Stock) must originate from the SAME PhoneModelVariant", () => {
    const model: PhoneModelWithVariantsAndDevices = {
      id: "m-1",
      brand: "TestBrand",
      modelName: "Model X",
      ram: "8 GB",
      storage: "128 GB",
      color: "Siyah",
      description: null,
      imageUrl: null,
      colorImages: null,
      specs: null,
      basePrice: 10000,
      isActive: true,
      variants: [
        {
          id: "v1",
          phoneModelId: "m-1",
          ram: "8 GB",
          storage: "128 GB",
          price: 15000,
          isActive: true,
        },
        {
          id: "v2",
          phoneModelId: "m-1",
          ram: "12 GB",
          storage: "256 GB",
          price: 20000,
          isActive: true,
        },
      ],
      devices: [
        {
          id: "d2",
          ram: "12 GB",
          storage: "256 GB",
          color: "Siyah",
          salePrice: 20000,
          status: "IN_STOCK",
          variantId: "v2",
        },
      ],
    };

    const dto = buildPublicProductDTO(model);
    assert.equal(dto.ram, "12 GB");
    assert.equal(dto.storage, "256 GB");
    assert.equal(dto.basePrice, 20000);
    assert.equal(dto.inStock, true);
  });
});
