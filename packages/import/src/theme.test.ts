import {
  blocks,
  CONTRAST_PAIRS,
  contrastRatio,
  MIN_CONTRAST,
  siteBuilder,
  type ThemeInput,
  validateSite,
} from "@webmio/model";
import { load } from "cheerio";
import { describe, expect, it } from "vitest";
import { fixtureText } from "./testing.js";
import { catalogFontFor, guessTheme, hexColor } from "./theme.js";

const studioCss = () => load(fixtureText("studio", "/"))("style").text();

/** Problems of a one-page site with this theme. */
function themeProblems(theme: ThemeInput) {
  const site = siteBuilder({ name: "X", lang: "cs", description: "X." });
  site.location({ city: "Brno" });
  site.theme(theme);
  site.page({ title: "Úvod", slug: "uvod" }, [blocks.text("Text.")]);
  return validateSite(site.build()).problems;
}

describe("guessed design", () => {
  it("takes the bakery's background, text, accent and panel colours", () => {
    const theme = guessTheme([fixtureText("bakery", "/style.css")]);
    expect(theme).toMatchObject({
      color_background: "#fffaf3",
      color_text: "#2b2118",
      color_secondary: "#f2e3d0",
    });
  });

  it("Low-contrast brand colour: #fe3500 becomes a darker shade that passes", () => {
    const theme = guessTheme([fixtureText("bakery", "/style.css")]);
    const primary = theme.color_primary ?? "";
    expect(primary).not.toBe("#fe3500");
    expect(contrastRatio(primary, "#fffaf3")).toBeGreaterThanOrEqual(MIN_CONTRAST);
    expect(contrastRatio(primary, "#f2e3d0")).toBeGreaterThanOrEqual(MIN_CONTRAST);
  });

  it("Unknown brand font: Playfair Display kept, Brandon Grotesque a catalogue sans", () => {
    expect(guessTheme([fixtureText("bakery", "/style.css")])).toMatchObject({
      font_heading: "playfair",
      font_body: "source-sans",
    });
  });

  it("reads a dark site's style element", () => {
    expect(guessTheme([studioCss()])).toMatchObject({
      color_background: "#111111",
      color_text: "#f5f5f5",
      color_primary: "#7fb2e5",
      font_body: "inter",
      font_heading: "lora",
    });
  });

  it("gives every guessed theme passing contrast, and no theme problems", () => {
    for (const css of [fixtureText("bakery", "/style.css"), studioCss(), "", "a{color:#ffff00}"]) {
      const theme = guessTheme([css]);
      for (const pair of CONTRAST_PAIRS) {
        const fg = theme[pair.fg] ?? "";
        const bg = theme[pair.bg] ?? "";
        expect(contrastRatio(fg, bg), `${css.slice(0, 20)} ${pair.name}`).toBeGreaterThanOrEqual(
          MIN_CONTRAST,
        );
      }
      const problems = themeProblems(theme).filter((p) => p.nodeId === "theme_1");
      expect(problems, css.slice(0, 20)).toEqual([]);
    }
  });
});

describe("fonts and colours", () => {
  it("maps families to the catalogue", () => {
    expect(catalogFontFor("Helvetica, Arial, sans-serif")).toBe("system-sans");
    expect(catalogFontFor("Georgia, serif")).toBe("georgia");
    // A brand font falls back to the stack's catalogue font, or else its generic family.
    expect(catalogFontFor('"Brandon Text", Georgia, serif')).toBe("georgia");
    expect(catalogFontFor('"Brandon Text", serif')).toBe("source-serif");
    expect(catalogFontFor("'Work Sans'")).toBe("work-sans");
    expect(catalogFontFor("Merriweather")).toBe("merriweather");
  });

  it("reads colour forms", () => {
    expect(hexColor("#FFF")).toBe("#ffffff");
    expect(hexColor("rgb(43, 33, 24)")).toBe("#2b2118");
    expect(hexColor("rgba(0,0,0,0)")).toBeUndefined();
    expect(hexColor("transparent")).toBeUndefined();
  });
});
