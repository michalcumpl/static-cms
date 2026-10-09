import { validateSite } from "@webmio/model";
import type { LooseNodes } from "@webmio/model/testing";
import { TEMPLATE_RELEASES } from "@webmio/templates";
import { load } from "cheerio";
import { describe, expect, it } from "vitest";
import { type ImportedSite, readSite, type SourcePage, siteLanguage, summary } from "./site.js";
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

  it("names the pages showing each image, for a retry to re-place it", () => {
    const bread = bakery.images.find((ref) => ref.id.endsWith("/images/chleb.jpg"));
    expect(bread?.pages).toEqual(["/", "/kontakt.html"]);
    expect(bakery.images.find((ref) => ref.role === "logo")?.pages).toEqual(["/"]);
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

  it("keeps the heading of a gallery whose photos didn't arrive, for the subheadings after it", () => {
    const html = `<!doctype html><html lang="cs"><head><title>Rakousko | Studio</title></head><body><main>
      <h1>Rakousko</h1><h2>Realizace</h2>
      <img src="/a.jpg" alt="A" width="800"><img src="/b.jpg" alt="B" width="800">
      <h3>Vídeň</h3><p>Scéna pro divadlo ve Vídni.</p>
    </main></body></html>`;
    const site = readSite([{ url: "https://studio.example/", html, css: [] }], {
      languages: LANGUAGES,
      fallbackLanguage: "cs",
      images: new Map(),
    });
    const problems = validateSite(site.document, { templates: TEMPLATE_RELEASES }).problems;
    expect(problems.filter((p) => p.code === "heading-skip")).toEqual([]);
    const levels = Object.values(site.document.nodes as Nodes)
      .filter((n) => n.type === "subheading")
      .map((n) => [n.level, n.content.content]);
    expect(levels).toEqual([
      [2, "Realizace"],
      [3, "Vídeň"],
    ]);
  });
});

