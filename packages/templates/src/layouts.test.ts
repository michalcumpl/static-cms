import { validateSite } from "@webmio/model";
import { editableDemoSite, type LooseNodes, loadFixture } from "@webmio/model/testing";
import { describe, expect, it } from "vitest";
import { type LayoutNode, pageFromLayout } from "./page-from-layout.js";
import { TEMPLATE_RELEASES, TEMPLATES } from "./registry.js";
import { STANDARD } from "./standard.js";
import type { Template } from "./types.js";

type Doc = { document_id: string; nodes: LooseNodes };
type LooseNode = LooseNodes[string];

/** New IDs as `new_<n>`, unused in the fixtures. */
function ids() {
  let n = 0;
  return () => `new_${++n}`;
}

/** Makes a page from a layout and adds it to the document, returning the page's nodes. */
function addFromLayout(doc: Doc, template: Template, layoutId: string, title = "Nová") {
  const made = pageFromLayout(doc, template, layoutId, { title, slug: "nova", newId: ids() });
  if (!made) throw new Error(`no layout ${layoutId}`);
  for (const node of made.nodes) doc.nodes[node.id] = node;
  doc.nodes[doc.document_id].pages.nodes.push(made.pageId);
  const byId = new Map(made.nodes.map((n) => [n.id, n]));
  const page = byId.get(made.pageId) as LayoutNode & { blocks: { nodes: string[] } };
  const blocks = page.blocks.nodes.map((id) => byId.get(id) as LooseNode);
  return { page, blocks, nodes: made.nodes };
}

const paragraphs = (doc: Doc, block: LooseNode) =>
  (block.body.nodes as string[]).map((id) => doc.nodes[id]?.content.content as string);

describe("shared layouts", () => {
  it("Shared layouts offered", () => {
    expect(STANDARD.layouts.map((l) => l.name.en)).toEqual([
      "Home",
      "Services",
      "About us",
      "Team",
      "Contact",
      "FAQ",
      "Careers",
    ]);
  });

  it("have the blocks the spec lists, in order", () => {
    const blocks = Object.fromEntries(
      STANDARD.layouts.map((l) => [l.id, l.blocks.map((b) => b.type)]),
    );
    expect(blocks).toEqual({
      home: ["hero", "rich_text", "services", "testimonials", "call_to_action"],
      services: ["rich_text", "services", "call_to_action"],
      about: ["rich_text", "team", "call_to_action"],
      team: ["rich_text", "team"],
      contact: ["contact", "opening_hours", "rich_text"],
      faq: ["faq", "rich_text"],
      careers: ["rich_text", "jobs", "call_to_action"],
    });
  });
});

