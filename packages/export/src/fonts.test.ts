import { usedFontFiles } from "@webmio/model";
import { editableDemoSite, loadDemoMedia } from "@webmio/model/testing";
import { describe, expect, it } from "vitest";
import { exportSite } from "./index.js";
import { exportSiteLanguages } from "./languages.js";

/** Stand-in bytes for every font file a document needs, each different. */
function fontBytes(doc: unknown): Map<string, Uint8Array> {
  return new Map(usedFontFiles(doc).map((name, i) => [name, new Uint8Array([i + 1])]));
}

function siteWithFonts(heading: string, body: string) {
  const site = editableDemoSite();
  site.nodes.theme_1.font_heading = heading;
  site.nodes.theme_1.font_body = body;
  return site;
}

const fontPaths = (files: Map<string, Uint8Array>) =>
  [...files.keys()].filter((path) => path.startsWith("assets/fonts/"));

describe("exporting fonts", () => {
  it("places the theme's webfont files and licence under assets/fonts/", () => {
    const { doc } = siteWithFonts("lora", "system-sans");
    const fonts = fontBytes(doc);
    fonts.set("inter-latin-normal.woff2", new Uint8Array([99]));
    const result = exportSite(doc, loadDemoMedia(), { fonts });
    if (!result.ok) throw new Error(result.problems.map((p) => p.message).join("\n"));
    expect(fontPaths(result.files)).toEqual([
      "assets/fonts/lora-OFL.txt",
      "assets/fonts/lora-latin-ext-normal.woff2",
      "assets/fonts/lora-latin-normal.woff2",
    ]);
    expect(result.files.get("assets/fonts/lora-latin-normal.woff2")).toEqual(
      fonts.get("lora-latin-normal.woff2"),
    );
  });

  it("fails naming a missing font file", () => {
    const { doc } = siteWithFonts("georgia", "inter");
    const fonts = fontBytes(doc);
    fonts.delete("inter-latin-italic.woff2");
    const result = exportSite(doc, loadDemoMedia(), { fonts });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.problems).toEqual([
      expect.objectContaining({
        code: "missing-media",
        nodeId: "theme_1",
        message: "No file was supplied for inter-latin-italic.woff2.",
      }),
    ]);
  });

  it("adds no font files for system fonts", () => {
    const { doc } = siteWithFonts("georgia", "system-sans");
    const result = exportSite(doc, loadDemoMedia());
    expect(result.ok && fontPaths(result.files)).toEqual([]);
  });

  it("includes the primary's fonts once with several languages", () => {
    const cs = siteWithFonts("playfair", "nunito");
    const en = siteWithFonts("playfair", "nunito");
    en.nodes.site_1.lang = "en";
    const fonts = fontBytes(cs.doc);
    const result = exportSiteLanguages(
      [
        { lang: "cs", document: cs.doc, primary: true },
        { lang: "en", document: en.doc, primary: false },
      ],
      loadDemoMedia(),
      { fonts },
    );
    if (!result.ok) throw new Error(result.problems.map((p) => p.message).join("\n"));
    expect(fontPaths(result.files)).toEqual(usedFontFiles(cs.doc).map((n) => `assets/fonts/${n}`));
    expect([...result.files.keys()].some((path) => path.startsWith("en/assets/"))).toBe(false);
  });
});
