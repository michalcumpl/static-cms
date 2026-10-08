import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { migrateSite } from "./migrate.js";
import { type LooseNodes, loadDemoSite } from "./testing.js";
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
/**
 * An upgraded document as version 7 had it: the business's one location folded back into the
 * business, and no location choice on blocks.
 */
/** An upgraded document as version 11 had it: images without a focal point. */
function asVersion11(doc: { nodes: LooseNodes }): { nodes: LooseNodes } {
  const nodes: LooseNodes = { ...doc.nodes };
  for (const [id, node] of Object.entries(nodes)) {
    if (node.type === "image") {
      const { focus_x: _x, focus_y: _y, ...image } = node;
      nodes[id] = image;
    }
  }
  nodes.site_1 = { ...nodes.site_1, schema_version: 11 };
  return { ...doc, nodes };
}

/** An upgraded document as version 10 had it: heroes without slides. */
function asVersion10(upgraded: { nodes: LooseNodes }): { nodes: LooseNodes } {
  const doc = asVersion11(upgraded);
  const nodes: LooseNodes = { ...doc.nodes };
  for (const [id, node] of Object.entries(nodes)) {
    if (node.type === "hero") {
      const { slides: _slides, ...hero } = node;
      nodes[id] = hero;
    }
  }
  nodes.site_1 = { ...nodes.site_1, schema_version: 10 };
  return { ...doc, nodes };
}

/** An upgraded document as version 9 had it: no projects, no item pages. */
function asVersion9(upgraded: { nodes: LooseNodes }): { nodes: LooseNodes } {
  const doc = asVersion10(upgraded);
  const nodes: LooseNodes = { ...doc.nodes };
  for (const [id, node] of Object.entries(nodes)) {
    if (node.type === "service_item") {
      const { slug: _slug, body: _body, ...item } = node;
      nodes[id] = item;
    }
  }
  const {
    projects: _projects,
    project_categories: _categories,
    services_page_id: _services,
    projects_page_id: _projectsPage,
    ...site
  } = nodes.site_1;
  nodes.site_1 = { ...site, schema_version: 9 };
  return { ...doc, nodes };
}

/** An upgraded document as version 8 had it: no look on the hero, services, team or gallery. */
function asVersion8(upgraded: { nodes: LooseNodes }): { nodes: LooseNodes } {
  const doc = asVersion9(upgraded);
  const nodes: LooseNodes = { ...doc.nodes };
  for (const [id, node] of Object.entries(nodes)) {
    if (["hero", "services", "team"].includes(node.type)) {
      const { layout: _layout, ...block } = node;
      nodes[id] = block;
    } else if (node.type === "gallery") {
      const { image_fit: _fit, ...block } = node;
      nodes[id] = block;
    }
  }
  nodes.site_1 = { ...nodes.site_1, schema_version: 8 };
  return { ...doc, nodes };
}

function asVersion7(upgraded: { nodes: LooseNodes }): { nodes: LooseNodes } {
  const doc = asVersion8(upgraded);
  const nodes: LooseNodes = { ...doc.nodes };
  const businessId = nodes.site_1.business;
  const { locations, ...business } = nodes[businessId];
  const [locationId] = locations.nodes;
  const { id: _id, type: _type, name: _name, ...fields } = nodes[locationId];
  delete nodes[locationId];
  nodes[businessId] = { ...business, ...fields };
  for (const [id, node] of Object.entries(nodes)) {
    if (node.type === "contact" || node.type === "opening_hours") {
      const { location_id: _l, ...block } = node;
      nodes[id] = block;
    }
  }
  nodes.site_1 = { ...nodes.site_1, schema_version: 7 };
  return { ...doc, nodes };
}

function asVersion6(upgraded: { nodes: LooseNodes }): { nodes: LooseNodes } {
  const doc = asVersion7(upgraded);
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
  const businessId = nodes.site_1.business;
  if (nodes[businessId]) {
    const { social: _social, ...business } = nodes[businessId];
    nodes[businessId] = business;
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

  it("produces the current demo site from versions 2, 3, 4, 5, 6 and 7", () => {
    expect(migrateSite(loadFixture("demo-site-v7.json"))).toEqual(loadDemoSite());
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
    // That each page then lists the services its block held before is checked where pages
    // are rendered (@webmio/render, upgrade.test.ts).
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
    const result = asVersion7(migrateSite(loadDemoSiteV6()) as { nodes: LooseNodes });
    expect(result.nodes.site_1.faqs).toEqual(list([]));
    expect(result.nodes.business_1.social).toEqual(list([]));
    expect(result.nodes.site_1.schema_version).toBe(7);
  });
});