describe("structures as Webmio's blocks (import-existing-blocks)", () => {
  const AGENCY_PAGES = [
    "/",
    "/zajezdy/chorvatsko/",
    "/zajezdy/italie/",
    "/zajezdy/recko/",
    "/zajezdy/rakousko/",
    "/kontakt/",
  ];
  const agency = imported("agency", AGENCY_PAGES);
  const bakery = imported("bakery", BAKERY_PAGES);
  const blocksOf = (site: ImportedSite, slug: string) => {
    const nodes = nodesOf(site);
    const page = Object.values(nodes).find((n) => n.type === "page" && n.slug === slug);
    return (page.blocks.nodes as string[]).map((id) => nodes[id]);
  };
  const types = (site: ImportedSite, slug: string) => blocksOf(site, slug).map((b) => b.type);

  it("maps each structure to its block", () => {
    expect(types(agency, "uvod")).toEqual([
      "hero",
      "rich_text",
      "cards",
      "call_to_action",
      "logos",
    ]);
    expect(types(agency, "kontakt")).toEqual(["rich_text", "contact"]);
    expect(types(bakery, "kontakt")).toContain("opening_hours");
    expect(types(bakery, "o-nas")).toContain("figures");
    expect(types(bakery, "nase-pecivo").at(-1)).toBe("steps");
  });

  it("links cards to the imported pages, and the call to action to the booking service", () => {
    const nodes = nodesOf(agency);
    const cards = blocksOf(agency, "uvod").find((b) => b.type === "cards");
    expect(text(cards.heading)).toBe("Kam vyrazit");
    const items = (cards.items.nodes as string[]).map((id) => nodes[id]);
    expect(items).toHaveLength(6);
    const linked = items.map((card) => (card.target_id ? nodes[card.target_id].slug : card.url));
    expect(linked).toEqual(["chorvatsko", "italie", "recko", "rakousko", "", ""]);
    const cta = blocksOf(agency, "uvod").find((b) => b.type === "call_to_action");
    expect(text(cta.heading)).toBe("Rezervace");
    expect(text(cta.text)).toBe("Termín zájezdu si zarezervujete přímo v kalendáři.");
    const action = nodes[(cta.actions.nodes as string[])[0] ?? ""];
    expect(action).toMatchObject({
      type: "external_link",
      url: "https://checkout.lodgify.com/cestovka-vlna/cs/#/123",
    });
  });

  it("takes the map's place as the location's link when it has no address", () => {
    const location = Object.values(nodesOf(agency)).find((n) => n.type === "location");
    expect(location.map_url).toBe(
      "https://www.google.com/maps/search/?api=1&query=Masarykova%2012%2C%20Brno",
    );
    // The bakery has its address: its map link comes from it.
    const bakeryLocation = Object.values(nodesOf(bakery)).find((n) => n.type === "location");
    expect(bakeryLocation.map_url).toBe("");
  });

  it("validates without errors but images to describe", () => {
    // The images' sizes come with their upload, in the admin.
    const later = new Set(["missing-alt", "missing-image-size"]);
    for (const site of [agency, bakery]) {
      const errors = validateSite(site.document, { templates: TEMPLATE_RELEASES }).problems.filter(
        (p) => p.severity === "error" && !later.has(p.code),
      );
      expect(errors).toEqual([]);
    }
  });

  it("Award logos in the footer: the home page ends with them, named and linked", () => {
    const nodes = nodesOf(agency);
    const logos = blocksOf(agency, "uvod").at(-1);
    const items = (logos.items.nodes as string[]).map((id) => nodes[id]);
    expect(items.map((i) => [text(i.name), i.url])).toEqual([
      ["Cestovka roku 2024", ""],
      ["Zlatý kompas 2023", ""],
      ["Cena čtenářů", "https://www.example.org/ceny"],
    ]);
    // Three, so neither the site's logo nor the Facebook icon beside them; each with its image.
    expect(items.every((i) => nodes[(i.image.nodes as string[])[0] ?? ""]?.src)).toBe(true);
    // The bakery's footer has no logos: its home page ends as before.
    expect(types(bakery, "uvod").at(-1)).not.toBe("logos");
  });

  it("reads award logos in a block its template calls a footer, with a footer elsewhere", () => {
    // Mareš Partners: the awards in `.a-footer` inside the article, a copyright `<footer>` below.
    const award = (file: string, alt: string, words: string) =>
      `<a href="#" class="external a-footer-award"><img src="/img/awards/${file}" alt="${alt}"><small>${words}</small></a>`;
    const html = `<html lang="en"><body><article><p>MAREŠ PARTNERS is a leading independent law firm.</p>
      <div class="a-footer">${award("finmon.png", "Finance Monthly\t", "Legal Awards")}${award("intl.png", "Corporate INTL", "Global Awards 2018")}</div>
      </article><footer class="f"><p>Copyright</p></footer></body></html>`;
    const pages = [{ url: "https://www.marespartners.cz/", html, css: [] }];
    const first = readSite(pages, { languages: LANGUAGES, fallbackLanguage: "en" });
    const files = new Map(first.images.map((ref, i) => [ref.id, `a-${i + 1}.png`]));
    const site = readSite(pages, { languages: LANGUAGES, fallbackLanguage: "en", images: files });
    const nodes = nodesOf(site);
    const logos = blocksOf(site, "home").at(-1);
    expect(logos.type).toBe("logos");
    expect((logos.items.nodes as string[]).map((id) => text(nodes[id].name))).toEqual([
      "Finance Monthly",
      "Corporate INTL",
    ]);
  });

  it("splits more than 12 cards into blocks of 12", () => {
    const card = (n: number) =>
      `<div class="card"><img src="/c${n}.jpg" alt="Karta ${n}" width="400"><h3>Karta ${n}</h3></div>`;
    const html = `<html lang="cs"><body><main><h1>Vše</h1><h2>Nabídka</h2><div class="grid">${Array.from({ length: 14 }, (_, i) => card(i + 1)).join("")}</div></main></body></html>`;
    const pages = [{ url: "https://nabidka.example/", html, css: [] }];
    const first = readSite(pages, { languages: LANGUAGES, fallbackLanguage: "cs" });
    const files = new Map(first.images.map((ref, i) => [ref.id, `c-${i + 1}.jpg`]));
    const site = readSite(pages, { languages: LANGUAGES, fallbackLanguage: "cs", images: files });
    const cards = blocksOf(site, "uvod").filter((b) => b.type === "cards");
    expect(cards.map((b) => b.items.nodes.length)).toEqual([12, 2]);
    expect(cards.map((b) => text(b.heading))).toEqual(["Nabídka", ""]);
  });
});

