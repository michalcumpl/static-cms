import { validateSite } from "@webmio/model";
import type { Session } from "svedit";
import { describe, expect, it } from "vitest";
import { projectPaths } from "$lib/project-paths";
import { demoSite } from "$lib/server/demo";
import {
  addLocation,
  addRange,
  addSocialProfile,
  blocksChoosing,
  businessOf,
  copyMondayToWeekdays,
  locationOf,
  locationsOf,
  moveLocation,
  moveSocialProfile,
  normalizePhone,
  normalizeSocialUrl,
  rangesOf,
  removeLocation,
  removeRange,
  removeSocialProfile,
  setBlockLocation,
  setBusinessName,
  setBusinessType,
  setLocationField,
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
const MAIN = "location_1";
const main = (s: Session) => locationOf(s.doc, MAIN) as NonNullable<ReturnType<typeof locationOf>>;
const hours = (s: Session, day: Parameters<typeof rangesOf>[2], location = MAIN) =>
  rangesOf(s.doc, location, day).map((r) => `${r.opens}–${r.closes}`);
const errors = (s: Session) => validateSite(s.doc).problems.filter((p) => p.severity === "error");

describe("business fields", () => {
  it("follow typing, and a typing burst undoes as one step", () => {
    const { session: s } = editor();
    setLocationField(s, MAIN, "street", "Lipová");
    setLocationField(s, MAIN, "street", "Lipová 12");
    setLocationField(s, MAIN, "city", "Kolín");
    expect(main(s)).toMatchObject({ street: "Lipová 12", city: "Kolín" });
    s.undo();
    expect(main(s).city).toBe("");
    s.undo();
    expect(main(s).street).toBe("");
    setBusinessName(s, "Pekárna U Lípy s.r.o.");
    expect(business(s).name).toBe("Pekárna U Lípy s.r.o.");
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
    expect(setPhone(s, MAIN, "321 123 456")).toBe("+420321123456");
    expect(main(s).phone).toBe("+420321123456");
    expect(errors(s)).toEqual([]);
  });

  it("is kept as typed, and reported, when it can't be normalised", () => {
    const { session: s } = editor();
    setPhone(s, MAIN, "321 123");
    expect(main(s).phone).toBe("321 123");
    expect(errors(s).map((p) => p.code)).toEqual(["invalid-phone"]);
  });
});

describe("opening hours", () => {
  it("adds a lunch break after the first range", () => {
    const { session: s } = editor();
    addRange(s, MAIN, "mon");
    expect(hours(s, "mon")).toEqual(["08:00–17:00"]);
    const [first] = rangesOf(s.doc, MAIN, "mon");
    setRangeTime(s, first?.id as string, "closes", "12:00");
    addRange(s, MAIN, "mon");
    expect(hours(s, "mon")).toEqual(["08:00–12:00", "13:00–17:00"]);
    expect(errors(s)).toEqual([]);
  });

  it("removes a range, and undo brings it back", () => {
    const { session: s } = editor();
    addRange(s, MAIN, "sat");
    removeRange(s, MAIN, "sat", 0);
    expect(hours(s, "sat")).toEqual([]);
    s.undo();
    expect(hours(s, "sat")).toEqual(["08:00–17:00"]);
  });

  it("copies Monday to Tuesday–Friday in one undoable step", () => {
    const { session: s } = editor();
    addRange(s, MAIN, "mon");
    const [monday] = rangesOf(s.doc, MAIN, "mon");
    setRangeTime(s, monday?.id as string, "opens", "06:00");
    addRange(s, MAIN, "wed");
    copyMondayToWeekdays(s, MAIN);
    for (const day of ["tue", "wed", "thu", "fri"] as const) {
      expect(hours(s, day)).toEqual(["06:00–17:00"]);
    }
    // Copies, not shared nodes: changing Tuesday leaves Monday alone.
    setRangeTime(s, rangesOf(s.doc, MAIN, "tue")[0]?.id as string, "closes", "16:00");
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
      location_id: "",
    });
    expect(blocks.find((b) => b.type === "opening_hours")).toMatchObject({
      heading: { content: "Otevírací doba" },
      location_id: "",
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

describe("locations", () => {
  it("adds an empty location with every day closed, in the main location's country", () => {
    const { session: s } = editor();
    setLocationField(s, MAIN, "country", "SK");
    const id = addLocation(s) as string;
    expect(locationsOf(s.doc).map((l) => l.id)).toEqual([MAIN, id]);
    expect(locationOf(s.doc, id)).toMatchObject({ name: "", country: "SK" });
    expect(hours(s, "mon", id)).toEqual([]);
    // Two locations need names.
    expect(errors(s).map((p) => p.code)).toEqual(["empty-name", "empty-name"]);
    setLocationField(s, MAIN, "name", "Kolín");
    setLocationField(s, id, "name", "Kutná Hora");
    expect(errors(s)).toEqual([]);
  });

  it("sets fields and hours per location, and copies Monday within one location", () => {
    const { session: s } = editor();
    const kh = addLocation(s) as string;
    setPhone(s, kh, "327 111 222");
    addRange(s, kh, "mon");
    copyMondayToWeekdays(s, kh);
    expect(locationOf(s.doc, kh)?.phone).toBe("+420327111222");
    expect(main(s).phone).toBe("");
    expect(hours(s, "fri", kh)).toEqual(["08:00–17:00"]);
    expect(hours(s, "fri")).toEqual([]);
  });

  it("moves a location, making another the main one", () => {
    const { session: s } = editor();
    const kh = addLocation(s) as string;
    moveLocation(s, kh, -1);
    expect(locationsOf(s.doc).map((l) => l.id)).toEqual([kh, MAIN]);
  });

  it("never removes the only location", () => {
    const { session: s } = editor();
    expect(removeLocation(s, MAIN)).toBe(false);
    expect(locationsOf(s.doc)).toHaveLength(1);
  });

  it("removes a chosen location, sets its blocks to all locations, and one undo restores both", () => {
    const { session: s } = editor();
    const kh = addLocation(s) as string;
    appendBlock(s, 1, "contact");
    const contact = (s.get("page_contact") as { blocks: { nodes: string[] } }).blocks.nodes.at(
      -1,
    ) as string;
    setBlockLocation(s, contact, kh);
    expect(blocksChoosing(s.doc, kh)).toEqual([{ blockId: contact, pageTitle: "Kontakt" }]);
    expect(removeLocation(s, kh)).toBe(true);
    expect(locationOf(s.doc, kh)).toBeUndefined();
    expect((s.get(contact) as { location_id: string }).location_id).toBe("");
    s.undo();
    expect(locationOf(s.doc, kh)).toBeDefined();
    expect((s.get(contact) as { location_id: string }).location_id).toBe(kh);
  });
});
