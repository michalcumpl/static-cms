import { unzipSync } from "fflate";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  editableDemoSite,
  homeListedSecondSite,
  loadDemoMedia,
  loadDemoSite,
} from "../test/fixtures.js";
import { exportSite, type SiteFiles, zipFiles } from "./index.js";

const decode = (bytes: Uint8Array | undefined) => new TextDecoder().decode(bytes);

function exported(input: unknown = loadDemoSite(), basePath?: string) {
  const result = exportSite(input, loadDemoMedia(), basePath ? { basePath } : {});
  if (!result.ok) throw new Error(JSON.stringify(result.problems, null, 2));
  return result;
}

describe("exportSite", () => {
  it("lays out pages, stylesheet, images and sitemap", () => {
    const { files, warnings } = exported();
    expect([...files.keys()]).toEqual([
      "assets/images/hero.png",
      "assets/style.css",
      "index.html",
      "kontakt/index.html",
      "sitemap.xml",
    ]);
    expect(warnings).toEqual([]);
    expect(files.get("assets/images/hero.png")).toEqual(loadDemoMedia().get("hero.png"));
    expect(decode(files.get("kontakt/index.html"))).toContain(
      "<title>Kontakt – Pekárna U Lípy</title>",
    );
  });

  it("keeps the layout and prefixes links for a subdirectory", () => {
    const { files } = exported(loadDemoSite(), "/web/");
    expect([...files.keys()]).toContain("kontakt/index.html");
    expect(decode(files.get("index.html"))).toContain(
      '<link rel="stylesheet" href="/web/assets/style.css">',
    );
  });

  it("writes the home page to index.html when it is listed second", () => {
    const { files } = exported(homeListedSecondSite());
    expect([...files.keys()]).toEqual([
      "assets/images/hero.png",
      "assets/style.css",
      "index.html",
      "kontakt/index.html",
      "sitemap.xml",
    ]);
    expect(decode(files.get("index.html"))).toContain("<title>Pekárna U Lípy</title>");
    expect(files.has("uvod/index.html")).toBe(false);
  });

  it("fails naming a referenced image whose bytes are missing", () => {
    const result = exportSite(loadDemoSite(), new Map());
    expect(result).toEqual({
      ok: false,
      problems: [expect.objectContaining({ code: "missing-media", nodeId: "image_hero" })],
    });
    expect(result.ok ? "" : result.problems[0]?.message).toContain("hero.png");
  });

  it("leaves out media no node uses", () => {
    const media = loadDemoMedia();
    media.set("unused.png", new Uint8Array([1, 2, 3]));
    const result = exportSite(loadDemoSite(), media);
    expect(
      result.ok && [...result.files.keys()].filter((k) => k.startsWith("assets/images/")),
    ).toEqual(["assets/images/hero.png"]);
  });

  it("leaves out images of unreachable nodes", () => {
    const { doc, nodes } = editableDemoSite();
    nodes.hero_1.image.nodes = [];
    const result = exportSite(doc, new Map());
    expect(result.ok && [...result.files.keys()]).not.toContain("assets/images/hero.png");
  });

  it("lists every page's absolute URL in the sitemap", () => {
    const { doc, nodes } = editableDemoSite();
    nodes.site_1.base_url = "https://anideti.cz/";
    expect(decode(exported(doc).files.get("sitemap.xml"))).toBe(
      `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url><loc>https://anideti.cz/</loc></url>
  <url><loc>https://anideti.cz/kontakt/</loc></url>
</urlset>
`,
    );
  });

  it("lists the home page at the base URL only, never at its slug", () => {
    const sitemap = decode(exported(homeListedSecondSite()).files.get("sitemap.xml"));
    expect(sitemap).toContain("<loc>https://pekarna-ulipy.example/</loc>");
    expect(sitemap).toContain("<loc>https://pekarna-ulipy.example/kontakt/</loc>");
    expect(sitemap).not.toContain("/uvod/");
  });

  it("omits the sitemap and warns when there is no base URL", () => {
    const { doc, nodes } = editableDemoSite();
    nodes.site_1.base_url = "";
    const { files, warnings } = exported(doc);
    expect(files.has("sitemap.xml")).toBe(false);
    expect(warnings).toEqual([
      expect.objectContaining({ severity: "warning", code: "no-base-url", nodeId: "site_1" }),
    ]);
  });

  it("returns validation errors instead of files", () => {
    const { doc, nodes } = editableDemoSite();
    nodes.page_x = { ...nodes.page_contact, id: "page_x" };
    nodes.site_1.pages.nodes.push("page_x");
    const result = exportSite(doc, loadDemoMedia());
    expect(result.ok).toBe(false);
    expect(result.ok ? [] : result.problems.map((p) => p.code)).toEqual(["duplicate-slug"]);
  });
});

describe("zipFiles", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  function zipAt(time: string, files: SiteFiles) {
    vi.useFakeTimers({ now: new Date(time) });
    return zipFiles(files);
  }

  it("puts the files at the archive root", () => {
    const { files } = exported();
    const unzipped = unzipSync(zipFiles(files));
    expect(Object.keys(unzipped).sort()).toEqual([...files.keys()]);
    for (const [path, bytes] of files) expect(unzipped[path], path).toEqual(bytes);
  });

  it("produces byte-identical archives at different times", () => {
    const first = zipAt("2026-01-01T08:00:00Z", exported().files);
    const second = zipAt("2031-07-15T23:59:59Z", exported().files);
    expect(second).toEqual(first);
  });

  it("does not depend on the order files were added", () => {
    const { files } = exported();
    const reversed = new Map([...files.entries()].reverse());
    expect(zipFiles(reversed)).toEqual(zipFiles(files));
  });
});