describe("other sites", () => {
  it("Logo and photo drawn by CSS: the logo, and the photo for the home page's hero", () => {
    const html = `<!doctype html><html lang="en"><head><title>Mareš Partners</title></head>
      <body class="pg-index"><header class="h"><h1 class="logo"><strong class="offscreen">Mareš Partners</strong></h1></header>
      <article class="a"><p><strong>MAREŠ PARTNERS</strong> is a leading independent law firm in the Czech Republic.</p></article>
      <aside class="i">&nbsp;</aside></body></html>`;
    const css = [
      `.i {position: fixed; background: url("img/dusni.jpg") no-repeat center center; background-size: cover;}
       .logo {background: url("img/logo-40.png") no-repeat left center;}
       .pg-index .logo {background: url("img/logo.png") no-repeat left center; background-size: auto 100%;}
       .h-nav-launcher {background: url("img/icons/ico-menu-pos.svg");}
       .doclist .docpdf {background: url("img/icons/ico-pdf.png") no-repeat;}`,
    ];
    const pages = [{ url: "https://www.marespartners.cz/", html, css }];
    const first = readSite(pages, { languages: LANGUAGES, fallbackLanguage: "en" });
    expect(first.images.map((r) => [r.role, r.candidates[0]])).toEqual([
      ["logo", "https://www.marespartners.cz/img/logo.png"],
      ["content", "https://www.marespartners.cz/img/dusni.jpg"],
    ]);
    const files = new Map(first.images.map((ref, i) => [ref.id, `image-${i + 1}.jpg`]));
    const site = readSite(pages, { languages: LANGUAGES, fallbackLanguage: "en", images: files });
    const nodes = site.document.nodes as Nodes;
    const siteNode = Object.values(nodes).find((n) => n.type === "site");
    expect(nodes[siteNode?.logo.nodes[0]]?.src).toBe("image-1.jpg");
    const hero = Object.values(nodes).find((n) => n.type === "hero");
    expect(nodes[hero?.image.nodes[0]]?.src).toBe("image-2.jpg");
    // No meta description: the first paragraph describes the site, and isn't repeated in the hero.
    expect(siteNode?.description).toBe(
      "MAREŠ PARTNERS is a leading independent law firm in the Czech Republic.",
    );
    expect(hero?.text.content).toBe("");
    const problems = validateSite(site.document, { templates: TEMPLATE_RELEASES }).problems;
    expect(problems.filter((p) => p.code === "no-description")).toEqual([]);
  });

  it("reads a stylesheet the pages share once for the theme", () => {
    // Mareš: one stylesheet on 13 pages, with a one-off green on a single class.
    const css = [`body {background: #fff; color: #000;} .cnt-emph {background: #9cc801;}`];
    const pages = ["/", "/a/", "/b/"].map((path) => ({
      url: `https://www.marespartners.cz${path}`,
      html: `<html lang="en"><body><main><h1>${path}</h1><p>Text of the page.</p></main></body></html>`,
      css,
    }));
    const site = readSite(pages, { languages: LANGUAGES, fallbackLanguage: "en" });
    const theme = Object.values(site.document.nodes as Nodes).find((n) => n.type === "theme");
    expect(theme?.color_primary).toBe("#000000");
  });

  it("shortens a long first paragraph at a word for the description", () => {
    const words = "Pečeme chléb z kvasu podle receptu našich babiček každé ráno od pěti hodin";
    const text = summary(`<main><p>Krátce.</p><p>${words}. ${words}. ${words}.</p></main>`);
    expect(text.length).toBeLessThanOrEqual(160);
    expect(text).toMatch(/^Pečeme chléb z kvasu .*\S…$/);
    expect(words.repeat(3)).toContain(text.slice(-12, -1).trim().split(" ").at(-1) ?? "");
  });

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
