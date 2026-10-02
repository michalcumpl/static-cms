import { describe, expect, it } from "vitest";
import { editableDemoSite, type LooseNodes } from "./test/fixtures.js";
import { copyPageInto, translationStatus } from "./translations.js";
import { validateSite } from "./validate/index.js";

const text = (content: string, marks: unknown[] = []) => ({ content, marks, annotations: [] });
const list = (nodes: string[]) => ({ nodes, marks: [], annotations: [] });

/** Adds the page "Ceník" (slug `cenik`) with a text block linking "Kontakt" and an image. */
function addCenik(nodes: LooseNodes, inMenu = true) {
  nodes.link_kontakt = { id: "link_kontakt", type: "internal_link", page_id: "page_contact" };
  nodes.p_cenik = {
    id: "p_cenik",
    type: "paragraph",
    content: text("Ptejte se na stránce Kontakt.", [
      { start_offset: 21, end_offset: 28, node_id: "link_kontakt" },
    ]),
  };
  nodes.img_cenik = {
    id: "img_cenik",
    type: "image",
    src: "hero.png",
    alt: "Pult",
    decorative: false,
    width: 320,
    height: 180,
  };
  nodes.twi_cenik = {
    id: "twi_cenik",
    type: "text_with_image",
    heading: text("Ceny"),
    body: list(["p_cenik"]),
    image: list(["img_cenik"]),
    image_side: "right",
  };
  nodes.page_cenik = {
    id: "page_cenik",
    type: "page",
    title: "Ceník",
    slug: "cenik",
    seo_description: "Ceny pečiva.",
    translation_key: "page_cenik",
    share_image: list([]),
    blocks: list(["twi_cenik"]),
  };
  nodes.site_1.pages.nodes.push("page_cenik");
  if (inMenu) {
    nodes.nav_cenik = {
      id: "nav_cenik",
      type: "page_link",
      label: text("Ceník"),
      page_id: "page_cenik",
    };
    nodes.nav_1.items.nodes.push("nav_cenik");
  }
}

/** Czech with "Ceník", and English as a copy from before "Ceník" with "Kontakt" translated. */
function languages() {
  const cs = editableDemoSite();
  const en = editableDemoSite();
  en.nodes.site_1.lang = "en";
  en.nodes.page_contact.title = "Contact";
  en.nodes.page_contact.slug = "contact";
  addCenik(cs.nodes);
  return { cs, en };
}

let counter = 0;
const newId = () => `n${++counter}`;

describe("translationStatus", () => {
  it("lists untranslated pages by title or slug, and the primary's missing pages", () => {
    const { cs, en } = languages();
    const status = translationStatus(cs.doc, en.doc);
    // The English home page still has the Czech title; "Contact" is translated.
    expect(status.untranslated.map((p) => p.pageId)).toEqual(["page_home"]);
    expect(status.missing.map((p) => p.title)).toEqual(["Ceník"]);
  });

  it("judges a translated title with the old slug as not translated", () => {
    const { cs, en } = languages();
    en.nodes.page_contact.slug = "kontakt";
    expect(translationStatus(cs.doc, en.doc).untranslated.map((p) => p.pageId)).toContain(
      "page_contact",
    );
  });

  it("judges the home page by its title only", () => {
    const { cs, en } = languages();
    en.nodes.page_home.title = "Home";
    expect(translationStatus(cs.doc, en.doc).untranslated).toEqual([]);
  });
});

