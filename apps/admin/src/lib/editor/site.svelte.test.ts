import { validateSite } from "@static-cms/site";
import type { Session } from "svedit";
import { describe, expect, it } from "vitest";
import { projectPaths } from "$lib/project-paths";
import { demoSite } from "$lib/server/demo";
import { duplicatePage } from "./pages";
import {
  setAiSearch,
  setAiTraining,
  setSiteDescription,
  setSiteName,
  setSlotImage,
  setSlotImageAlt,
  slotImage,
} from "./site";
import { EditorState } from "./state.svelte";

// biome-ignore lint/suspicious/noExplicitAny: tests read nodes freely.
type AnyNode = Record<string, any>;

function editor() {
  return new EditorState(
    { document: demoSite(), version: "v1", problems: [] },
    projectPaths("p_test"),
  );
}

const node = (s: Session, id: string) => s.get(id) as AnyNode;
const site = (s: Session) => node(s, "site_1");
const logo = { key: "logo-1a2b", width: 512, height: 512 };
const pult = { key: "pult-3f9a", width: 1600, height: 1200 };
const errors = (s: Session) => validateSite(s.doc).problems.filter((p) => p.severity === "error");

describe("site name and description", () => {
  it("follow typing, and a typing burst undoes as one step", () => {
    const { session: s } = editor();
    setSiteName(s, "Pekárna U Lípy B");
    setSiteName(s, "Pekárna U Lípy Br");
    setSiteDescription(s, "Rodinná pekárna");
    expect(site(s)).toMatchObject({ name: "Pekárna U Lípy Br", description: "Rodinná pekárna" });
    s.undo();
    expect(site(s).description).toBe("");
    s.undo();
    expect(site(s).name).toBe("Pekárna U Lípy");
  });

  it("change nothing when the value is the same", () => {
    const { session: s } = editor();
    const before = s.doc;
    setSiteName(s, "Pekárna U Lípy");
    expect(s.doc).toBe(before);
  });
});

describe("AI switches", () => {
  it("are each one undoable step", () => {
    const { session: s } = editor();
    setAiTraining(s, false);
    setAiSearch(s, false);
    expect(site(s)).toMatchObject({ allow_ai_search: false, allow_ai_training: false });
    s.undo();
    expect(site(s)).toMatchObject({ allow_ai_search: true, allow_ai_training: false });
    s.undo();
    expect(site(s).allow_ai_training).toBe(true);
  });
});

describe("images in slots", () => {
  it("puts a chosen favicon into the site, valid without a description", () => {
    const { session: s } = editor();
    setSlotImage(s, "site_1", "favicon", logo);
    const image = slotImage(s.doc, "site_1", "favicon");
    expect(image).toMatchObject({ src: "logo-1a2b", width: 512, height: 512, alt: "" });
    expect(site(s).favicon.nodes).toEqual([image?.id]);
    expect(errors(s)).toEqual([]);
  });

  it("chooses, describes, replaces and removes a page's share image", () => {
    const { session: s } = editor();
    setSlotImage(s, "page_contact", "share_image", pult);
    const image = slotImage(s.doc, "page_contact", "share_image");
    if (!image) throw new Error("no share image");
    expect(errors(s).map((p) => p.code)).toEqual(["missing-alt"]);
    setSlotImageAlt(s, image.id, "Pult");
    expect(errors(s)).toEqual([]);

    setSlotImage(s, "page_contact", "share_image", logo);
    expect(slotImage(s.doc, "page_contact", "share_image")).toMatchObject({
      id: image.id,
      src: "logo-1a2b",
      alt: "",
    });
    setSlotImage(s, "page_contact", "share_image", undefined);
    expect(node(s, "page_contact").share_image.nodes).toEqual([]);
  });

  it("keeps the description when the same image is chosen again", () => {
    const { session: s } = editor();
    setSlotImage(s, "site_1", "share_image", pult);
    const image = slotImage(s.doc, "site_1", "share_image");
    setSlotImageAlt(s, image?.id as string, "Pult");
    const before = s.doc;
    setSlotImage(s, "site_1", "share_image", pult);
    expect(s.doc).toBe(before);
  });

  it("brings a removed share image back on undo", () => {
    const { session: s } = editor();
    setSlotImage(s, "page_contact", "share_image", pult);
    setSlotImage(s, "page_contact", "share_image", undefined);
    s.undo();
    expect(slotImage(s.doc, "page_contact", "share_image")).toMatchObject({ src: "pult-3f9a" });
    s.undo();
    expect(slotImage(s.doc, "page_contact", "share_image")).toBeUndefined();
  });
});

describe("duplicating a page with a share image", () => {
  it("gives the copy its own copy of the image", () => {
    const { session: s } = editor();
    setSlotImage(s, "page_contact", "share_image", pult);
    const original = slotImage(s.doc, "page_contact", "share_image");
    const copyId = duplicatePage(s, "page_contact") as string;
    const copy = slotImage(s.doc, copyId, "share_image");
    expect(copy).toMatchObject({ src: "pult-3f9a" });
    expect(copy?.id).not.toBe(original?.id);
  });
});
