import { describe, expect, it } from "vitest";
import {
  iconFile,
  imageFile,
  imageVariants,
  shareFile,
  srcVariant,
  usedMediaFiles,
} from "./images.js";
import { editableDemoSite, loadDemoSite } from "./testing.js";

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

describe("usedMediaFiles", () => {
  it("lists the demo site's one variant", () => {
    expect(usedMediaFiles(loadDemoSite())).toEqual(["hero.png-320.webp"]);
  });

  it("lists every variant of reachable images, each once, sorted", () => {
    const { doc, nodes } = editableDemoSite();
    nodes.image_hero.src = "pult-3f9a2c1d";
    nodes.image_hero.width = 1000;
    nodes.image_orphan = { ...nodes.image_hero, id: "image_orphan", src: "orphan-00000000" };
    expect(usedMediaFiles(doc)).toEqual([
      imageFile("pult-3f9a2c1d", 1000),
      imageFile("pult-3f9a2c1d", 480),
      imageFile("pult-3f9a2c1d", 960),
    ]);
  });

  it("lists the site logo's variants", () => {
    const { doc, nodes } = editableDemoSite();
    nodes.page_home.blocks.nodes = nodes.page_home.blocks.nodes.filter(
      (id: string) => id !== "hero_1",
    );
    nodes.brand = {
      ...nodes.image_hero,
      id: "brand",
      src: "pekarna-7c1e",
      width: 600,
      height: 200,
    };
    nodes.site_1.logo = { nodes: ["brand"], marks: [], annotations: [] };
    expect(usedMediaFiles(doc)).toEqual(["pekarna-7c1e-480.webp", "pekarna-7c1e-600.webp"]);
  });

  it("lists the favicon's icons and share files instead of their variants", () => {
    const { doc, nodes } = editableDemoSite();
    const image = (id: string, src: string) => ({
      id,
      type: "image",
      src,
      alt: "",
      decorative: false,
      width: 2000,
      height: 2000,
    });
    const list = (ids: string[]) => ({ nodes: ids, marks: [], annotations: [] });
    nodes.image_logo = image("image_logo", "logo-1a2b");
    nodes.image_pult = image("image_pult", "pult-3f9a");
    nodes.image_mapa = image("image_mapa", "mapa-77aa");
    nodes.site_1.favicon = list(["image_logo"]);
    nodes.site_1.share_image = list(["image_pult"]);
    nodes.page_contact.share_image = list(["image_mapa"]);
    expect(usedMediaFiles(doc)).toEqual([
      "hero.png-320.webp",
      iconFile("logo-1a2b", 180),
      iconFile("logo-1a2b", 32),
      iconFile("logo-1a2b", 512),
      shareFile("mapa-77aa"),
      shareFile("pult-3f9a"),
    ]);
  });

  it("lists exactly the spec's example", () => {
    const { doc, nodes } = editableDemoSite();
    const image = (id: string, src: string) => ({
      id,
      type: "image",
      src,
      alt: "",
      decorative: false,
      width: 800,
      height: 800,
    });
    nodes.image_logo = image("image_logo", "logo-1a2b");
    nodes.image_pult = image("image_pult", "pult-3f9a");
    nodes.site_1.favicon = { nodes: ["image_logo"], marks: [], annotations: [] };
    nodes.site_1.share_image = { nodes: ["image_pult"], marks: [], annotations: [] };
    nodes.hero_1.image.nodes = [];
    expect(usedMediaFiles(doc)).toEqual([
      "logo-1a2b-icon-180.png",
      "logo-1a2b-icon-32.png",
      "logo-1a2b-icon-512.png",
      "pult-3f9a-share.jpg",
    ]);
  });

  it("tolerates broken documents", () => {
    expect(usedMediaFiles(null)).toEqual([]);
    expect(usedMediaFiles({ document_id: "x", nodes: {} })).toEqual([]);
  });
});
