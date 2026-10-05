import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { migrateSite } from "./migrate.js";
import { renderSite } from "./render/index.js";
import { type LooseNodes, loadDemoSite } from "./test/fixtures.js";
import { validateSite } from "./validate/index.js";

function loadFixture(name: string): { document_id: string; nodes: LooseNodes } {
  const file = new URL(`../fixtures/${name}`, import.meta.url);
  return JSON.parse(readFileSync(file, "utf8"));
}
const loadDemoSiteV1 = () => loadFixture("demo-site-v1.json");
const loadDemoSiteV2 = () => loadFixture("demo-site-v2.json");
const loadDemoSiteV3 = () => loadFixture("demo-site-v3.json");
const loadDemoSiteV4 = () => loadFixture("demo-site-v4.json");
const loadDemoSiteV5 = () => loadFixture("demo-site-v5.json");
const loadDemoSiteV6 = () => loadFixture("demo-site-v6.json");
const BUSINESS_IDS = [
  "business_1",
  ...["mon", "tue", "wed", "thu", "fri", "sat", "sun"].map((d) => `day_${d}`),
];

/** What the version-6 upgrade adds to the site node. */
const V6_SITE = {
  schema_version: 6,
  logo: { nodes: [], marks: [], annotations: [] },
  header_show_name: true,
};

/** The fixtures' theme as the version-6 upgrade leaves it: catalog fonts instead of CSS lists. */
function withCatalogFonts(nodes: LooseNodes): LooseNodes {
  return {
    ...nodes,
    theme_1: { ...nodes.theme_1, font_heading: "georgia", font_body: "system-sans" },
  };
}

/** The nodes without the business details that the version-4 upgrade adds. */
function withoutBusiness(nodes: LooseNodes): LooseNodes {
  return Object.fromEntries(Object.entries(nodes).filter(([id]) => !BUSINESS_IDS.includes(id)));
}

const BLOCK_ITEMS = { services: "items", team: "people", testimonials: "items" } as const;
const COLLECTION_OF = { services: "services", team: "team", testimonials: "testimonials" } as const;

/**
 * An upgraded document as version 6 had it: items back in their blocks, without the
 * collections, item references and social profiles version 7 adds. Lets the tests of earlier
 * upgrades keep comparing whole documents.
 */
function asVersion6(doc: { nodes: LooseNodes }): { nodes: LooseNodes } {
  const nodes: LooseNodes = { ...doc.nodes };
  const { services, team, testimonials, faqs: _f, ...site } = nodes.site_1;
  const collections = { services, team, testimonials };
  nodes.site_1 = { ...site, schema_version: 6 };
  for (const [id, node] of Object.entries(nodes)) {
    if (!Object.hasOwn(BLOCK_ITEMS, node.type)) continue;
    const type = node.type as keyof typeof BLOCK_ITEMS;
    const ids =
      node.show === "all"
        ? collections[COLLECTION_OF[type]].nodes
        : node.chosen.nodes.map((ref: string) => nodes[ref].item_id);
    for (const ref of node.chosen.nodes) delete nodes[ref];
    const { show: _s, chosen: _c, ...block } = node;
    nodes[id] = { ...block, [BLOCK_ITEMS[type]]: { nodes: ids, marks: [], annotations: [] } };
  }
  if (nodes.business_1) {
    const { social: _social, ...business } = nodes.business_1;
    nodes.business_1 = business;
  }
  return { ...doc, nodes };
}

