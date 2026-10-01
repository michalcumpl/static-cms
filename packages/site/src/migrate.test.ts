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

describe("migrateSite", () => {
  it("upgrades a two-page version-1 site", () => {
    const v1 = loadDemoSiteV1();
    const result = migrateSite(v1) as { nodes: LooseNodes };
    expect(result.nodes.site_1).toMatchObject({ schema_version: 3, home_page_id: "page_home" });
    expect(result.nodes.page_home.slug).toBe("uvod");
    const { site_1: _s, page_home: _h, page_contact: _c, ...rest } = result.nodes;
    const { site_1: _s1, page_home: _h1, page_contact: _c1, ...restV1 } = v1.nodes;
    expect(rest).toEqual(restV1);
    expect(result.nodes.page_contact).toEqual({
      ...v1.nodes.page_contact,
      share_image: { nodes: [], marks: [], annotations: [] },
    });
  });

  it("upgrades a version-2 site to version 3", () => {
    const v2 = loadDemoSiteV2();
    const result = migrateSite(v2) as { nodes: LooseNodes };
    expect(result.nodes.site_1).toEqual({
      ...v2.nodes.site_1,
      schema_version: 3,
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
    const { site_1: _s, page_home: _h, page_contact: _c, ...rest } = result.nodes;
    const { site_1: _s2, page_home: _h2, page_contact: _c2, ...restV2 } = v2.nodes;
    expect(rest).toEqual(restV2);
  });

  it("produces the version-3 demo site from version 2", () => {
    expect(migrateSite(loadDemoSiteV2())).toEqual(loadDemoSite());
  });

  it("produces the version-3 demo site, which validates without problems", () => {
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

  it("returns a version-3 document unchanged", () => {
    const v3 = loadDemoSite();
    expect(migrateSite(v3)).toBe(v3);
  });

  it("returns anything that isn't a site of an older version unchanged", () => {
    for (const input of [null, "site", { nodes: {} }, { document_id: "x", nodes: {} }]) {
      expect(migrateSite(input)).toBe(input);
    }
  });
});
