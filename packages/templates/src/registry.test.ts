import {
  CARDS_LAYOUTS,
  GALLERY_IMAGE_FITS,
  HERO_LAYOUTS,
  SERVICES_LAYOUTS,
  TEAM_LAYOUTS,
} from "@webmio/model";
import { describe, expect, it } from "vitest";
import { isTokenValue, templateProblems } from "./checks.js";
import { TEMPLATE_RELEASES, TEMPLATES, templateById } from "./registry.js";
import { STANDARD } from "./standard.js";
import { type Template, TOKEN_NAMES } from "./types.js";

describe("template registry", () => {
  it("Standard is there", () => {
    expect(templateById("standard")).toBe(STANDARD);
  });

  it("Unknown ID", () => {
    expect(templateById("bakery")).toBeUndefined();
  });

  it("lists each template's current release", () => {
    expect(TEMPLATE_RELEASES.get("standard")).toBe(STANDARD.release);
    expect([...TEMPLATE_RELEASES.keys()]).toEqual(TEMPLATES.map((t) => t.id));
  });

  it("Template described: ID, name and description in both languages, trades and release", () => {
    for (const t of TEMPLATES) {
      for (const text of [t.name, t.description, ...t.trades]) {
        expect(text.cs.trim(), t.id).not.toBe("");
        expect(text.en.trim(), t.id).not.toBe("");
      }
      expect(t.trades.length, t.id).toBeGreaterThan(0);
    }
  });
});

describe("the Standard template", () => {
  it("takes each block's first look", () => {
    expect(STANDARD.looks).toEqual({
      hero: HERO_LAYOUTS[0],
      services: SERVICES_LAYOUTS[0],
      team: TEAM_LAYOUTS[0],
      gallery: GALLERY_IMAGE_FITS[0],
      cards: CARDS_LAYOUTS[0],
    });
  });

  it("is release 1, with no styles of its own and no upgrade steps", () => {
    expect(STANDARD.release).toBe(1);
    expect(STANDARD.css).toBe("");
    expect(STANDARD.upgrades).toEqual({});
  });
});

describe("template checks", () => {
  it("every template in the registry passes", () => {
    for (const t of TEMPLATES) expect(templateProblems(t), t.id).toEqual([]);
  });

  it("every template sets every token, and only those", () => {
    for (const t of TEMPLATES)
      expect(Object.keys(t.tokens).sort(), t.id).toEqual([...TOKEN_NAMES].sort());
  });

  it("Default look outside the block's looks", () => {
    const bad = { ...STANDARD, id: "bad-hero", looks: { ...STANDARD.looks, hero: "split" } };
    expect(templateProblems(bad as unknown as Template)).toEqual([
      `Template "bad-hero": the hero block's default look "split" isn't one of its looks (beside, cover, slideshow).`,
    ]);
  });

  it("refuses token values that could break out of their declaration", () => {
    const tokens = { ...STANDARD.tokens, "block-padding": "2rem; color: red" };
    expect(templateProblems({ ...STANDARD, id: "leaky", tokens })).toEqual([
      `Template "leaky": the token block-padding has the value "2rem; color: red", which isn't a CSS length or number.`,
    ]);
  });

  it("wants the shared layouts first, unique layout IDs and steps for its own releases", () => {
    const [home, ...rest] = STANDARD.layouts;
    if (!home) throw new Error("no layouts");
    const t: Template = {
      ...STANDARD,
      id: "mixed-up",
      release: 2,
      layouts: [...rest, home, home],
      upgrades: { 3: () => {} },
    };
    expect(templateProblems(t)).toEqual([
      `Template "mixed-up": two layouts have the ID "home".`,
      `Template "mixed-up": the layouts must start with the shared layouts, in their order.`,
      `Template "mixed-up": the upgrade step for release 3 isn't for a release from 2 to 2.`,
    ]);
  });
});

describe("token values", () => {
  it.each([
    "0",
    "1rem",
    "0.9rem",
    "1.6",
    "64ch",
    "clamp(1.75rem, 5vw, 3.5rem)",
    "clamp(2rem, 5cqi, 3rem)",
    "calc(1rem + 2vw)",
    "min(4rem, 10vw)",
  ])("accepts %s", (value) => {
    expect(isTokenValue(value)).toBe(true);
  });

  it.each([
    "",
    "red",
    "1rem;",
    "1rem }",
    "url(x)",
    "clamp(1rem, var(--x), 2rem)",
    "calc(1rem + calc(2rem))",
    "expression(alert(1))",
    "1 rem",
  ])("refuses %s", (value) => {
    expect(isTokenValue(value)).toBe(false);
  });
});
