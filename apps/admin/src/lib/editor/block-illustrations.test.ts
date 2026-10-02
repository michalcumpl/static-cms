import { describe, expect, it } from "vitest";
import { BLOCK_ILLUSTRATIONS, ILLUSTRATION_VIEWBOX } from "./block-illustrations";
import { BLOCK_NAMES } from "./handles";

describe("block illustrations", () => {
  it("draws every block type, decoratively, on the shared canvas", () => {
    for (const type of Object.keys(BLOCK_NAMES) as (keyof typeof BLOCK_NAMES)[]) {
      const markup = BLOCK_ILLUSTRATIONS[type];
      expect(markup, type).toMatch(/^<svg [^>]*viewBox="0 0 120 72"[^>]*aria-hidden="true"/);
      expect(markup, type).toMatch(/<\/svg>$/);
      expect(markup, type).not.toMatch(/NaN|undefined/);
    }
    expect(ILLUSTRATION_VIEWBOX).toBe("0 0 120 72");
  });

  it("uses the site's primary colour for buttons and accents, except where a block has none", () => {
    const withAccent = Object.entries(BLOCK_ILLUSTRATIONS).filter(([, m]) =>
      m.includes("var(--color-primary"),
    );
    expect(withAccent.map(([type]) => type).sort()).toEqual(
      ["call_to_action", "contact", "hero", "rich_text", "services", "team", "testimonials"].sort(),
    );
  });

  it("is well-formed XML", () => {
    for (const [type, markup] of Object.entries(BLOCK_ILLUSTRATIONS)) {
      const opened = (markup.match(/<(?!\/)[a-z]+[^>]*[^/]>/g) ?? []).length;
      const closed = (markup.match(/<\/[a-z]+>/g) ?? []).length;
      expect(closed, type).toBe(opened);
    }
  });
});
