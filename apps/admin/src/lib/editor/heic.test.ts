import { describe, expect, it } from "vitest";
import { cappedSize, convertedName, isHeic } from "./heic";

const bytes = (text: string) => new TextEncoder().encode(text);
const file = (content: Uint8Array<ArrayBuffer> | string, name: string, type = "") =>
  new File([typeof content === "string" ? bytes(content) : content], name, { type });

describe("isHeic", () => {
  it("recognises HEIC by type", async () => {
    expect(await isHeic(file("x", "a", "image/heic"))).toBe(true);
    expect(await isHeic(file("x", "a", "image/HEIF"))).toBe(true);
  });

  it("recognises HEIC by name", async () => {
    expect(await isHeic(file("x", "IMG_5420.HEIC"))).toBe(true);
    expect(await isHeic(file("x", "photo.heif"))).toBe(true);
  });

  it("recognises HEIC by content", async () => {
    expect(await isHeic(file("\0\0\0\x18ftypheic\0\0\0\0", "upload"))).toBe(true);
    expect(await isHeic(file("\0\0\0\x18ftypmif1\0\0\0\0", "upload.bin"))).toBe(true);
  });

  it("leaves other files alone", async () => {
    const jpeg = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0, 16, 74, 70, 73, 70, 0, 1]);
    expect(await isHeic(file(jpeg, "photo.jpg", "image/jpeg"))).toBe(false);
    expect(await isHeic(file("%PDF-1.4\n", "menu.pdf", "application/pdf"))).toBe(false);
    expect(await isHeic(file("\0\0\0\x1cftypavif\0\0\0\0", "photo.avif", "image/avif"))).toBe(
      false,
    );
  });
});

describe("cappedSize", () => {
  it.each([
    [5712, 4284, 4096, 3072],
    [4032, 3024, 4032, 3024],
    [3024, 4032, 3024, 4032],
    [4284, 5712, 3072, 4096],
  ])("%i×%i becomes %i×%i", (width, height, w, h) => {
    expect(cappedSize(width, height)).toEqual({ width: w, height: h });
  });
});

describe("convertedName", () => {
  it("swaps the extension for .jpg", () => {
    expect(convertedName("IMG_5420.HEIC")).toBe("IMG_5420.jpg");
    expect(convertedName("photo")).toBe("photo.jpg");
  });
});
