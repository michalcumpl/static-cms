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
const BUSINESS_IDS = [
  "business_1",
  ...["mon", "tue", "wed", "thu", "fri", "sat", "sun"].map((d) => `day_${d}`),
];

/** The nodes without the business details that the version-4 upgrade adds. */
function withoutBusiness(nodes: LooseNodes): LooseNodes {
  return Object.fromEntries(Object.entries(nodes).filter(([id]) => !BUSINESS_IDS.includes(id)));
}

describe("migrateSite", () => {
  it("upgrades a two-page version-1 site", () => {
    const v1 = loadDemoSiteV1();
    const result = migrateSite(v1) as { nodes: LooseNodes };
    expect(result.nodes.site_1).toMatchObject({ schema_version: 4, home_page_id: "page_home" });
    expect(result.nodes.page_home.slug).toBe("uvod");
    const { site_1: _s, page_home: _h, page_contact: _c, ...rest } = withoutBusiness(result.nodes);
    const { site_1: _s1, page_home: _h1, page_contact: _c1, ...restV1 } = v1.nodes;
    expect(rest).toEqual(restV1);
    expect(result.nodes.page_contact).toEqual({
      ...v1.nodes.page_contact,
      share_image: { nodes: [], marks: [], annotations: [] },
    });
  });

  it("upgrades a version-2 site to version 4", () => {
    const v2 = loadDemoSiteV2();
    const result = migrateSite(v2) as { nodes: LooseNodes };
    expect(result.nodes.site_1).toEqual({
      ...v2.nodes.site_1,
      schema_version: 4,
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
      });
    }
    const { site_1: _s, page_home: _h, page_contact: _c, ...rest } = withoutBusiness(result.nodes);
    const { site_1: _s2, page_home: _h2, page_contact: _c2, ...restV2 } = v2.nodes;
    expect(rest).toEqual(restV2);
  });

  it("upgrades a version-3 site to version 4: empty business details, every day closed", () => {
    const v3 = loadDemoSiteV3();
    const result = migrateSite(v3) as { nodes: LooseNodes };
    expect(result.nodes.site_1).toEqual({
      ...v3.nodes.site_1,
      schema_version: 4,
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
    const { site_1: _s, ...rest } = withoutBusiness(result.nodes);
    const { site_1: _s3, ...restV3 } = v3.nodes;
    expect(rest).toEqual(restV3);
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

  it("produces the version-4 demo site from versions 2 and 3", () => {
    expect(migrateSite(loadDemoSiteV2())).toEqual(loadDemoSite());
    expect(migrateSite(loadDemoSiteV3())).toEqual(loadDemoSite());
  });

  it("produces the version-4 demo site, which validates without problems", () => {
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

  it("returns a version-4 document unchanged", () => {
    const v4 = loadDemoSite();
    expect(migrateSite(v4)).toBe(v4);
  });

  it("returns anything that isn't a site of an older version unchanged", () => {
    for (const input of [null, "site", { nodes: {} }, { document_id: "x", nodes: {} }]) {
      expect(migrateSite(input)).toBe(input);
    }
  });
});
