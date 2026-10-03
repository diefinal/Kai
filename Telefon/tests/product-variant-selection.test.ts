import test, { describe } from "node:test";
import assert from "node:assert/strict";
import { buildPublicProductDTO, resolveModelVariant, PhoneModelWithVariantsAndDevices } from "@/lib/productVariantUtils";

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
          customerPrice: 26000,
          isActive: true,
        },
        {
          id: "var-512",
          phoneModelId: "xiaomi-15t-id",
          ram: "12 GB",
          storage: "512 GB",
          price: 27500,
          customerPrice: 29000,
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
    // customerPrice is 29000 (overriding 27500 internal sale price)
    assert.equal(dto.basePrice, 29000);
    assert.equal(dto.inStock, true);
    assert.equal(dto.color, "Siyah");
  });

  test("Customer Price Fallback: Should use customerPrice when set, otherwise fallback to internal sale price", () => {
    const model: PhoneModelWithVariantsAndDevices = {
      id: "model-fallback-id",
      brand: "Apple",
      modelName: "iPhone 17",
      ram: "8 GB",
      storage: "256 GB",
      color: "Siyah",
      description: null,
      imageUrl: null,
      colorImages: null,
      specs: null,
      basePrice: 54000,
      isActive: true,
      variants: [
        {
          id: "v-256",
          phoneModelId: "model-fallback-id",
          ram: "8 GB",
          storage: "256 GB",
          price: 54000,
          customerPrice: 56000, // Custom showcase price
          isActive: true,
        },
        {
          id: "v-512",
          phoneModelId: "model-fallback-id",
          ram: "16 GB",
          storage: "512 GB",
          price: 60000,
          customerPrice: null, // Null showcase price => fallback to 60000
          isActive: true,
        },
      ],
      devices: [],
    };

    const v256Info = resolveModelVariant(model, "8 GB", "256 GB");
    assert.equal(v256Info.internalSalePrice, 54000);
    assert.equal(v256Info.customerPrice, 56000);
    assert.equal(v256Info.price, 56000); // Showcase price

    const v512Info = resolveModelVariant(model, "16 GB", "512 GB");
    assert.equal(v512Info.internalSalePrice, 60000);
    assert.equal(v512Info.customerPrice, null);
    assert.equal(v512Info.price, 60000); // Fallback to internal price
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
          customerPrice: 56000,
          isActive: true,
        },
        {
          id: "v-512",
          phoneModelId: "apple-17-id",
          ram: "16 GB",
          storage: "512 GB",
          price: 60000,
          customerPrice: 63000,
          isActive: true,
        },
      ],
      devices: [],
    };

    const defaultDto = buildPublicProductDTO(apple17);
    assert.equal(defaultDto.ram, "8 GB");
    assert.equal(defaultDto.storage, "256 GB");
    assert.equal(defaultDto.basePrice, 56000);
    assert.equal(defaultDto.inStock, false);

    const explicit512Dto = buildPublicProductDTO(apple17, "16 GB", "512 GB");
    assert.equal(explicit512Dto.ram, "16 GB");
    assert.equal(explicit512Dto.storage, "512 GB");
    assert.equal(explicit512Dto.basePrice, 63000);
    assert.equal(explicit512Dto.inStock, false);
  });

  test("Color-Level Customer Price Override: Siyah -> 29.000 TL, Mavi -> 29.500 TL, Beyaz -> 27.500 TL (Internal Sale)", () => {
    const model: PhoneModelWithVariantsAndDevices = {
      id: "xiaomi-color-override-id",
      brand: "Xiaomi",
      modelName: "15T",
      ram: "12 GB",
      storage: "512 GB",
      color: "Siyah,Mavi,Beyaz",
      description: null,
      imageUrl: null,
      colorImages: null,
      specs: null,
      basePrice: 27500,
      isActive: true,
      variants: [
        {
          id: "var-512",
          phoneModelId: "xiaomi-color-override-id",
          ram: "12 GB",
          storage: "512 GB",
          price: 27500,
          customerPrice: null,
          isActive: true,
          colorPrices: [
            { id: "cp-siyah", color: "Siyah", customerPrice: 29000 },
            { id: "cp-mavi", color: "Mavi", customerPrice: 29500 },
          ],
        },
      ],
      devices: [],
    };

    // Siyah selected => 29.000 TL
    const siyahDto = buildPublicProductDTO(model, "12 GB", "512 GB", "Siyah");
    assert.equal(siyahDto.color, "Siyah");
    assert.equal(siyahDto.basePrice, 29000);

    // Mavi selected => 29.500 TL
    const maviDto = buildPublicProductDTO(model, "12 GB", "512 GB", "Mavi");
    assert.equal(maviDto.color, "Mavi");
    assert.equal(maviDto.basePrice, 29500);

    // Beyaz selected (no color override, no variant customerPrice) => 27.500 TL (Internal Sale Price)
    const beyazDto = buildPublicProductDTO(model, "12 GB", "512 GB", "Beyaz");
    assert.equal(beyazDto.color, "Beyaz");
    assert.equal(beyazDto.basePrice, 27500);
  });
});