describe("migrateSite", () => {
  it("upgrades a two-page version-1 site", () => {
    const v1 = loadDemoSiteV1();
    const result = asVersion6(migrateSite(v1) as { nodes: LooseNodes });
    expect(result.nodes.site_1).toMatchObject({ ...V6_SITE, home_page_id: "page_home" });
    expect(result.nodes.page_home.slug).toBe("uvod");
    const { site_1: _s, page_home: _h, page_contact: _c, ...rest } = withoutBusiness(result.nodes);
    const { site_1: _s1, page_home: _h1, page_contact: _c1, ...restV1 } = v1.nodes;
    expect(rest).toEqual(withCatalogFonts(restV1));
    expect(result.nodes.page_contact).toEqual({
      ...v1.nodes.page_contact,
      share_image: { nodes: [], marks: [], annotations: [] },
      translation_key: "page_contact",
    });
  });

  it("upgrades a version-2 site to version 6", () => {
    const v2 = loadDemoSiteV2();
    const result = asVersion6(migrateSite(v2) as { nodes: LooseNodes });
    expect(result.nodes.site_1).toEqual({
      ...v2.nodes.site_1,
      ...V6_SITE,
      business: "business_1",
      description: "",
      favicon: { nodes: [], marks: [], annotations: [] },
      share_image: { nodes: [], marks: [], annotations: [] },
      allow_ai_search: true,
      allow_ai_training: true,
    });
    for (const id of ["page_home", "page_contact"]) {
      expect(result.nodes[id]).toEqual({
        ...v2.nodes[id],
        share_image: { nodes: [], marks: [], annotations: [] },
        translation_key: id,
      });
    }
    const { site_1: _s, page_home: _h, page_contact: _c, ...rest } = withoutBusiness(result.nodes);
    const { site_1: _s2, page_home: _h2, page_contact: _c2, ...restV2 } = v2.nodes;
    expect(rest).toEqual(withCatalogFonts(restV2));
  });

  it("upgrades a version-3 site: empty business details, every day closed", () => {
    const v3 = loadDemoSiteV3();
    const result = asVersion6(migrateSite(v3) as { nodes: LooseNodes });
    expect(result.nodes.site_1).toEqual({
      ...v3.nodes.site_1,
      ...V6_SITE,
      business: "business_1",
    });
    expect(result.nodes.business_1).toEqual({
      id: "business_1",
      type: "business",
      name: "",
      street: "",
      postal_code: "",
      city: "",
      country: "CZ",
      phone: "",
      email: "",
      map_url: "",
      business_type: "LocalBusiness",
      hours_note: "",
      show_in_footer: true,
      days: { nodes: BUSINESS_IDS.slice(1), marks: [], annotations: [] },
    });
    expect(result.nodes.day_sun).toEqual({
      id: "day_sun",
      type: "opening_day",
      day: "sun",
      ranges: { nodes: [], marks: [], annotations: [] },
    });
    const { site_1: _s, page_home: _h, page_contact: _c, ...rest } = withoutBusiness(result.nodes);
    const { site_1: _s3, page_home: _h3, page_contact: _c3, ...restV3 } = v3.nodes;
    expect(rest).toEqual(withCatalogFonts(restV3));
  });

  it("upgrades a version-4 site: every page's translation key is its ID", () => {
    const v4 = loadDemoSiteV4();
    const result = asVersion6(migrateSite(v4) as { nodes: LooseNodes });
    expect(result.nodes.site_1).toEqual({ ...v4.nodes.site_1, ...V6_SITE });
    for (const id of ["page_home", "page_contact"]) {
      expect(result.nodes[id]).toEqual({ ...v4.nodes[id], translation_key: id });
    }
    const { site_1: _s, page_home: _h, page_contact: _c, ...rest } = result.nodes;
    const { site_1: _s4, page_home: _h4, page_contact: _c4, ...restV4 } = v4.nodes;
    expect(rest).toEqual(withCatalogFonts(restV4));
  });

  it("upgrades the starter theme of a version-5 site: catalog fonts, no logo, name shown", () => {
    const v5 = loadDemoSiteV5();
    expect(v5.nodes.theme_1.font_heading).toBe("Georgia, 'Times New Roman', serif");
    expect(v5.nodes.theme_1.font_body).toBe(
      "system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif",
    );
    const result = asVersion6(migrateSite(v5) as { nodes: LooseNodes });
    expect(result.nodes.site_1).toEqual({ ...v5.nodes.site_1, ...V6_SITE });
    expect(result.nodes).toEqual(withCatalogFonts({ ...v5.nodes, site_1: result.nodes.site_1 }));
  });

  it.each([
    ["'Playfair Display', serif", "georgia"],
    ["Georgia", "georgia"],
    ['"Georgia", sans-serif', "georgia"],
    ["Helvetica, Arial, sans-serif", "system-sans"],
    ["'Comic Sans MS', cursive", "system-sans"],
    ["", "system-sans"],
  ])("turns the font list %j into %s", (list, font) => {
    const v5 = loadDemoSiteV5();
    v5.nodes.theme_1.font_heading = list;
    const result = asVersion6(migrateSite(v5) as { nodes: LooseNodes });
    expect(result.nodes.theme_1.font_heading).toBe(font);
  });

  it("gives the business nodes free IDs", () => {
    const v3 = loadDemoSiteV3();
    v3.nodes.business_1 = { ...v3.nodes.hero_1, id: "business_1" };
    v3.nodes.day_mon = { ...v3.nodes.hero_1, id: "day_mon" };
    const result = asVersion6(migrateSite(v3) as { nodes: LooseNodes });
    expect(result.nodes.site_1.business).toBe("business_1_2");
    expect(result.nodes.business_1_2.days.nodes[0]).toBe("day_mon_2");
    expect(result.nodes.business_1.type).toBe("hero");
  });

  it("produces the current demo site from versions 2, 3, 4, 5 and 6", () => {
    expect(migrateSite(loadDemoSiteV6())).toEqual(loadDemoSite());
    expect(migrateSite(loadDemoSiteV2())).toEqual(loadDemoSite());
    expect(migrateSite(loadDemoSiteV5())).toEqual(loadDemoSite());
    expect(migrateSite(loadDemoSiteV3())).toEqual(loadDemoSite());
    expect(migrateSite(loadDemoSiteV4())).toEqual(loadDemoSite());
  });

  it("produces the current demo site, which validates without problems", () => {
    const result = migrateSite(loadDemoSiteV1());
    expect(result).toEqual(loadDemoSite());
    expect(validateSite(result).problems).toEqual([]);
  });

  it("makes the home slug unique when the title's slug is taken", () => {
    const v1 = loadDemoSiteV1();
    v1.nodes.page_home.title = "Kontakt";
    const result = asVersion6(migrateSite(v1) as { nodes: LooseNodes });
    expect(result.nodes.page_home.slug).toBe("kontakt-2");
  });

  it("falls back to home when the title gives no slug", () => {
    const v1 = loadDemoSiteV1();
    v1.nodes.page_home.title = "!!!";
    const result = asVersion6(migrateSite(v1) as { nodes: LooseNodes });
    expect(result.nodes.page_home.slug).toBe("home");
  });

  it("does not modify its input", () => {
    const v1 = loadDemoSiteV1();
    const before = structuredClone(v1);
    migrateSite(v1);
    expect(v1).toEqual(before);
  });

  it("does not modify a version-2 input", () => {
    const v2 = loadDemoSiteV2();
    const before = structuredClone(v2);
    migrateSite(v2);
    expect(v2).toEqual(before);
  });

  it("returns a current document unchanged", () => {
    const current = loadDemoSite();
    expect(migrateSite(current)).toBe(current);
  });

  it("returns anything that isn't a site of an older version unchanged", () => {
    for (const input of [null, "site", { nodes: {} }, { document_id: "x", nodes: {} }]) {
      expect(migrateSite(input)).toBe(input);
    }
  });
});

