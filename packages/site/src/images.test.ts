import { describe, expect, it } from "vitest";
import { imageFile, imageVariants, srcVariant, usedImageFiles } from "./images.js";
import { editableDemoSite, loadDemoSite } from "./test/fixtures.js";

describe("imageVariants", () => {
  it.each([
    [4032, [480, 960, 1600, 2400]],
    [2400, [480, 960, 1600, 2400]],
    [1000, [480, 960, 1000]],
    [960, [480, 960]],
    [480, [480]],
    [320, [320]],
    [0, []],
  ])("an image %i px wide gets %j", (width, expected) => {
    expect(imageVariants(width)).toEqual(expected);
  });
});

describe("srcVariant", () => {
  it("is the largest variant up to 1600 px", () => {
    expect(srcVariant(4032)).toBe(1600);
    expect(srcVariant(1000)).toBe(1000);
    expect(srcVariant(320)).toBe(320);
  });
});

describe("usedImageFiles", () => {
  it("lists the demo site's one variant", () => {
    expect(usedImageFiles(loadDemoSite())).toEqual(["hero.png-320.webp"]);
  });

  it("lists every variant of reachable images, each once, sorted", () => {
    const { doc, nodes } = editableDemoSite();
    nodes.image_hero.src = "pult-3f9a2c1d";
    nodes.image_hero.width = 1000;
    nodes.image_orphan = { ...nodes.image_hero, id: "image_orphan", src: "orphan-00000000" };
    expect(usedImageFiles(doc)).toEqual([
      imageFile("pult-3f9a2c1d", 1000),
      imageFile("pult-3f9a2c1d", 480),
      imageFile("pult-3f9a2c1d", 960),
    ]);
  });

  it("tolerates broken documents", () => {
    expect(usedImageFiles(null)).toEqual([]);
    expect(usedImageFiles({ document_id: "x", nodes: {} })).toEqual([]);
  });
});
