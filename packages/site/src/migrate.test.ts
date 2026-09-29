import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { migrateSite } from "./migrate.js";
import { type LooseNodes, loadDemoSite } from "./test/fixtures.js";
import { validateSite } from "./validate/index.js";

function loadDemoSiteV1(): { document_id: string; nodes: LooseNodes } {
  const file = new URL("../fixtures/demo-site-v1.json", import.meta.url);
  return JSON.parse(readFileSync(file, "utf8"));
}

describe("migrateSite", () => {
  it("upgrades a two-page version-1 site", () => {
    const v1 = loadDemoSiteV1();
    const result = migrateSite(v1) as { nodes: LooseNodes };
    expect(result.nodes.site_1).toMatchObject({ schema_version: 2, home_page_id: "page_home" });
    expect(result.nodes.page_home.slug).toBe("uvod");
    const { site_1: _s, page_home: _h, ...rest } = result.nodes;
    const { site_1: _s1, page_home: _h1, ...restV1 } = v1.nodes;
    expect(rest).toEqual(restV1);
  });

  it("produces the version-2 demo site, which validates without problems", () => {
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

  it("returns a version-2 document unchanged", () => {
    const v2 = loadDemoSite();
    expect(migrateSite(v2)).toBe(v2);
  });

  it("returns anything that isn't a version-1 site unchanged", () => {
    for (const input of [null, "site", { nodes: {} }, { document_id: "x", nodes: {} }]) {
      expect(migrateSite(input)).toBe(input);
    }
  });
});