describe("making a page from a layout", () => {
  it("Services page filled in", () => {
    const { doc } = editableDemoSite();
    const { page, blocks } = addFromLayout(doc as Doc, STANDARD, "services", "Služby");
    expect(page).toMatchObject({ title: "Služby", slug: "nova", translation_key: page.id });
    expect(blocks.map((b) => b.type)).toEqual(["rich_text", "services", "call_to_action"]);
    expect(blocks[1]).toMatchObject({ show: "all", layout: "cards", hidden: false });
    expect(validateSite(doc, { templates: TEMPLATE_RELEASES }).valid).toBe(true);
  });

  it("Czech starting texts", () => {
    const { doc } = editableDemoSite();
    const { blocks } = addFromLayout(doc as Doc, STANDARD, "contact");
    expect(paragraphs(doc as Doc, blocks[2])).toEqual([
      "Jak k nám",
      "Popište, kudy se k vám dostat a kde zaparkovat, nebo na koho se obrátit s čím.",
    ]);
    expect(blocks[1]?.heading.content).toBe("Otevírací doba");
  });

  it("German site", () => {
    const { doc, nodes } = editableDemoSite();
    nodes.site_1.lang = "de";
    const { blocks } = addFromLayout(doc as Doc, STANDARD, "careers");
    expect(paragraphs(doc as Doc, blocks[0])).toEqual([
      "Work with us",
      "Whom you're looking for, what you offer and how to apply.",
    ]);
    expect(blocks[1]?.empty_note.content).toBe(
      "We have no openings right now, but you're welcome to send us your CV.",
    );
  });

  it("puts the site's name and description in the hero, as plain text", () => {
    const { doc, nodes } = editableDemoSite();
    nodes.site_1.name = "Pekárna *U Lípy*";
    const { blocks } = addFromLayout(doc as Doc, STANDARD, "home");
    expect(blocks[0]?.heading).toEqual({ content: "Pekárna *U Lípy*", marks: [], annotations: [] });
    expect(blocks[0]?.text.content).toBe(nodes.site_1.description);
    expect(blocks[0]?.layout).toBe("beside");
  });

  it("Call to action with an email", () => {
    const { doc, nodes } = editableDemoSite();
    nodes.location_1.email = "info@pekarna.cz";
    nodes.location_1.phone = "+420321123456";
    const { blocks, nodes: made } = addFromLayout(doc as Doc, STANDARD, "about");
    const button = made.find((n) => n.id === blocks[2]?.actions.nodes[0]);
    expect(button).toMatchObject({ type: "external_link", url: "mailto:info@pekarna.cz" });
    expect(button?.label).toMatchObject({ content: "Napište nám" });
  });

  it("Call to action without email", () => {
    const { doc, nodes } = editableDemoSite();
    nodes.location_1.phone = "+420 321 123 456";
    const { blocks, nodes: made } = addFromLayout(doc as Doc, STANDARD, "about");
    const button = made.find((n) => n.id === blocks[2]?.actions.nodes[0]);
    expect(button).toMatchObject({ type: "external_link", url: "tel:+420321123456" });
  });

  it("gives a call to action no button without an email or a phone", () => {
    const { doc } = editableDemoSite();
    const { blocks } = addFromLayout(doc as Doc, STANDARD, "about");
    expect(blocks[2]?.actions.nodes).toEqual([]);
  });

  it("takes the template's looks where the recipe sets none", () => {
    const { doc } = editableDemoSite();
    const t: Template = { ...STANDARD, looks: { ...STANDARD.looks, hero: "cover", team: "list" } };
    expect(addFromLayout(doc as Doc, t, "home").blocks[0]?.layout).toBe("cover");
    expect(addFromLayout(doc as Doc, t, "team").blocks[1]?.layout).toBe("list");
  });

  it("No link back: the page records nothing about its layout", () => {
    const { doc } = editableDemoSite();
    const { nodes } = addFromLayout(doc as Doc, STANDARD, "home");
    expect(JSON.stringify(nodes)).not.toContain('"home"');
  });

  it("leaves the document alone, and knows no other layouts", () => {
    const { doc } = editableDemoSite();
    const before = structuredClone(doc);
    pageFromLayout(doc, STANDARD, "home", { title: "Úvod", slug: "uvod-2", newId: ids() });
    expect(doc).toEqual(before);
    expect(pageFromLayout(doc, STANDARD, "menu", { title: "x", slug: "x", newId: ids() })).toBe(
      undefined,
    );
  });
});

describe("template layout checks", () => {
  const FIXTURES = ["demo-site.json", "image-blocks-site.json", "starter-site.json"];

  /** Errors of the document after adding each layout of the template, by layout. */
  function layoutErrors(template: Template, fixture: string) {
    return template.layouts.flatMap((layout) => {
      const doc = loadFixture(fixture) as Doc;
      // The fixture site, using the template.
      Object.assign(doc.nodes[doc.document_id], {
        template: template.id,
        template_release: template.release,
      });
      addFromLayout(doc, template, layout.id);
      return validateSite(doc, { templates: new Map([[template.id, template.release]]) })
        .problems.filter((p) => p.severity === "error")
        .map((p) => `Template "${template.id}", layout "${layout.id}" on ${fixture}: ${p.message}`);
    });
  }

  it.each(FIXTURES)("every layout of every template makes a valid page on %s", (fixture) => {
    for (const template of TEMPLATES) expect(layoutErrors(template, fixture)).toEqual([]);
  });

  it("Layout makes an invalid page", () => {
    const broken: Template = {
      ...STANDARD,
      id: "broken",
      layouts: [
        ...STANDARD.layouts,
        {
          id: "bad-cta",
          name: { cs: "Špatná", en: "Bad" },
          description: { cs: "", en: "" },
          blocks: [{ type: "call_to_action", heading: { cs: " ", en: " " }, buttons: "contact" }],
        },
      ],
    };
    expect(layoutErrors(broken, "demo-site.json")).toEqual([
      `Template "broken", layout "bad-cta" on demo-site.json: The call to action on "Nová" needs a heading.`,
    ]);
  });
});
