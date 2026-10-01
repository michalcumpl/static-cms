import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { migrateSite } from "./migrate.js";
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

describe("migrateSite", () => {
  it("upgrades a two-page version-1 site", () => {
    const v1 = loadDemoSiteV1();
    const result = migrateSite(v1) as { nodes: LooseNodes };
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
    const result = migrateSite(v2) as { nodes: LooseNodes };
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
    const result = migrateSite(v3) as { nodes: LooseNodes };
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
    const result = migrateSite(v4) as { nodes: LooseNodes };
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
    const result = migrateSite(v5) as { nodes: LooseNodes };
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
    const result = migrateSite(v5) as { nodes: LooseNodes };
    expect(result.nodes.theme_1.font_heading).toBe(font);
  });

  it("gives the business nodes free IDs", () => {
    const v3 = loadDemoSiteV3();
    v3.nodes.business_1 = { ...v3.nodes.hero_1, id: "business_1" };
    v3.nodes.day_mon = { ...v3.nodes.hero_1, id: "day_mon" };
    const result = migrateSite(v3) as { nodes: LooseNodes };
    expect(result.nodes.site_1.business).toBe("business_1_2");
    expect(result.nodes.business_1_2.days.nodes[0]).toBe("day_mon_2");
    expect(result.nodes.business_1.type).toBe("hero");
  });

  it("produces the current demo site from versions 2, 3, 4 and 5", () => {
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
    const result = migrateSite(v1) as { nodes: LooseNodes };
    expect(result.nodes.page_home.slug).toBe("kontakt-2");
  });

  it("falls back to home when the title gives no slug", () => {
    const v1 = loadDemoSiteV1();
    v1.nodes.page_home.title = "!!!";
    const result = migrateSite(v1) as { nodes: LooseNodes };
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
    const v6 = loadDemoSite();
    expect(migrateSite(v6)).toBe(v6);
  });

  it("returns anything that isn't a site of an older version unchanged", () => {
    for (const input of [null, "site", { nodes: {} }, { document_id: "x", nodes: {} }]) {
      expect(migrateSite(input)).toBe(input);
    }
  });
});
