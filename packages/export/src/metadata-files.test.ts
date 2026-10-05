import { iconFile, shareFile, usedMediaFiles } from "@webmio/model";
import { editableDemoSite, type LooseNodes, loadDemoMedia } from "@webmio/model/testing";
import { describe, expect, it } from "vitest";
import { type ExportOptions, exportSite } from "./index.js";

const list = (nodes: string[]) => ({ nodes, marks: [], annotations: [] });
const bytes = (text: string) => new TextEncoder().encode(text);

function addImage(nodes: LooseNodes, id: string, src: string) {
  nodes[id] = {
    id,
    type: "image",
    src,
    alt: "Obrázek",
    decorative: false,
    width: 2000,
    height: 1500,
  };
  return id;
}

/** The demo site with a favicon and a site share image, and every file it uses. */
function siteWithMetadata() {
  const { doc, nodes } = editableDemoSite();
  nodes.site_1.favicon = list([addImage(nodes, "image_logo", "logo-1a2b")]);
  nodes.site_1.share_image = list([addImage(nodes, "image_pult", "pult-3f9a")]);
  const media = loadDemoMedia();
  for (const size of [32, 180, 512] as const) {
    media.set(iconFile("logo-1a2b", size), bytes(`png ${size}`));
  }
  media.set(shareFile("pult-3f9a"), bytes("jpeg pult"));
  return { doc, nodes, media };
}

function exported(doc: unknown, media: Map<string, Uint8Array>, options: ExportOptions = {}) {
  const result = exportSite(doc, media, options);
  if (!result.ok) throw new Error(result.problems.map((p) => p.message).join("\n"));
  return result;
}

const text = (file: Uint8Array | undefined) => new TextDecoder().decode(file);

describe("favicon and share files", () => {
  it("puts the favicon's icons at the root, with the 32-pixel one wrapped as an ICO", () => {
    const { doc, media } = siteWithMetadata();
    const { files } = exported(doc, media);
    const ico = files.get("favicon.ico");
    expect(ico?.slice(0, 6)).toEqual(new Uint8Array([0, 0, 1, 0, 1, 0]));
    expect(text(ico?.slice(22))).toBe("png 32");
    expect(text(files.get("apple-touch-icon.png"))).toBe("png 180");
    expect(text(files.get("icon-512.png"))).toBe("png 512");
    expect([...files.keys()].some((path) => path.includes("logo-1a2b"))).toBe(false);
  });

  it("puts share files under assets/images, without variants of the image", () => {
    const { doc, media } = siteWithMetadata();
    const { files } = exported(doc, media);
    expect(text(files.get("assets/images/pult-3f9a-share.jpg"))).toBe("jpeg pult");
    expect([...files.keys()].filter((path) => path.includes("pult-3f9a"))).toEqual([
      "assets/images/pult-3f9a-share.jpg",
    ]);
  });

  it("includes each page's own share image", () => {
    const { doc, nodes, media } = siteWithMetadata();
    nodes.page_contact.share_image = list([addImage(nodes, "image_mapa", "mapa-77aa")]);
    media.set(shareFile("mapa-77aa"), bytes("jpeg mapa"));
    expect(exported(doc, media).files.has("assets/images/mapa-77aa-share.jpg")).toBe(true);
  });

  it("fails naming a missing icon file", () => {
    const { doc, media } = siteWithMetadata();
    media.delete(iconFile("logo-1a2b", 180));
    const result = exportSite(doc, media);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.problems).toEqual([
      expect.objectContaining({
        code: "missing-media",
        nodeId: "image_logo",
        message: "No file was supplied for logo-1a2b-icon-180.png.",
      }),
    ]);
  });

  it("leaves out supplied files the site doesn't use", () => {
    const { doc, nodes, media } = siteWithMetadata();
    nodes.site_1.favicon = list([]);
    const { files } = exported(doc, media);
    expect(files.has("favicon.ico")).toBe(false);
    expect(files.has("icon-512.png")).toBe(false);
  });

  it("exports exactly the media files usedMediaFiles lists", () => {
    const { doc, media } = siteWithMetadata();
    const used = usedMediaFiles(doc);
    const onlyUsed = new Map([...media].filter(([name]) => used.includes(name)));
    expect(exportSite(doc, onlyUsed).ok).toBe(true);
    for (const name of used) {
      const without = new Map(onlyUsed);
      without.delete(name);
      expect(exportSite(doc, without).ok, name).toBe(false);
    }
  });
});
