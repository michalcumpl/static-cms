import { describe, expect, it } from "vitest";
import { clampFrame, fitShape, moveFrame, nextTurn, resizeFrame, turnFrame } from "./crop";
import { galleryFitOf, hasFocalPoint, shapeOf } from "./image-slots";

const picture: [number, number] = [1600, 1200];

describe("fitShape", () => {
  it("is the whole picture when free, and the largest centred frame of a shape", () => {
    expect(fitShape(picture, undefined)).toEqual({ x: 0, y: 0, width: 1600, height: 1200 });
    expect(fitShape(picture, 1)).toEqual({ x: 200, y: 0, width: 1200, height: 1200 });
    expect(fitShape(picture, 16 / 9)).toEqual({ x: 0, y: 150, width: 1600, height: 900 });
    expect(fitShape([900, 1600], 4 / 3)).toEqual({ x: 0, y: 463, width: 900, height: 675 });
  });
});

describe("clampFrame", () => {
  it("moves a frame back inside and shrinks one larger than the picture", () => {
    expect(clampFrame({ x: 1500, y: -50, width: 400, height: 300 }, picture, undefined)).toEqual({
      x: 1200,
      y: 0,
      width: 400,
      height: 300,
    });
    expect(clampFrame({ x: 0, y: 0, width: 3000, height: 100 }, picture, undefined)).toMatchObject({
      width: 1600,
    });
  });

  it("keeps at least 64 pixels on each side", () => {
    expect(clampFrame({ x: 10, y: 10, width: 20, height: 5 }, picture, undefined)).toMatchObject({
      width: 64,
      height: 64,
    });
    expect(clampFrame({ x: 10, y: 10, width: 20, height: 20 }, picture, 4 / 3)).toMatchObject({
      width: 85,
      height: 64,
    });
  });

  it("puts a frame into its shape around its centre", () => {
    const square = clampFrame({ x: 400, y: 300, width: 800, height: 400 }, picture, 1);
    expect(square).toEqual({ x: 400, y: 100, width: 800, height: 800 });
  });
});

describe("moveFrame", () => {
  it("stops at the edges", () => {
    const frame = { x: 100, y: 100, width: 400, height: 300 };
    expect(moveFrame(frame, -500, 50, picture)).toEqual({ ...frame, x: 0, y: 150 });
    expect(moveFrame(frame, 5000, 5000, picture)).toEqual({ ...frame, x: 1200, y: 900 });
  });
});

describe("resizeFrame", () => {
  const frame = { x: 400, y: 300, width: 800, height: 600 };

  it("drags a free corner and keeps the opposite one", () => {
    expect(resizeFrame(frame, "se", 100, -100, picture, undefined)).toEqual({
      x: 400,
      y: 300,
      width: 900,
      height: 500,
    });
    expect(resizeFrame(frame, "nw", -100, 50, picture, undefined)).toEqual({
      x: 300,
      y: 350,
      width: 900,
      height: 550,
    });
  });

  it("Frame kept in shape: a 4:3 corner dragged past the edge stops there, still 4:3", () => {
    const result = resizeFrame(frame, "se", 2000, 2000, picture, 4 / 3);
    expect(result).toMatchObject({ x: 400, y: 300 });
    expect(result.x + result.width).toBeLessThanOrEqual(1600);
    expect(result.y + result.height).toBeLessThanOrEqual(1200);
    expect(result.width / result.height).toBeCloseTo(4 / 3, 1);
    expect(result).toEqual({ x: 400, y: 300, width: 1200, height: 900 });
  });

  it("drags a shaped edge: the other side changes around the middle", () => {
    const result = resizeFrame(frame, "e", -200, 0, picture, 4 / 3);
    expect(result).toEqual({ x: 400, y: 375, width: 600, height: 450 });
  });

  it("stops at the minimum size", () => {
    expect(resizeFrame(frame, "se", -5000, -5000, picture, undefined)).toEqual({
      x: 400,
      y: 300,
      width: 64,
      height: 64,
    });
  });
});

describe("turnFrame", () => {
  it("turns a frame with the picture, and four turns bring it back", () => {
    const frame = { x: 100, y: 200, width: 400, height: 300 };
    const right = turnFrame(frame, picture, true);
    // The 1600 × 1200 picture becomes 1200 × 1600; the frame's top left was 200 from the top.
    expect(right).toEqual({ x: 700, y: 100, width: 300, height: 400 });
    expect(turnFrame(right, [1200, 1600], false)).toEqual(frame);
    let turned = frame;
    let size: [number, number] = picture;
    for (let i = 0; i < 4; i++) {
      turned = turnFrame(turned, size, true);
      size = [size[1], size[0]];
    }
    expect(turned).toEqual(frame);
  });

  it("counts quarter turns", () => {
    expect(nextTurn(0, true)).toBe(90);
    expect(nextTurn(0, false)).toBe(270);
    expect(nextTurn(270, true)).toBe(0);
  });
});

describe("shapeOf", () => {
  it("gives each block's shape, and none where the image keeps its own", () => {
    expect(shapeOf("gallery_item", "fill")).toBe(4 / 3);
    expect(shapeOf("gallery_item", "whole")).toBeUndefined();
    expect(shapeOf("card")).toBe(4 / 3);
    expect(shapeOf("project")).toBe(16 / 10);
    expect(shapeOf("person")).toBe(1);
    expect(shapeOf("testimonial")).toBe(1);
    expect(shapeOf("share_image")).toBe(1200 / 630);
    for (const type of ["hero", "slide", "text_with_image", "logo_item"]) {
      expect(shapeOf(type), type).toBeUndefined();
    }
  });

  it("finds a gallery photo's gallery look", () => {
    const doc = {
      document_id: "site_1",
      nodes: {
        gallery_1: { type: "gallery", image_fit: "whole", items: { nodes: ["item_1"] } },
        item_1: { type: "gallery_item" },
      },
    };
    expect(galleryFitOf(doc as never, "item_1")).toBe("whole");
  });

  it("has no focal point for logos and the site's images", () => {
    expect(hasFocalPoint("logo_item")).toBe(false);
    expect(hasFocalPoint("site")).toBe(false);
    expect(hasFocalPoint("hero")).toBe(true);
  });
});
