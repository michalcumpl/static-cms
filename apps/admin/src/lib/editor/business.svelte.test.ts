import { validateSite } from "@static-cms/site";
import type { Session } from "svedit";
import { describe, expect, it } from "vitest";
import { projectPaths } from "$lib/project-paths";
import { demoSite } from "$lib/server/demo";
import {
  addRange,
  addSocialProfile,
  businessOf,
  copyMondayToWeekdays,
  moveSocialProfile,
  normalizePhone,
  normalizeSocialUrl,
  rangesOf,
  removeRange,
  removeSocialProfile,
  setBusinessField,
  setBusinessType,
  setPhone,
  setRangeTime,
  setShowInFooter,
  setSocialUrl,
  socialProfiles,
} from "./business";
import { EditorState } from "./state.svelte";
import { insertBlockAt } from "./structure";
import type { BlockType } from "./transforms";

/** Adds a block at the end of a page, as the "+ Add block" after its last block does. */
function appendBlock(s: Session, pageIndex: number, type: BlockType): boolean {
  const path = ["site_1", "pages", pageIndex, "blocks"];
  return insertBlockAt(s, path, (s.get(path) as { nodes: string[] }).nodes.length, type);
}

function editor() {
  return new EditorState(
    { document: demoSite(), version: "v1", problems: [] },
    projectPaths("p_test"),
  );
}

const business = (s: Session) => businessOf(s.doc) as NonNullable<ReturnType<typeof businessOf>>;
const hours = (s: Session, day: Parameters<typeof rangesOf>[1]) =>
  rangesOf(s.doc, day).map((r) => `${r.opens}–${r.closes}`);
const errors = (s: Session) => validateSite(s.doc).problems.filter((p) => p.severity === "error");

describe("business fields", () => {
  it("follow typing, and a typing burst undoes as one step", () => {
    const { session: s } = editor();
    setBusinessField(s, "street", "Lipová");
    setBusinessField(s, "street", "Lipová 12");
    setBusinessField(s, "city", "Kolín");
    expect(business(s)).toMatchObject({ street: "Lipová 12", city: "Kolín" });
    s.undo();
    expect(business(s).city).toBe("");
    s.undo();
    expect(business(s).street).toBe("");
  });

  it("set the type and the footer switch, each one step", () => {
    const { session: s } = editor();
    setBusinessType(s, "Bakery");
    setShowInFooter(s, false);
    expect(business(s)).toMatchObject({ business_type: "Bakery", show_in_footer: false });
    s.undo();
    expect(business(s).show_in_footer).toBe(true);
    expect(errors(s)).toEqual([]);
  });
});

describe("phone numbers", () => {
  it.each([
    ["321 123 456", "CZ", "+420321123456"],
    ["00420 321-123-456", "CZ", "+420321123456"],
    ["+421 905 123 456", "CZ", "+421905123456"],
    ["905 123 456", "SK", "+421905123456"],
    ["(030) 1234 5678", "DE", "(030) 1234 5678"],
    ["call us", "CZ", "call us"],
    ["", "CZ", ""],
  ])("%j in %s becomes %j", (input, country, phone) => {
    expect(normalizePhone(input, country)).toBe(phone);
  });

  it("is stored normalised when the owner leaves the field", () => {
    const { session: s } = editor();
    expect(setPhone(s, "321 123 456")).toBe("+420321123456");
    expect(business(s).phone).toBe("+420321123456");
    expect(errors(s)).toEqual([]);
  });

  it("is kept as typed, and reported, when it can't be normalised", () => {
    const { session: s } = editor();
    setPhone(s, "321 123");
    expect(business(s).phone).toBe("321 123");
    expect(errors(s).map((p) => p.code)).toEqual(["invalid-phone"]);
  });
});

