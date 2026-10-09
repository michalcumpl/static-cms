import { validateSite } from "@webmio/model";
import type { LooseNodes } from "@webmio/model/testing";
import { TEMPLATE_RELEASES } from "@webmio/templates";
import { load } from "cheerio";
import { describe, expect, it } from "vitest";
import { type ImportedSite, readSite, type SourcePage, siteLanguage } from "./site.js";
import { FIXTURE_ORIGINS, type FixtureSite, fixtureText } from "./testing.js";

const LANGUAGES = ["cs", "sk", "en", "de"];
const BAKERY_PAGES = ["/", "/nase-pecivo/", "/o-nas/", "/kontakt.html", "/akce/"];

/** Fixture pages as the crawler would hand them over, with their linked and inline styles. */
function sourcePages(site: FixtureSite, paths: string[]): SourcePage[] {
  return paths.map((path) => {
    const html = fixtureText(site, path);
    const $ = load(html);
    const linked = $('link[rel="stylesheet"]').length ? [fixtureText(site, "/style.css")] : [];
    return {
      url: new URL(path, `${FIXTURE_ORIGINS[site]}/`).href,
      html,
      css: [
        ...linked,
        ...$("style")
          .toArray()
          .map((el) => $(el).text()),
      ],
    };
  });
}

/** The site read twice, as the admin does: for its images, then with every image "fetched". */
function imported(site: FixtureSite, paths: string[], lang = "cs"): ImportedSite {
  const pages = sourcePages(site, paths);
  const options = { languages: LANGUAGES, fallbackLanguage: lang };
  const first = readSite(pages, options);
  const files = new Map(first.images.map((ref, i) => [ref.id, `image-${i + 1}.jpg`]));
  return readSite(pages, { ...options, images: files });
}

type Nodes = LooseNodes;
const nodesOf = (site: ImportedSite) => site.document.nodes as unknown as Nodes;
const text = (value: { content: string } | undefined) => value?.content ?? "";

describe("reading a whole site", () => {
  const bakery = imported("bakery", BAKERY_PAGES);
  const nodes = nodesOf(bakery);
  const page = (slug: string) =>
    Object.values(nodes).find((n) => n.type === "page" && n.slug === slug);
  const blocksOf = (slug: string) => (page(slug).blocks.nodes as string[]).map((id) => nodes[id]);

  it("Bakery pages: slugs from the old addresses, home titled Úvod, in menu order", () => {
    const site = nodes[bakery.document.document_id];
    const pages = (site.pages.nodes as string[]).map((id) => [nodes[id].title, nodes[id].slug]);
    expect(pages).toEqual([
      ["Úvod", "uvod"],
      ["Naše pečivo", "nase-pecivo"],
      ["Náš příběh", "o-nas"],
      ["Letošní akce", "akce"],
      ["Kontakt", "kontakt"],
    ]);
    expect(site?.home_page_id).toBe(page("uvod")?.id);
  });

  it("Grouped menu: the source's group with its pages", () => {
    const site = nodes[bakery.document.document_id];
    const nav = nodes[site?.nav];
    const label = (id: string) => text(nodes[id]?.label);
    expect(
      (nav.items.nodes as string[]).map((id) =>
        nodes[id]?.type === "menu_group"
          ? [label(id), (nodes[id].items.nodes as string[]).map(label)]
          : label(id),
      ),
    ).toEqual(["Úvod", "Naše pečivo", ["O nás", ["Náš příběh", "Akce"]], "Kontakt"]);
  });

  it("opens the home page with a hero of the site's name, description and photo", () => {
    const [hero] = blocksOf("uvod");
    expect(hero?.type).toBe("hero");
    expect(text(hero?.heading)).toBe("Pekárna U Lípy");
    expect(text(hero?.text)).toBe(
      "Rodinná pekárna v Kutné Hoře: kváskový chléb, rohlíky a dorty na objednávku.",
    );
    expect(nodes[hero?.image.nodes[0]]).toMatchObject({ alt: "Bochník chleba na pultu" });
  });

  it("links texts to imported pages, and drops links to the old site's others", () => {
    const paragraph = Object.values(nodes).find(
      (n) => n.type === "paragraph" && text(n.content).includes("našem pečivu"),
    );
    const marks = (paragraph.content.marks as { node_id: string }[]).map((m) => nodes[m.node_id]);
    expect(marks.find((m) => m?.type === "internal_link")?.page_id).toBe(page("nase-pecivo")?.id);
  });

  it("Questions: in the FAQ collection, shown where they were", () => {
    const site = nodes[bakery.document.document_id];
    expect(site?.faqs.nodes).toHaveLength(3);
    const faq = blocksOf("uvod").find((b) => b?.type === "faq");
    expect(faq?.show).toBe("chosen");
    expect(faq.chosen.nodes).toHaveLength(3);
    expect(bakery.report.questions).toBe(3);
  });

  it("sets the logo, favicon, business and theme", () => {
    const site = nodes[bakery.document.document_id];
    const ref = (value: { nodes: string[] }) =>
      bakery.images.find((i) => nodes[value.nodes[0] ?? ""]?.src && i);
    expect(ref(site.logo)).toBeDefined();
    expect(bakery.images.find((i) => i.role === "logo")?.candidates).toEqual([
      "https://pekarna-ulipy.cz/images/logo.svg",
    ]);
    expect(bakery.images.find((i) => i.role === "favicon")?.candidates).toEqual([
      "https://pekarna-ulipy.cz/images/touch-icon.png",
    ]);
    const business = nodes[site?.business];
    expect(business).toMatchObject({ name: "Pekárna U Lípy", business_type: "Bakery" });
    expect(nodes[business.locations.nodes[0]]).toMatchObject({ phone: "+420321123456" });
    expect(nodes[site?.theme]).toMatchObject({
      font_heading: "playfair",
      color_background: "#fffaf3",
    });
  });

  it("records each page's old path", () => {
    expect(bakery.origins.map((o) => [nodes[o.pageId]?.slug, o.path])).toEqual([
      ["uvod", "/"],
      ["nase-pecivo", "/nase-pecivo/"],
      ["o-nas", "/o-nas/"],
      ["akce", "/akce/"],
      ["kontakt", "/kontakt.html"],
    ]);
  });

  it("gives a document whose only errors are images without descriptions", () => {
    // Sizes come with the upload; until then any size stands in, as `createSiteProject` does.
    const sized = structuredClone(bakery.document) as unknown as { nodes: Nodes };
    for (const node of Object.values(sized.nodes)) {
      if (node.type === "image") Object.assign(node, { width: 800, height: 600 });
    }
    const problems = validateSite(sized, { templates: TEMPLATE_RELEASES }).problems;
    expect(problems.filter((p) => p.category === "structure")).toEqual([]);
    const errors = new Set(problems.filter((p) => p.severity === "error").map((p) => p.code));
    expect([...errors]).toEqual(["missing-alt"]);
  });

  it("reports what it imported and left out", () => {
    expect(bakery.report).toMatchSnapshot();
  });

  it("leaves out images that weren't fetched, and their blocks when they hold nothing else", () => {
    const pages = sourcePages("bakery", BAKERY_PAGES);
    const site = readSite(pages, {
      languages: LANGUAGES,
      fallbackLanguage: "cs",
      images: new Map(),
    });
    const types = Object.values(site.document.nodes).map((n) => n.type);
    expect(types).not.toContain("image");
    expect(types).not.toContain("gallery");
    expect(site.report.leftOut.filter((l) => l.reason === "image")).toHaveLength(
      site.images.length,
    );
    expect(validateSite(site.document).problems.filter((p) => p.severity === "error")).toEqual([]);
  });
});