describe("upgrading version-6 documents", () => {
  const text = (content: string) => ({ content, marks: [], annotations: [] });
  const list = (nodes: string[]) => ({ nodes, marks: [], annotations: [] });
  const service = (id: string, name: string, description = "") => ({
    id,
    type: "service_item",
    name: text(name),
    description: text(description),
    price: text(""),
  });
  const serviceNames = (html = "") =>
    [...html.matchAll(/<p class="service-name">([^<]*)<\/p>/g)].map((m) => m[1]);
  const renderedPages = (doc: unknown) => {
    const result = renderSite(doc);
    if (!result.ok) throw new Error(result.problems.map((p) => p.message).join("\n"));
    return result.site.pages.map((page) => page.html);
  };

  /** The version-6 demo with a services block holding `homeItems` on the home page, and one
   * holding `contactItems` on "Kontakt". */
  function twoBlocks(
    homeItems: ReturnType<typeof service>[],
    contactItems: ReturnType<typeof service>[],
  ) {
    const v6 = loadDemoSiteV6();
    for (const id of v6.nodes.services_1.items.nodes) delete v6.nodes[id];
    delete v6.nodes.emphasis_cakes;
    for (const item of [...homeItems, ...contactItems]) v6.nodes[item.id] = item;
    v6.nodes.services_1.items = list(homeItems.map((i) => i.id));
    v6.nodes.services_2 = {
      id: "services_2",
      type: "services",
      heading: text("Služby"),
      items: list(contactItems.map((i) => i.id)),
    };
    v6.nodes.page_contact.blocks.nodes.push("services_2");
    return v6;
  }

  it("One services block: lifts its items, and the block shows all of them", () => {
    const v6 = loadDemoSiteV6();
    const result = migrateSite(v6) as { nodes: LooseNodes };
    expect(result.nodes.site_1.services.nodes).toEqual([
      "service_bread",
      "service_rolls",
      "service_cakes",
    ]);
    expect(result.nodes.services_1).toMatchObject({ show: "all", chosen: list([]) });
    expect(result.nodes.services_1.items).toBeUndefined();
  });

  it("Highlights and a full list: merges identical items, the highlights become chosen", () => {
    const v6 = twoBlocks(
      [service("s_bread", "Chléb"), service("s_rolls", "Rohlíky")],
      [service("s_bread_2", "Chléb"), service("s_rolls_2", "Rohlíky"), service("s_cakes", "Dorty")],
    );
    const before = structuredClone(v6);
    const result = migrateSite(v6) as { nodes: LooseNodes };
    expect(v6).toEqual(before);
    expect(result.nodes.site_1.services.nodes).toEqual(["s_bread", "s_rolls", "s_cakes"]);
    expect(result.nodes.s_bread_2).toBeUndefined();
    expect(result.nodes.services_1.show).toBe("chosen");
    expect(
      result.nodes.services_1.chosen.nodes.map((ref: string) => result.nodes[ref].item_id),
    ).toEqual(["s_bread", "s_rolls"]);
    expect(result.nodes.services_2).toMatchObject({ show: "all", chosen: list([]) });
    expect(validateSite(result).problems).toEqual([]);
    // Each page lists the services its block held before.
    const [home, contact] = renderedPages(result);
    expect(serviceNames(home)).toEqual(["Chléb", "Rohlíky"]);
    expect(serviceNames(contact)).toEqual(["Chléb", "Rohlíky", "Dorty"]);
  });

  it("Same name, different text: keeps both items, each block shows its own", () => {
    const v6 = twoBlocks([service("s_a", "Chléb", "Kváskový")], [service("s_b", "Chléb", "Žitný")]);
    const result = migrateSite(v6) as { nodes: LooseNodes };
    expect(result.nodes.site_1.services.nodes).toEqual(["s_a", "s_b"]);
    const shown = (id: string) =>
      result.nodes[id].chosen.nodes.map((ref: string) => result.nodes[ref].item_id);
    expect(shown("services_1")).toEqual(["s_a"]);
    expect(shown("services_2")).toEqual(["s_b"]);
    expect(validateSite(result).problems).toEqual([]);
  });

  it("keeps two identical items within one block apart", () => {
    const v6 = twoBlocks([service("s_a", "Chléb"), service("s_b", "Chléb")], []);
    const result = migrateSite(v6) as { nodes: LooseNodes };
    expect(result.nodes.site_1.services.nodes).toEqual(["s_a", "s_b"]);
    expect(result.nodes.services_1.show).toBe("all");
  });

  it("merges items whose marks differ only in their node IDs", () => {
    const v6 = twoBlocks(
      [service("s_a", "Chléb", "Kváskový")],
      [service("s_b", "Chléb", "Kváskový")],
    );
    v6.nodes.s_a.description.marks = [{ start_offset: 0, end_offset: 3, node_id: "strong_a" }];
    v6.nodes.s_b.description.marks = [{ start_offset: 0, end_offset: 3, node_id: "strong_b" }];
    v6.nodes.strong_a = { id: "strong_a", type: "strong" };
    v6.nodes.strong_b = { id: "strong_b", type: "strong" };
    const result = migrateSite(v6) as { nodes: LooseNodes };
    expect(result.nodes.site_1.services.nodes).toEqual(["s_a"]);
    expect(result.nodes.strong_b).toBeUndefined();
    expect(validateSite(result).problems).toEqual([]);
  });

  it("adds an empty FAQ collection and no social profiles", () => {
    const result = migrateSite(loadDemoSiteV6()) as { nodes: LooseNodes };
    expect(result.nodes.site_1.faqs).toEqual(list([]));
    expect(result.nodes.business_1.social).toEqual(list([]));
    expect(result.nodes.site_1.schema_version).toBe(7);
  });
});
