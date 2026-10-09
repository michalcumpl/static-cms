import { type BlockInput, createBlockNodes, type LinkInput, type NodeType } from "@webmio/model";
import type { LayoutBlock, Localized, Template } from "./types.js";

/** A node as `pageFromLayout` makes it, ready to store in a document. */
export type LayoutNode = { id: string; type: NodeType; [key: string]: unknown };

/** A document's nodes, read loosely: the caller may hold a draft that isn't valid yet. */
type LooseDocument = {
  document_id: string;
  nodes: Record<string, { [key: string]: unknown } | undefined>;
};

export interface PageFromLayoutOptions {
  title: string;
  /** Unique within the site; the caller makes it, as adding a page does. */
  slug: string;
  /** A new node ID, unused in the document. */
  newId: (type: NodeType) => string;
}

/** The labels of a call to action's contact button. */
const CONTACT_LABELS = {
  email: { cs: "Napište nám", en: "Email us" },
  phone: { cs: "Zavolejte nám", en: "Call us" },
} as const;

const list = (nodes: string[] = []) => ({ nodes, marks: [], annotations: [] });
const plain = (content: string) => ({ content, marks: [], annotations: [] });

/**
 * A new page made from one of the template's layouts (templates spec, "Making a page from a
 * layout"): its nodes, children before the nodes that hold them and the page last, under new IDs.
 * Collection blocks show their whole collection; looks the recipe leaves out are the template's;
 * the hero takes the site's name and description when the recipe says so; each call to action
 * gets a button to the business's email, else its phone, else none; the other texts are the
 * layout's starting texts in the site's language (English for languages other than Czech).
 * Nothing in the page refers back to the layout. Undefined when the template has no such layout.
 * The document isn't changed.
 */
export function pageFromLayout(
  document: unknown,
  template: Template,
  layoutId: string,
  options: PageFromLayoutOptions,
): { pageId: string; nodes: LayoutNode[] } | undefined {
  const layout = template.layouts.find((l) => l.id === layoutId);
  if (!layout) return undefined;
  const doc = document as LooseDocument;
  const site = doc.nodes[doc.document_id] ?? {};
  const czech =
    String(site.lang ?? "")
      .split("-")[0]
      ?.toLowerCase() === "cs";
  const pick = (text: Localized) => (czech ? text.cs : text.en);
  const contact = contactLink(doc, site, pick);
  const pageId = (slug: string) => {
    const pages = (site.pages as { nodes?: string[] } | undefined)?.nodes ?? [];
    const id = pages.find((p) => doc.nodes[p]?.slug === slug);
    if (!id) throw new Error(`No page with the slug "${slug}".`);
    return id;
  };

  const nodes: LayoutNode[] = [];
  const blockIds = layout.blocks.map((recipe) => {
    const made = createBlockNodes(blockInput(recipe, template, pick, contact), {
      newId: options.newId,
      pageId,
    });
    nodes.push(...made.nodes);
    if (recipe.type === "hero") {
      // Set as plain text: the site's name and description aren't in the inline syntax.
      const hero = nodes.find((n) => n.id === made.id);
      if (hero && "from" in recipe.heading) hero.heading = plain(String(site.name ?? ""));
      if (hero && recipe.text && "from" in recipe.text) {
        hero.text = plain(String(site.description ?? ""));
      }
    }
    return made.id;
  });

  const id = options.newId("page");
  nodes.push({
    id,
    type: "page",
    title: options.title,
    slug: options.slug,
    seo_description: "",
    // Its own key: not paired with a page in another language.
    translation_key: id,
    share_image: list(),
    blocks: list(blockIds),
  });
  return { pageId: id, nodes };
}

/** The builder's input for one block of a recipe. */
function blockInput(
  recipe: LayoutBlock,
  template: Template,
  pick: (text: Localized) => string,
  contact: LinkInput | undefined,
): BlockInput {
  const heading = (text?: Localized) => (text ? pick(text) : "");
  switch (recipe.type) {
    case "hero":
      return {
        type: "hero",
        heading: "from" in recipe.heading ? "" : pick(recipe.heading),
        text: !recipe.text || "from" in recipe.text ? "" : pick(recipe.text),
        layout: recipe.layout ?? template.looks.hero,
      };
    case "rich_text":
      return { type: "rich_text", body: pick(recipe.body) };
    case "services":
    case "team":
      return {
        type: recipe.type,
        heading: heading(recipe.heading),
        layout: recipe.layout ?? template.looks[recipe.type],
      };
    case "testimonials":
    case "faq":
    case "projects":
    case "contact":
    case "opening_hours":
      return { type: recipe.type, heading: heading(recipe.heading) };
    case "call_to_action":
      return {
        type: "call_to_action",
        heading: pick(recipe.heading),
        text: heading(recipe.text),
        actions: contact ? [contact] : [],
      };
    case "jobs":
      return { type: "jobs", heading: heading(recipe.heading), note: pick(recipe.note), items: [] };
    case "figures":
      return {
        type: "figures",
        heading: heading(recipe.heading),
        items: recipe.items.map((i) => ({ value: pick(i.value), label: pick(i.label) })),
      };
    case "steps":
      return {
        type: "steps",
        heading: pick(recipe.heading),
        items: recipe.items.map((i) => ({ title: pick(i.title), text: heading(i.text) })),
      };
  }
}

/** A button to the main location's email, else its phone; undefined without either. */
function contactLink(
  doc: LooseDocument,
  site: { [key: string]: unknown },
  pick: (text: Localized) => string,
): LinkInput | undefined {
  const business = doc.nodes[String(site.business)];
  const mainId = (business?.locations as { nodes?: string[] } | undefined)?.nodes?.[0];
  const main = mainId ? doc.nodes[mainId] : undefined;
  const email = String(main?.email ?? "").trim();
  if (email !== "") return { label: pick(CONTACT_LABELS.email), url: `mailto:${email}` };
  const phone = String(main?.phone ?? "").replace(/[\s-]/g, "");
  if (phone !== "") return { label: pick(CONTACT_LABELS.phone), url: `tel:${phone}` };
  return undefined;
}
