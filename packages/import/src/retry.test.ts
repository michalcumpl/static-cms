import type { Weekday } from "@webmio/model";
import { load } from "cheerio";
import { describe, expect, it } from "vitest";
import { type RetryPagesOptions, readPagesForRetry } from "./retry.js";
import { readSite, type SourcePage, versionHome } from "./site.js";
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
    lang: "cs",
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

  it("maps a retried page's structures to blocks: the map, and the hours the business has", () => {
    const blocks = (hours: Weekday[]) => {
      const read = readPagesForRetry(
        [source("/kontakt.html")],
        options({ hoursDays: new Set(hours) }),
      );
      const [page] = read.pages;
      const ids = (page?.page.blocks as { nodes: string[] } | undefined)?.nodes ?? [];
      return ids.map((id) => page?.nodes.find((n) => n.id === id)?.type);
    };
    expect(blocks(["mon", "tue", "wed", "thu", "fri", "sat"])).toEqual(
      expect.arrayContaining(["contact", "opening_hours"]),
    );
    expect(blocks([])).not.toContain("opening_hours");
  });
});

describe("reading another language's questions", () => {
  const english = (path: string) => ({ ...source(path), url: new URL(path, `${origin}/`).href });

  it("writes them onto the items given, in order, and makes no FAQ items", () => {
    const asked: [string, number, number][] = [];
    const read = readPagesForRetry([english("/en/")], {
      ...options({ lang: "en" }),
      questions: (url, index, count) => {
        asked.push([url, index, count]);
        return ["faq_a", "faq_b", "faq_c"];
      },
    });
    expect(asked).toEqual([[`${origin}/en/`, 0, 3]]);
    const [page] = read.pages;
    expect(page?.questions).toEqual([]);
    expect(page?.nodes.filter((n) => n.type === "faq_item")).toEqual([]);
    expect(
      page?.translated.map((n) => [n.id, (n.question as { content: string }).content]),
    ).toEqual([
      ["faq_a", "Do you bake at the weekend?"],
      ["faq_b", "Can I order a cake?"],
      ["faq_c", "Do you have gluten-free bread?"],
    ]);
    const faq = page?.nodes.find((n) => n.type === "faq");
    const refs = (faq?.chosen as { nodes: string[] } | undefined)?.nodes ?? [];
    expect(refs.map((id) => page?.nodes.find((n) => n.id === id)?.item_id)).toEqual([
      "faq_a",
      "faq_b",
      "faq_c",
    ]);
  });

  it("makes them text when there are no items to translate", () => {
    const read = readPagesForRetry([english("/en/contact.html")], {
      ...options({ lang: "en" }),
      questions: () => undefined,
    });
    const [page] = read.pages;
    expect(page?.questions).toEqual([]);
    expect(page?.translated).toEqual([]);
    expect(page?.nodes.some((n) => n.type === "faq_item" || n.type === "faq")).toBe(false);
    const content = (id: string) => {
      const node = page?.nodes.find((n) => n.id === id);
      const text = (node?.content as { content: string } | undefined)?.content ?? "";
      return node?.type === "subheading" ? `${"#".repeat(Number(node.level))} ${text}` : text;
    };
    const texts = page?.nodes
      .filter((n) => n.type === "rich_text")
      .map((n) => (n.body as { nodes: string[] }).nodes.map(content));
    expect(texts).toContainEqual([
      "## Before you visit",
      "### Can I pay by card?",
      "Yes, and in cash.",
      "### Is there parking nearby?",
      "On the square, free for an hour.",
    ]);
  });
});

describe("reading another language's home page", () => {
  it("titles it as the import does, and gives it a hero with the site's name in the language", () => {
    const home = source("/en/");
    expect(versionHome(home, "en")).toEqual({
      name: "U Lípy Bakery",
      description: "A family bakery in Kutná Hora: sourdough bread, rolls and cakes to order.",
      tagline: "A family bakery in Kutná Hora: sourdough bread, rolls and cakes to order.",
      businessName: "U Lípy Bakery",
      homeTitle: "Home",
    });
    const read = readPagesForRetry([home], {
      ...options({ lang: "en", takenSlugs: [] }),
      home: { url: home.url, title: "Home", heading: "U Lípy Bakery", text: "A family bakery." },
      questions: () => undefined,
    });
    const [page] = read.pages;
    expect([page?.page.title, page?.page.slug]).toEqual(["Home", "home"]);
    const first = page?.nodes.find(
      (n) => n.id === (page.page.blocks as { nodes: string[] }).nodes[0],
    );
    expect(first?.type).toBe("hero");
    expect((first?.heading as { content: string } | undefined)?.content).toBe("U Lípy Bakery");
  });
});

describe("another language's home page, read as the import reads a home page", () => {
  it("takes a photo filling a panel for the hero, and the footer's award logos", () => {
    const url = `${origin}/en/`;
    const html = `<html lang="en"><body><header><a href="/en/">Firm</a></header>
      <main><div class="panel"></div><h1>Law firm</h1><p>We advise companies.</p></main>
      <div class="a-footer"><img src="/award-a.png" alt="Finance Monthly"><img src="/award-b.png" alt="ACQ5"></div>
      </body></html>`;
    const css = [".panel { background: url(/painting.jpg) center / cover; }"];
    const home = { url, html, css };
    const read = readPagesForRetry([home], {
      ...options({ lang: "en", takenSlugs: [] }),
      home: { url, title: "Home", heading: "Firm", text: "" },
      questions: () => undefined,
      images: new Map([
        [`${origin}/painting.jpg`, "painting.jpg"],
        [`${origin}/award-a.png`, "a.png"],
        [`${origin}/award-b.png`, "b.png"],
      ]),
    });
    const [page] = read.pages;
    const blockIds = (page?.page.blocks as { nodes: string[] } | undefined)?.nodes ?? [];
    const types = blockIds.map((id) => page?.nodes.find((n) => n.id === id)?.type);
    expect(types[0]).toBe("hero");
    expect(types.at(-1)).toBe("logos");
    const images = page?.nodes.filter((n) => n.type === "image").map((n) => n.src);
    expect(images).toEqual(["painting.jpg", "a.png", "b.png"]);
  });
});