describe("opening hours", () => {
  it("adds a lunch break after the first range", () => {
    const { session: s } = editor();
    addRange(s, "mon");
    expect(hours(s, "mon")).toEqual(["08:00–17:00"]);
    const [first] = rangesOf(s.doc, "mon");
    setRangeTime(s, first?.id as string, "closes", "12:00");
    addRange(s, "mon");
    expect(hours(s, "mon")).toEqual(["08:00–12:00", "13:00–17:00"]);
    expect(errors(s)).toEqual([]);
  });

  it("removes a range, and undo brings it back", () => {
    const { session: s } = editor();
    addRange(s, "sat");
    removeRange(s, "sat", 0);
    expect(hours(s, "sat")).toEqual([]);
    s.undo();
    expect(hours(s, "sat")).toEqual(["08:00–17:00"]);
  });

  it("copies Monday to Tuesday–Friday in one undoable step", () => {
    const { session: s } = editor();
    addRange(s, "mon");
    const [monday] = rangesOf(s.doc, "mon");
    setRangeTime(s, monday?.id as string, "opens", "06:00");
    addRange(s, "wed");
    copyMondayToWeekdays(s);
    for (const day of ["tue", "wed", "thu", "fri"] as const) {
      expect(hours(s, day)).toEqual(["06:00–17:00"]);
    }
    // Copies, not shared nodes: changing Tuesday leaves Monday alone.
    setRangeTime(s, rangesOf(s.doc, "tue")[0]?.id as string, "closes", "16:00");
    expect(hours(s, "mon")).toEqual(["06:00–17:00"]);
    s.undo();
    s.undo();
    expect(hours(s, "tue")).toEqual([]);
    expect(hours(s, "wed")).toEqual(["08:00–17:00"]);
  });
});

describe("inserting business blocks", () => {
  it("creates contact and opening hours blocks headed in the site's language", () => {
    const { session: s } = editor();
    expect(appendBlock(s, 1, "contact")).toBe(true);
    expect(appendBlock(s, 1, "opening_hours")).toBe(true);
    const blocks = (s.get("page_contact") as { blocks: { nodes: string[] } }).blocks.nodes.map(
      (id) => s.get(id) as Record<string, unknown>,
    );
    expect(blocks.find((b) => b.type === "contact")).toMatchObject({
      heading: { content: "Kontakt" },
      show_address: true,
      show_phone: true,
      show_email: true,
      show_map: true,
    });
    expect(blocks.find((b) => b.type === "opening_hours")).toMatchObject({
      heading: { content: "Otevírací doba" },
    });
  });
});

describe("social profiles", () => {
  it("adds, edits, orders and removes profiles, each one undo step", () => {
    const { session: s } = editor();
    const ig = addSocialProfile(s);
    setSocialUrl(s, ig, normalizeSocialUrl("instagram.com/pekarnaulipy"));
    const fb = addSocialProfile(s);
    setSocialUrl(s, fb, "https://facebook.com/pekarna");
    expect(socialProfiles(s.doc).map((p) => p.url)).toEqual([
      "https://instagram.com/pekarnaulipy",
      "https://facebook.com/pekarna",
    ]);
    expect(validateSite(s.doc).problems).toEqual([]);
    moveSocialProfile(s, fb, -1);
    expect(socialProfiles(s.doc).map((p) => p.id)).toEqual([fb, ig]);
    removeSocialProfile(s, fb);
    expect(socialProfiles(s.doc).map((p) => p.id)).toEqual([ig]);
    s.undo();
    expect(socialProfiles(s.doc).map((p) => p.id)).toEqual([fb, ig]);
  });

  it("adds https:// to an address typed without one", () => {
    expect(normalizeSocialUrl(" instagram.com/pekarna ")).toBe("https://instagram.com/pekarna");
    expect(normalizeSocialUrl("https://x.com/p")).toBe("https://x.com/p");
    expect(normalizeSocialUrl("http://x.com/p")).toBe("http://x.com/p");
    expect(normalizeSocialUrl("")).toBe("");
  });
});
