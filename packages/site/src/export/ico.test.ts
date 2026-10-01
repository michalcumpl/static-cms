import { describe, expect, it } from "vitest";
import { pngToIco } from "./ico.js";

const PNG_SIGNATURE = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];

describe("pngToIco", () => {
  it("writes the header and one directory entry pointing at the PNG", () => {
    const png = new Uint8Array([...PNG_SIGNATURE, 1, 2, 3, 4]);
    const ico = pngToIco(png, 32);
    const view = new DataView(ico.buffer);
    expect(view.getUint16(0, true)).toBe(0);
    expect(view.getUint16(2, true)).toBe(1);
    expect(view.getUint16(4, true)).toBe(1);
    expect(view.getUint8(6)).toBe(32);
    expect(view.getUint8(7)).toBe(32);
    expect(view.getUint16(10, true)).toBe(1);
    expect(view.getUint16(12, true)).toBe(32);
    expect(view.getUint32(14, true)).toBe(png.length);
    expect(view.getUint32(18, true)).toBe(22);
    expect(ico.length).toBe(22 + png.length);
    expect(ico.slice(22)).toEqual(png);
  });

  it("writes 256 pixels as 0, as the format requires", () => {
    const ico = pngToIco(new Uint8Array(PNG_SIGNATURE), 256);
    expect(ico[6]).toBe(0);
    expect(ico[7]).toBe(0);
  });

  it("refuses sizes the format can't hold", () => {
    expect(() => pngToIco(new Uint8Array(PNG_SIGNATURE), 512)).toThrow();
    expect(() => pngToIco(new Uint8Array(PNG_SIGNATURE), 0)).toThrow();
  });
});
