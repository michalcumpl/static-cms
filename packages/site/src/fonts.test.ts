import { describe, expect, it } from "vitest";
import {
  FONT_IDS,
  FONTS,
  fontPackagePath,
  fontStack,
  isFontId,
  themeFontFiles,
  usedFontFiles,
} from "./fonts.js";
import { editableDemoSite } from "./test/fixtures.js";

function siteWithFonts(heading: string, body: string) {
  const { doc, nodes } = editableDemoSite();
  const theme = nodes[nodes[doc.document_id]?.theme as string] as Record<string, unknown>;
  theme.font_heading = heading;
  theme.font_body = body;
  return doc;
}

describe("the font catalog", () => {
  it("has eight webfonts and two system fonts", () => {
    const webfonts = FONT_IDS.filter((id) => "package" in FONTS[id]);
    expect(webfonts).toHaveLength(8);
    expect(FONT_IDS.filter((id) => !webfonts.includes(id))).toEqual(["system-sans", "georgia"]);
  });

  it("knows its IDs", () => {
    expect(isFontId("lora")).toBe(true);
    expect(isFontId("comic-sans")).toBe(false);
    expect(isFontId("toString")).toBe(false);
  });

  it("writes the family before its fallback", () => {
    expect(fontStack("lora")).toBe(`"Lora", Georgia, 'Times New Roman', serif`);
    expect(fontStack("system-sans")).toBe(
      "system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif",
    );
  });
});

describe("usedFontFiles", () => {
  it("lists Lora headings and an Inter body", () => {
    expect(usedFontFiles(siteWithFonts("lora", "inter"))).toEqual([
      "inter-OFL.txt",
      "inter-latin-ext-italic.woff2",
      "inter-latin-ext-normal.woff2",
      "inter-latin-italic.woff2",
      "inter-latin-normal.woff2",
      "lora-OFL.txt",
      "lora-latin-ext-normal.woff2",
      "lora-latin-normal.woff2",
    ]);
  });

  it("lists each file once when both use the same font", () => {
    expect(usedFontFiles(siteWithFonts("work-sans", "work-sans"))).toEqual([
      "work-sans-OFL.txt",
      "work-sans-latin-ext-italic.woff2",
      "work-sans-latin-ext-normal.woff2",
      "work-sans-latin-italic.woff2",
      "work-sans-latin-normal.woff2",
    ]);
  });

  it("needs nothing for system fonts or unknown IDs", () => {
    expect(usedFontFiles(siteWithFonts("system-sans", "georgia"))).toEqual([]);
    expect(usedFontFiles(siteWithFonts("comic-sans", "Georgia, serif"))).toEqual([]);
    expect(usedFontFiles({})).toEqual([]);
  });
});

describe("fontPackagePath", () => {
  it("maps published names to the package's files", () => {
    expect(fontPackagePath("source-serif-latin-ext-italic.woff2")).toBe(
      "source-serif-4/files/source-serif-4-latin-ext-wght-italic.woff2",
    );
    expect(fontPackagePath("playfair-OFL.txt")).toBe("playfair-display/LICENSE");
    expect(fontPackagePath("system-sans-latin-normal.woff2")).toBeUndefined();
    expect(fontPackagePath("../secret")).toBeUndefined();
  });

  it("covers every file a theme can need", () => {
    const files = themeFontFiles({ font_heading: "playfair", font_body: "nunito" });
    for (const file of files) expect(fontPackagePath(file.name)).toBe(file.packagePath);
  });
});
