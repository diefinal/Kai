import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  getOptimizedImageUrl,
  getImageStorageProvider,
  getImageStorageLabel,
} from "../src/lib/imageUtils";

describe("Image Utils Test Suite", () => {
  describe("getOptimizedImageUrl", () => {
    it("should transform Cloudflare r2.dev phone URLs to /api/images/phones/...", () => {
      const input = "https://pub-da2e5f2539444d4197ca6c8ba4d62012.r2.dev/phones/b84d6a67-f5c8-4e1c-89cc-f11ea0e35d7f.jpg";
      const result = getOptimizedImageUrl(input);
      assert.equal(result, "/api/images/phones/b84d6a67-f5c8-4e1c-89cc-f11ea0e35d7f.jpg");
    });

    it("should transform Cloudflare r2.dev ad URLs to /api/images/ads/...", () => {
      const input = "https://pub-da2e5f2539444d4197ca6c8ba4d62012.r2.dev/ads/camp-banner.webp";
      const result = getOptimizedImageUrl(input);
      assert.equal(result, "/api/images/ads/camp-banner.webp");
    });

    it("should preserve already proxied /api/images/... URLs", () => {
      const input = "/api/images/phones/b84d6a67-f5c8-4e1c-89cc-f11ea0e35d7f.jpg";
      const result = getOptimizedImageUrl(input);
      assert.equal(result, input);
    });

    it("should preserve external and Supabase URLs", () => {
      const supabaseUrl = "https://ucozmwcxjzuhpzirggoa.supabase.co/storage/v1/object/public/phone-images/test.jpg";
      assert.equal(getOptimizedImageUrl(supabaseUrl), supabaseUrl);

      const externalUrl = "https://example.com/phone.png";
      assert.equal(getOptimizedImageUrl(externalUrl), externalUrl);
    });

    it("should return null for empty, undefined or whitespace inputs", () => {
      assert.equal(getOptimizedImageUrl(null), null);
      assert.equal(getOptimizedImageUrl(undefined), null);
      assert.equal(getOptimizedImageUrl(""), null);
      assert.equal(getOptimizedImageUrl("   "), null);
    });
  });

  describe("getImageStorageProvider", () => {
    it("should correctly detect r2 provider", () => {
      assert.equal(getImageStorageProvider("/api/images/phones/test.jpg"), "r2");
      assert.equal(getImageStorageProvider("https://pub-xxx.r2.dev/phones/test.jpg"), "r2");
    });

    it("should correctly detect supabase provider", () => {
      assert.equal(getImageStorageProvider("https://xxx.supabase.co/storage/v1/object/public/phone-images/test.jpg"), "supabase");
    });

    it("should correctly detect local and external providers", () => {
      assert.equal(getImageStorageProvider("/teknoreha-logo.png"), "local");
      assert.equal(getImageStorageProvider("https://other-domain.com/pic.jpg"), "external");
      assert.equal(getImageStorageProvider(null), "none");
    });
  });

  describe("getImageStorageLabel", () => {
    it("should return user-friendly Turkish labels", () => {
      assert.equal(getImageStorageLabel("/api/images/phones/test.jpg"), "Cloudflare R2 üzerinde kayıtlı");
      assert.equal(getImageStorageLabel("https://pub-xxx.r2.dev/phones/test.jpg"), "Cloudflare R2 üzerinde kayıtlı");
      assert.equal(getImageStorageLabel("https://xxx.supabase.co/test.jpg"), "Eski Supabase Storage (Kota aşımı - Yenileme önerilir)");
      assert.equal(getImageStorageLabel(null), "Görsel yok");
    });
  });
});
