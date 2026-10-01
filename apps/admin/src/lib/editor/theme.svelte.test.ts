import { THEME_PRESETS, validateSite } from "@static-cms/site";
import type { Session } from "svedit";
import { describe, expect, it } from "vitest";
import { projectPaths } from "$lib/project-paths";
import { demoSite } from "$lib/server/demo";
import { EditorState } from "./state.svelte";
import {
  applyPreset,
  isPresetApplied,
  setHeaderShowName,
  setLogo,
  setThemeColor,
  setThemeFont,
  setThemeLength,
  themeSettings,
} from "./theme";

// biome-ignore lint/suspicious/noExplicitAny: tests read nodes freely.
type AnyNode = Record<string, any>;

function editor() {
  return new EditorState(
    { document: demoSite(), version: "v1", problems: [] },
    projectPaths("p_test"),
  );
}

const site = (s: Session) => s.get("site_1") as AnyNode;
const theme = (s: Session) => themeSettings(s.doc);
const brand = { key: "pekarna-7c1e", width: 600, height: 200 };
const bakery = THEME_PRESETS.find((p) => p.name === "Bakery");
if (!bakery) throw new Error("no Bakery preset");

describe("theme colours", () => {
  it("change only once a typed value is a complete hex colour, as one undo step", () => {
    const { session: s } = editor();
    const before = theme(s).color_primary;
    for (const typed of ["#", "#8", "#8b"]) {
      setThemeColor(s, "color_primary", typed);
      expect(theme(s).color_primary).toBe(before);
    }
    for (const typed of ["#8b2", "#8b2f", "#8b2f2", "#8B2F2F"])
      setThemeColor(s, "color_primary", typed);
    expect(theme(s).color_primary).toBe("#8b2f2f");
    s.undo();
    expect(theme(s).color_primary).toBe(before);
  });
});

describe("fonts and lengths", () => {
  it("set catalog fonts only", () => {
    const { session: s } = editor();
    setThemeFont(s, "font_heading", "lora");
    setThemeFont(s, "font_body", "comic-sans");
    expect(theme(s)).toMatchObject({ font_heading: "lora", font_body: "system-sans" });
  });

  it("set the radius and content width, each one step", () => {
    const { session: s } = editor();
    setThemeLength(s, "radius", "1rem");
    setThemeLength(s, "content_width", "76rem");
    expect(theme(s)).toMatchObject({ radius: "1rem", content_width: "76rem" });
    s.undo();
    expect(theme(s).content_width).toBe("64rem");
    expect(theme(s).radius).toBe("1rem");
  });
});

describe("presets", () => {
  it("apply colours, fonts and radius in one step, keeping the content width", () => {
    const { session: s } = editor();
    setThemeLength(s, "content_width", "76rem");
    const before = { ...theme(s) };
    applyPreset(s, bakery);
    expect(theme(s)).toMatchObject({
      color_primary: bakery.color_primary,
      font_heading: "lora",
      font_body: "work-sans",
      radius: bakery.radius,
      content_width: "76rem",
    });
    expect(isPresetApplied(theme(s), bakery)).toBe(true);
    expect(validateSite(s.doc).problems.filter((p) => p.nodeId === before.id)).toEqual([]);
    s.undo();
    expect(theme(s)).toEqual(before);
  });

  it("change nothing when already applied", () => {
    const { session: s } = editor();
    applyPreset(s, bakery);
    const doc = s.doc;
    applyPreset(s, bakery);
    expect(s.doc).toBe(doc);
  });
});

describe("logo", () => {
  it("is chosen with the name shown, in one step", () => {
    const { session: s } = editor();
    setHeaderShowName(s, false);
    setLogo(s, brand);
    const [id] = site(s).logo.nodes;
    expect(s.get(id)).toMatchObject({
      type: "image",
      src: "pekarna-7c1e",
      width: 600,
      height: 200,
    });
    expect(site(s).header_show_name).toBe(true);
    s.undo();
    expect(site(s).logo.nodes).toEqual([]);
    expect(site(s).header_show_name).toBe(false);
  });

  it("keeps the name hidden when the logo is replaced, and can be removed", () => {
    const { session: s } = editor();
    setLogo(s, brand);
    setHeaderShowName(s, false);
    setLogo(s, { key: "novy-1234", width: 400, height: 400 });
    expect(site(s).header_show_name).toBe(false);
    expect((s.get(site(s).logo.nodes[0]) as AnyNode).src).toBe("novy-1234");
    setLogo(s, undefined);
    expect(site(s).logo.nodes).toEqual([]);
    expect(validateSite(s.doc).problems.map((p) => p.code)).toEqual(["name-without-logo"]);
  });
});
