import { describe, expect, it } from "vitest";
import { migrateSite } from "./migrate.js";
import type { SiteDocument } from "./schema/index.js";
import { editableDemoSite, loadFixture } from "./testing.js";
import { PRESET_PROPERTIES, THEME_PRESETS } from "./themes.js";
import { validateSite } from "./validate/index.js";

describe("theme presets", () => {
  it("has at least five, with distinct names", () => {
    expect(THEME_PRESETS.length).toBeGreaterThanOrEqual(5);
    expect(new Set(THEME_PRESETS.map((p) => p.name)).size).toBe(THEME_PRESETS.length);
  });

  it.each(THEME_PRESETS.map((p) => [p.name, p] as const))(
    "%s passes every theme check",
    (_, preset) => {
      const { doc, nodes } = editableDemoSite();
      const themeId = nodes[doc.document_id].theme as string;
      for (const prop of PRESET_PROPERTIES) nodes[themeId][prop] = preset[prop];
      const problems = validateSite(doc).problems.filter((p) => p.nodeId === themeId);
      expect(problems).toEqual([]);
    },
  );

  it("starts with the values new projects start with", () => {
    const starter = migrateSite(loadFixture("starter-site.json")) as SiteDocument;
    const site = starter.nodes[starter.document_id] as unknown as { theme: string };
    const theme = starter.nodes[site.theme] as unknown as Record<string, unknown>;
    const first = THEME_PRESETS[0] as unknown as Record<string, unknown>;
    for (const prop of PRESET_PROPERTIES) expect(theme[prop], prop).toBe(first[prop]);
  });
});
