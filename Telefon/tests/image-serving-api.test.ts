import { describe, it } from "node:test";
import assert from "node:assert/strict";

describe("Image Serving API Route Security & Validation Tests", () => {
  const ALLOWED_PREFIXES = new Set(["phones", "ads"]);
  const SAFE_FILENAME_REGEX = /^[a-zA-Z0-9_-]+\.(jpg|jpeg|png|webp)$/i;

  function validateImagePath(pathSegments?: string[]): { valid: boolean; status?: number; error?: string } {
    if (!pathSegments || pathSegments.length !== 2) {
      return { valid: false, status: 400, error: "Geçersiz görsel yolu." };
    }

    const [prefix, filename] = pathSegments;

    if (!ALLOWED_PREFIXES.has(prefix)) {
      return { valid: false, status: 403, error: "Yetkisiz görsel dizini." };
    }

    if (!SAFE_FILENAME_REGEX.test(filename)) {
      return { valid: false, status: 400, error: "Geçersiz veya güvensiz dosya adı." };
    }

    return { valid: true };
  }

  it("should reject path segments when length is not exactly 2", () => {
    assert.equal(validateImagePath([]).status, 400);
    assert.equal(validateImagePath(["phones"]).status, 400);
    assert.equal(validateImagePath(["phones", "sub", "test.jpg"]).status, 400);
  });

  it("should reject unauthorized prefix directories", () => {
    assert.equal(validateImagePath(["users", "avatar.jpg"]).status, 403);
    assert.equal(validateImagePath(["private", "doc.pdf"]).status, 403);
    assert.equal(validateImagePath(["admin", "test.png"]).status, 403);
  });

  it("should reject path traversal attempts and dangerous extensions", () => {
    assert.equal(validateImagePath(["phones", "../secret.jpg"]).status, 400);
    assert.equal(validateImagePath(["phones", "..\\secret.jpg"]).status, 400);
    assert.equal(validateImagePath(["phones", "test.exe"]).status, 400);
    assert.equal(validateImagePath(["phones", "test.php"]).status, 400);
    assert.equal(validateImagePath(["phones", "test.svg"]).status, 400);
    assert.equal(validateImagePath(["phones", "test.jpg.exe"]).status, 400);
    assert.equal(validateImagePath(["phones", "test;rm.jpg"]).status, 400);
    assert.equal(validateImagePath(["phones", ""]).status, 400);
  });

  it("should accept valid and safe phone and ad image paths", () => {
    assert.equal(validateImagePath(["phones", "b84d6a67-f5c8-4e1c-89cc-f11ea0e35d7f.jpg"]).valid, true);
    assert.equal(validateImagePath(["phones", "c4bc2f0e-513c-45f7-b910-63c6e2c6a824.webp"]).valid, true);
    assert.equal(validateImagePath(["ads", "summer-promo_2026.png"]).valid, true);
  });
});
