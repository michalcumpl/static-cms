import { load } from "cheerio";
import { describe, expect, it } from "vitest";
import { type RetryPagesOptions, readPagesForRetry } from "./retry.js";
import { readSite, type SourcePage } from "./site.js";
import { FIXTURE_ORIGINS, fixtureText } from "./testing.js";

const origin = FIXTURE_ORIGINS.bakery;
const source = (path: string): SourcePage => {
  const html = fixtureText("bakery", path);
  const linked = load(html)('link[rel="stylesheet"]').length
    ? [fixtureText("bakery", "/style.css")]
    : [];
  return { url: new URL(path, `${origin}/`).href, html, css: linked };
};

// The import read three pages; the retry reads what it missed.
const imported = readSite([source("/"), source("/nase-pecivo/"), source("/o-nas/")], {
  languages: ["cs"],
  fallbackLanguage: "cs",
});
const nodes = imported.document.nodes as Record<string, { type: string; slug?: string }>;
const pageOf = (path: string) => imported.origins.find((o) => o.path === path)?.pageId ?? "";

function options(extra: Partial<RetryPagesOptions> = {}): RetryPagesOptions {
  let n = 0;
  return {
    siteName: imported.name,
    homeUrl: `${origin}/`,
    takenSlugs: Object.values(nodes).flatMap((node) =>
      node.type === "page" ? [node.slug ?? ""] : [],
    ),
    knownPages: new Map(
      imported.origins.map((o) => [
        new URL(o.path, `${origin}/`).href,
        { pageId: o.pageId, slug: (nodes[o.pageId]?.slug as string) ?? "" },
      ]),
    ),
    newId: (type) => `r${++n}_${type}`,
    ...extra,
  };
}

describe("reading pages for a retry", () => {
  it("never takes a slug the document has, nor a node ID", () => {
    const read = readPagesForRetry([source("/akce/"), source("/kontakt.html")], {
      ...options(),
      // The owner made a page called "akce" meanwhile.
      takenSlugs: [...options().takenSlugs, "akce"],
    });
    expect(read.summaries).toEqual([
      { title: "Letošní akce", oldPath: "/akce/", slug: "akce-2" },
      { title: "Kontakt", oldPath: "/kontakt.html", slug: "kontakt" },
    ]);
    const ids = read.pages.flatMap((p) => [p.page.id, ...p.nodes.map((n) => n.id)]);
    expect(new Set(ids).size).toBe(ids.length);
    for (const id of ids) expect(nodes[id]).toBeUndefined();
    // Each page's blocks are among its nodes.
    for (const page of read.pages) {
      const owned = new Set(page.nodes.map((n) => n.id));
      for (const block of (page.page.blocks as { nodes: string[] }).nodes)
        expect(owned.has(block)).toBe(true);
    }
  });

  it("links to the document's imported pages, and names the pages showing each image", () => {
    const read = readPagesForRetry(
      [
        {
          ...source("/"),
          existing: { pageId: pageOf("/"), slug: "", title: "Úvod" },
        },
      ],
      options(),
    );
    const [home] = read.pages;
    expect(home?.page.id).toBe(pageOf("/"));
    const internal = home?.nodes.filter((n) => n.type === "internal_link");
    expect(internal?.map((n) => n.page_id)).toContain(pageOf("/nase-pecivo/"));
    // Questions go to the FAQ collection; a page read again isn't a new page.
    expect(home?.questions.length).toBeGreaterThan(0);
    for (const id of home?.questions ?? [])
      expect(home?.nodes.find((n) => n.id === id)?.type).toBe("faq_item");
    expect(read.summaries).toEqual([]);
    expect(read.images.find((r) => r.id.endsWith("/images/chleb.jpg"))?.pages).toEqual(["/"]);
  });

  it("places only the fetched images, and reports the others", () => {
    const first = readPagesForRetry([source("/kontakt.html")], options());
    const bread = first.images.find((r) => r.id.endsWith("/images/chleb.jpg"));
    expect(first.pages[0]?.nodes.some((n) => n.type === "image")).toBe(false);
    const read = readPagesForRetry(
      [source("/kontakt.html")],
      options({ images: new Map([[bread?.id ?? "", "media/chleb.jpg"]]) }),
    );
    expect(read.pages[0]?.nodes.filter((n) => n.type === "image").map((n) => n.src)).toEqual([
      "media/chleb.jpg",
    ]);
    expect(read.leftOut.filter((l) => l.reason === "image")).toEqual([]);
  });
});
