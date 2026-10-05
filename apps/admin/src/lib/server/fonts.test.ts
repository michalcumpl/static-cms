import { existsSync } from "node:fs";
import { FONT_IDS, type FontId, themeFontFiles, usedFontFiles } from "@webmio/model";
import { describe, expect, it } from "vitest";
import { GET } from "../../routes/fonts/[name]/+server";
import { fontFile, fontFilePath, fontFiles } from "./fonts";

type FontEvent = Parameters<typeof GET>[0];
const get = (name: string) => GET({ params: { name } } as unknown as FontEvent);

/** Every file and licence the catalog can ask for: each font as heading and as body. */
function everyFontFile(): string[] {
  const names = FONT_IDS.flatMap((id: FontId) => {
    const doc = {
      document_id: "site",
      nodes: { site: { theme: "theme" }, theme: { font_heading: id, font_body: id } },
    };
    return usedFontFiles(doc);
  });
  return [...new Set(names)];
}

describe("font files", () => {
  it("resolves every file of the catalog in the installed packages", () => {
    const names = everyFontFile();
    expect(names).toHaveLength(8 * 5);
    for (const name of names) {
      const path = fontFilePath(name);
      expect(path, name).toBeDefined();
      expect(existsSync(path as string), name).toBe(true);
    }
  });

  it("reads a WOFF2 file and a licence", async () => {
    const woff2 = await fontFile("lora-latin-ext-normal.woff2");
    expect(new TextDecoder().decode(woff2?.slice(0, 4))).toBe("wOF2");
    const licence = new TextDecoder().decode(await fontFile("lora-OFL.txt"));
    expect(licence).toContain("SIL Open Font License");
  });

  it("knows only the catalog's names", async () => {
    expect(await fontFile("system-sans-latin-normal.woff2")).toBeUndefined();
    expect(await fontFile("../../package.json")).toBeUndefined();
    const files = await fontFiles(["lora-OFL.txt", "unknown.woff2"]);
    expect([...files.keys()]).toEqual(["lora-OFL.txt"]);
  });

  it("covers a theme's files", async () => {
    const files = await fontFiles(
      themeFontFiles({ font_heading: "playfair", font_body: "inter" }).map((f) => f.name),
    );
    expect(files.size).toBe(6);
  });
});

describe("GET /fonts/[name]", () => {
  it("serves a font file as font/woff2", async () => {
    const response = await get("inter-latin-normal.woff2");
    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toBe("font/woff2");
    expect(response.headers.get("cache-control")).toContain("max-age=");
  });

  it("serves a licence as text", async () => {
    const response = await get("inter-OFL.txt");
    expect(response.headers.get("content-type")).toBe("text/plain; charset=utf-8");
    expect(await response.text()).toContain("Open Font License");
  });

  it("answers 404 for anything else", async () => {
    await expect(get("comic-sans-latin-normal.woff2")).rejects.toMatchObject({ status: 404 });
  });
});