describe("copyPageInto", () => {
  it("copies a page with its blocks under new IDs, paired and in the menu", () => {
    const { cs, en } = languages();
    const result = copyPageInto(cs.doc, "page_cenik", en.doc, newId);
    if (!result.ok) throw new Error(result.message);
    const nodes = (result.document as { nodes: LooseNodes }).nodes;
    const page = nodes[result.pageId];
    expect(page).toMatchObject({ title: "Ceník", slug: "cenik", translation_key: "page_cenik" });
    expect(result.pageId).not.toBe("page_cenik");
    expect(nodes.site_1.pages.nodes.at(-1)).toBe(result.pageId);
    const block = nodes[page.blocks.nodes[0]];
    expect(block.type).toBe("text_with_image");
    expect(block.id).not.toBe("twi_cenik");
    expect(nodes[block.image.nodes[0]]).toMatchObject({ src: "hero.png", alt: "Pult" });
    expect(block.image.nodes[0]).not.toBe("img_cenik");
    const menuItem = nodes[nodes.nav_1.items.nodes.at(-1)];
    expect(menuItem).toMatchObject({
      type: "page_link",
      page_id: result.pageId,
      label: { content: "Ceník" },
    });
    // The source ids aren't in the target, so nothing is shared.
    for (const id of ["page_cenik", "twi_cenik", "p_cenik", "img_cenik", "link_kontakt"]) {
      expect(nodes[id], id).toBeUndefined();
    }
    expect(validateSite(result.document).problems.filter((p) => p.severity === "error")).toEqual(
      [],
    );
  });

  it("points links at the target's counterparts", () => {
    const { cs, en } = languages();
    en.nodes.page_contact.id = "page_contact";
    const result = copyPageInto(cs.doc, "page_cenik", en.doc, newId);
    if (!result.ok) throw new Error(result.message);
    const nodes = (result.document as { nodes: LooseNodes }).nodes;
    const block = nodes[nodes[result.pageId].blocks.nodes[0]];
    const paragraph = nodes[block.body.nodes[0]];
    const link = nodes[paragraph.content.marks[0].node_id];
    expect(link).toMatchObject({ type: "internal_link", page_id: "page_contact" });
  });

  it("follows the translation key, not the page ID, to the counterpart", () => {
    const { cs, en } = languages();
    // English's "Contact" was built separately and linked: another ID, the same key.
    en.nodes.page_en_contact = { ...en.nodes.page_contact, id: "page_en_contact" };
    en.nodes.site_1.pages.nodes = ["page_home", "page_en_contact"];
    delete en.nodes.page_contact;
    en.nodes.nav_contact.page_id = "page_en_contact";
    en.nodes.internal_contact.page_id = "page_en_contact";
    const result = copyPageInto(cs.doc, "page_cenik", en.doc, newId);
    if (!result.ok) throw new Error(result.message);
    const nodes = (result.document as { nodes: LooseNodes }).nodes;
    const block = nodes[nodes[result.pageId].blocks.nodes[0]];
    const link = nodes[nodes[block.body.nodes[0]].content.marks[0].node_id];
    expect(link.page_id).toBe("page_en_contact");
  });

  it("leaves a link to a page the target doesn't have, reported as a missing page", () => {
    const { cs, en } = languages();
    en.nodes.page_contact.translation_key = "en_only";
    const result = copyPageInto(cs.doc, "page_cenik", en.doc, newId);
    if (!result.ok) throw new Error(result.message);
    const nodes = (result.document as { nodes: LooseNodes }).nodes;
    const block = nodes[nodes[result.pageId].blocks.nodes[0]];
    const link = nodes[nodes[block.body.nodes[0]].content.marks[0].node_id];
    expect(link.page_id).toBe("page_contact");
    // "page_contact" is still English's page here, but not the counterpart; with the key gone
    // from the target, the copy keeps the Czech target, which validation checks like any link.
    const missing = validateSite({
      ...(result.document as object),
      nodes: {
        ...nodes,
        site_1: {
          ...nodes.site_1,
          pages: {
            ...nodes.site_1.pages,
            nodes: nodes.site_1.pages.nodes.filter((id: string) => id !== "page_contact"),
          },
        },
      },
    }).problems.map((p) => p.code);
    expect(missing).toContain("missing-page");
  });

  it("makes the slug unique in the target", () => {
    const { cs, en } = languages();
    en.nodes.page_contact.slug = "cenik";
    const result = copyPageInto(cs.doc, "page_cenik", en.doc, newId);
    if (!result.ok) throw new Error(result.message);
    const nodes = (result.document as { nodes: LooseNodes }).nodes;
    expect(nodes[result.pageId].slug).toBe("cenik-2");
  });

  it("adds no menu item for a page outside the menu", () => {
    const cs = editableDemoSite();
    const en = editableDemoSite();
    addCenik(cs.nodes, false);
    const result = copyPageInto(cs.doc, "page_cenik", en.doc, newId);
    if (!result.ok) throw new Error(result.message);
    expect((result.document as { nodes: LooseNodes }).nodes.nav_1.items.nodes).toEqual(
      en.nodes.nav_1.items.nodes,
    );
  });

  it("refuses a page the target already has, naming its counterpart", () => {
    const { cs, en } = languages();
    expect(copyPageInto(cs.doc, "page_contact", en.doc, newId)).toEqual({
      ok: false,
      reason: "exists",
      message: 'This language already has the page as "Contact".',
      title: "Contact",
    });
  });

  it("modifies neither input", () => {
    const { cs, en } = languages();
    const before = [structuredClone(cs.doc), structuredClone(en.doc)];
    copyPageInto(cs.doc, "page_cenik", en.doc, newId);
    expect([cs.doc, en.doc]).toEqual(before);
  });
});