describe("upgrading version-7 documents", () => {
  const range = (id: string, opens: string, closes: string) => ({
    id,
    type: "time_range",
    opens,
    closes,
  });

  /** The version-7 demo as a bakery at Lipová 12 with a phone, open Monday to Friday. */
  function bakery() {
    const v7 = loadFixture("demo-site-v7.json");
    Object.assign(v7.nodes.business_1, {
      business_type: "Bakery",
      street: "Lipová 12",
      city: "Kolín",
      phone: "+420321123456",
      hours_note: "Ve svátky zavřeno",
    });
    for (const day of ["mon", "tue", "wed", "thu", "fri"]) {
      v7.nodes[`range_${day}`] = range(`range_${day}`, "06:00", "17:00");
      v7.nodes[`day_${day}`].ranges = { nodes: [`range_${day}`], marks: [], annotations: [] };
    }
    v7.nodes.contact_1 = {
      id: "contact_1",
      type: "contact",
      heading: { content: "Kontakt", marks: [], annotations: [] },
      show_address: true,
      show_phone: true,
      show_email: true,
      show_map: true,
    };
    v7.nodes.page_contact.blocks.nodes.push("contact_1");
    return v7;
  }

  it("Upgrade the bakery: one unnamed location holds the details and hours", () => {
    const v7 = bakery();
    const before = structuredClone(v7);
    const result = migrateSite(v7) as { nodes: LooseNodes };
    expect(v7).toEqual(before);
    expect(result.nodes.site_1.schema_version).toBe(12);
    expect(result.nodes.business_1).toMatchObject({
      business_type: "Bakery",
      locations: { nodes: ["location_1"] },
    });
    expect(result.nodes.business_1.street).toBeUndefined();
    expect(result.nodes.location_1).toMatchObject({
      type: "location",
      name: "",
      street: "Lipová 12",
      city: "Kolín",
      phone: "+420321123456",
      hours_note: "Ve svátky zavřeno",
      days: {
        nodes: ["day_mon", "day_tue", "day_wed", "day_thu", "day_fri", "day_sat", "day_sun"],
      },
    });
    expect(result.nodes.contact_1.location_id).toBe("");
    expect(validateSite(result).problems).toEqual([]);
  });

  it("gives every language's document the same location ID", () => {
    const cs = bakery();
    const en = bakery();
    en.nodes.site_1.lang = "en";
    en.nodes.business_1.hours_note = "Closed on holidays";
    const [a, b] = [cs, en].map((doc) => migrateSite(doc) as { nodes: LooseNodes });
    expect(a?.nodes.business_1.locations.nodes).toEqual(b?.nodes.business_1.locations.nodes);
  });

  it("takes a free location ID", () => {
    const v7 = bakery();
    v7.nodes.location_1 = { ...v7.nodes.hero_1, id: "location_1" };
    const result = migrateSite(v7) as { nodes: LooseNodes };
    expect(result.nodes.business_1.locations.nodes).toEqual(["location_1_2"]);
  });
});

describe("upgrading version-8 documents (block-variants)", () => {
  it("Upgrade the bakery: today's looks on every hero, services, team and gallery", () => {
    const v8 = loadFixture("demo-site-v8.json") as { nodes: LooseNodes };
    v8.nodes.gallery_1 = {
      id: "gallery_1",
      type: "gallery",
      heading: { content: "", marks: [], annotations: [] },
      items: { nodes: [], marks: [], annotations: [] },
    };
    const before = structuredClone(v8);
    const result = migrateSite(v8) as { nodes: LooseNodes };
    expect(v8).toEqual(before);
    expect(result.nodes.site_1.schema_version).toBe(12);
    expect(result.nodes.hero_1.layout).toBe("beside");
    expect(result.nodes.services_1.layout).toBe("cards");
    expect(result.nodes.gallery_1.image_fit).toBe("fill");
    expect(migrateSite(loadFixture("demo-site-v8.json"))).toEqual(loadDemoSite());
  });
});

describe("upgrading version-9 documents (collection-pages)", () => {
  it("Upgrade the bakery: no projects, no item pages, empty service addresses and page texts", () => {
    const v9 = loadFixture("demo-site-v9.json") as { nodes: LooseNodes };
    const before = structuredClone(v9);
    const result = migrateSite(v9) as { nodes: LooseNodes };
    expect(v9).toEqual(before);
    expect(result.nodes.site_1).toMatchObject({
      schema_version: 12,
      projects: { nodes: [] },
      project_categories: { nodes: [] },
      services_page_id: "",
      projects_page_id: "",
    });
    expect(result.nodes.service_bread).toMatchObject({ slug: "", body: { nodes: [] } });
    expect(validateSite(result).problems).toEqual([]);
    expect(result).toEqual(loadDemoSite());
  });
});

describe("upgrading version-10 documents (hero-slideshow)", () => {
  it("Upgrade the bakery: heroes get an empty list of slides", () => {
    const v10 = loadFixture("demo-site-v10.json") as { nodes: LooseNodes };
    const before = structuredClone(v10);
    const result = migrateSite(v10) as { nodes: LooseNodes };
    expect(v10).toEqual(before);
    expect(result.nodes.site_1.schema_version).toBe(12);
    expect(result.nodes.hero_1.slides).toEqual({ nodes: [], marks: [], annotations: [] });
    expect(validateSite(result).problems).toEqual([]);
    expect(result).toEqual(loadDemoSite());
  });
});

describe("upgrading version-11 documents (image-cropping)", () => {
  it("Upgrade the bakery: every image gets a centred focal point", () => {
    const v11 = loadFixture("demo-site-v11.json") as { nodes: LooseNodes };
    const before = structuredClone(v11);
    const result = migrateSite(v11) as { nodes: LooseNodes };
    expect(v11).toEqual(before);
    expect(result.nodes.site_1.schema_version).toBe(12);
    const images = Object.values(result.nodes).filter((n) => n.type === "image");
    expect(images.length).toBeGreaterThan(0);
    for (const image of images) expect(image).toMatchObject({ focus_x: 50, focus_y: 50 });
    expect(validateSite(result).problems).toEqual([]);
    expect(result).toEqual(loadDemoSite());
  });
});