describe("other sites", () => {
  it("reads a one-page English site", () => {
    const studio = imported("studio", ["/"], "cs");
    expect(studio.lang).toBe("en");
    expect(studio.name).toBe("Northlight Studio");
    const nodes = nodesOf(studio);
    const pages = Object.values(nodes).filter((n) => n.type === "page");
    expect(pages.map((p) => [p.title, p.slug])).toEqual([["Home", "home"]]);
    const structure = validateSite(studio.document).problems.filter(
      (p) => p.category === "structure",
    );
    expect(structure).toEqual([]);
    expect(studio.report.leftOut).toContainEqual({
      reason: "language",
      detail: "https://northlight.example/cs/",
    });
  });

  it("Czech site with English pages: Czech only, the English version reported", () => {
    const bakery = imported("bakery", ["/"]);
    expect(bakery.lang).toBe("cs");
    expect(bakery.report.leftOut).toContainEqual({
      reason: "language",
      detail: "https://pekarna-ulipy.cz/en/",
    });
  });

  it("doesn't report the imported language as another one, and says each left-out thing once", () => {
    const html = `<html lang="en"><body><header><nav><a href="/">Home</a><a href="/en/contacts">Contacts</a></nav>
      <div class="lang"><a href="/cs/">CZ</a><a href="/en/">EN</a></div></header>
      <main><h1>Law firm</h1><p>Text.</p><form></form><form></form></main></body></html>`;
    const site = readSite([{ url: "https://mares.example/", html, css: [] }], {
      languages: LANGUAGES,
      fallbackLanguage: "cs",
    });
    expect(site.report.leftOut).toEqual([
      { reason: "language", detail: "https://mares.example/cs/" },
      { reason: "form", page: "/", detail: "" },
    ]);
  });

  it("takes the fallback language when the source's isn't offered", () => {
    expect(siteLanguage('<html lang="pl">', LANGUAGES, "cs")).toBe("cs");
    expect(siteLanguage('<html lang="DE-at">', LANGUAGES, "cs")).toBe("de");
    expect(siteLanguage("<html>", LANGUAGES, "en")).toBe("en");
  });
});
