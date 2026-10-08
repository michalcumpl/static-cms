import { siteStrings } from "@webmio/render";
import type { Transaction } from "svedit";
import { checkLinkAddress, type LinkAddressCheck } from "./links";

type Tr = Transaction;
type NodeList = { nodes: string[] };
type TextValue = { content: string; marks: never[]; annotations: never[] };
type NodeSelection = {
  type: "node";
  path: (string | number)[];
  anchor_offset: number;
  focus_offset: number;
};

export function text(content = ""): TextValue {
  return { content, marks: [], annotations: [] };
}

export function list(nodes: string[] = []) {
  return { nodes, marks: [], annotations: [] };
}

/** The collapsed node selection an insertion happens at, or undefined. */
function insertionPoint(tr: Tr): NodeSelection | undefined {
  const selection = tr.selection as NodeSelection | null;
  if (selection?.type !== "node") return undefined;
  return selection;
}

/** Inserts `id` at the current node selection and puts the caret at `focus` inside it. */
function insertAndFocus(tr: Tr, id: string, ...focus: (string | number)[]): void {
  const at = insertionPoint(tr);
  tr.insert_nodes([id]);
  if (!at) return;
  const index = Math.min(at.anchor_offset, at.focus_offset);
  tr.set_selection({
    type: "text",
    path: [...at.path, index, ...focus],
    anchor_offset: 0,
    focus_offset: 0,
  });
}

// Placeholder texts are Czech like the demo site; see design.md Open Questions.

export function insertParagraph(tr: Tr, content: TextValue = text()): boolean {
  const id = tr.generate_id();
  tr.create({ id, type: "paragraph", content });
  insertAndFocus(tr, id, "content");
  return true;
}

export function insertListItem(tr: Tr, content: TextValue = text()): boolean {
  const id = tr.generate_id();
  tr.create({ id, type: "list_item", content });
  insertAndFocus(tr, id, "content");
  return true;
}

// Svedit's inserters for the collections (Enter at the end of an item, or typing in a gap of a
// block that shows a whole collection): they insert at the node selection.

export function insertServiceItem(tr: Tr): boolean {
  const id = tr.generate_id();
  tr.create({
    id,
    type: "service_item",
    name: text("Nová služba"),
    description: text(),
    price: text(),
  });
  insertAndFocus(tr, id, "name");
  return true;
}

/** A person without a portrait. */
export function insertPerson(tr: Tr): boolean {
  const id = tr.generate_id();
  tr.create({ id, type: "person", name: text(), role: text(), text: text(), image: list() });
  insertAndFocus(tr, id, "name");
  return true;
}

/** An empty testimonial. */
export function insertTestimonial(tr: Tr): boolean {
  const id = createTestimonial(tr);
  insertAndFocus(tr, id, "quote");
  return true;
}

/** A placeholder question. */
export function insertFaqItem(tr: Tr): boolean {
  const id = tr.generate_id();
  tr.create({ id, type: "faq_item", question: text("Nová otázka"), answer: text() });
  insertAndFocus(tr, id, "question");
  return true;
}

/** At most this many figures in a key figures block (figures-and-steps design decision 2). */
export const MAX_FIGURES = 6;

function createFigure(tr: Tr): string {
  const id = tr.generate_id();
  tr.create({ id, type: "figure", value: text(), label: text() });
  return id;
}

function createStep(tr: Tr): string {
  const id = tr.generate_id();
  tr.create({ id, type: "step", title: text(), text: text() });
  return id;
}

/** An empty figure, unless the block already has six (Enter and "Add item"). */
export function insertFigure(tr: Tr): boolean {
  const at = insertionPoint(tr);
  const count = at ? ((tr.get(at.path) as NodeList | undefined)?.nodes.length ?? 0) : 0;
  if (count >= MAX_FIGURES) return false;
  insertAndFocus(tr, createFigure(tr), "value");
  return true;
}

/** An empty step (Enter and "Add item"). */
export function insertStep(tr: Tr): boolean {
  insertAndFocus(tr, createStep(tr), "title");
  return true;
}

/** Key figures: no heading and three empty figures, the caret in the first value. */
export function insertFigures(tr: Tr): boolean {
  const items = [createFigure(tr), createFigure(tr), createFigure(tr)];
  const block = tr.generate_id();
  tr.create({ id: block, type: "figures", heading: text(), items: list(items) });
  insertAndFocus(tr, block, "items", 0, "value");
  return true;
}

/** Steps: a placeholder heading and three empty steps, the caret in the heading. */
export function insertSteps(tr: Tr): boolean {
  const items = [createStep(tr), createStep(tr), createStep(tr)];
  const block = tr.generate_id();
  tr.create({ id: block, type: "steps", heading: text("Jak to funguje"), items: list(items) });
  insertAndFocus(tr, block, "heading");
  return true;
}

/** Creates a text block with a placeholder subheading and an empty paragraph; returns its ID. */
export function createRichText(tr: Tr): string {
  const heading = tr.generate_id();
  const paragraph = tr.generate_id();
  const block = tr.generate_id();
  tr.create({ id: heading, type: "subheading", content: text("Nadpis"), level: 2 });
  tr.create({ id: paragraph, type: "paragraph", content: text() });
  tr.create({ id: block, type: "rich_text", body: list([heading, paragraph]) });
  return block;
}

export function insertRichText(tr: Tr): boolean {
  insertAndFocus(tr, createRichText(tr), "body", 0, "content");
  return true;
}

/**
 * A block showing a whole collection (business-collections). When the collection is still
 * empty, `first` creates its first item, so the new block has something to edit.
 */
function insertCollectionBlock(
  type: "services" | "team" | "testimonials" | "faq",
  collection: "services" | "team" | "testimonials" | "faqs",
  heading: string,
  first?: (tr: Tr) => string,
) {
  return (tr: Tr): boolean => {
    const siteId = tr.doc.document_id;
    const members = (tr.get([siteId, collection]) as NodeList | undefined)?.nodes ?? [];
    if (members.length === 0 && first) tr.set([siteId, collection], list([first(tr)]));
    const block = tr.generate_id();
    const layout = type === "services" || type === "team" ? { layout: "cards" } : {};
    tr.create({ id: block, type, heading: text(heading), show: "all", chosen: list(), ...layout });
    insertAndFocus(tr, block, "heading");
    return true;
  };
}

export const insertServices = insertCollectionBlock("services", "services", "Služby", (tr) => {
  const id = tr.generate_id();
  tr.create({
    id,
    type: "service_item",
    name: text("Nová služba"),
    description: text(),
    price: text(),
  });
  return id;
});

export function insertHero(tr: Tr): boolean {
  const block = tr.generate_id();
  tr.create({
    id: block,
    type: "hero",
    heading: text("Nadpis"),
    text: text(),
    image: list(),
    action: list(),
    layout: "beside",
  });
  insertAndFocus(tr, block, "heading");
  return true;
}

/** A text block with a placeholder heading, an empty paragraph and no image yet. */
export function insertTextWithImage(tr: Tr): boolean {
  const paragraph = tr.generate_id();
  const block = tr.generate_id();
  tr.create({ id: paragraph, type: "paragraph", content: text() });
  tr.create({
    id: block,
    type: "text_with_image",
    heading: text("Nadpis"),
    body: list([paragraph]),
    image: list(),
    image_side: "right",
  });
  insertAndFocus(tr, block, "heading");
  return true;
}

/** A gallery or logos block with a placeholder heading and no items yet. */
function insertItemsBlock(type: "gallery" | "logos", items: "items") {
  return (tr: Tr): boolean => {
    const block = tr.generate_id();
    const fit = type === "gallery" ? { image_fit: "fill" } : {};
    tr.create({ id: block, type, heading: text("Nadpis"), [items]: list(), ...fit });
    insertAndFocus(tr, block, "heading");
    return true;
  };
}

export const insertGallery = insertItemsBlock("gallery", "items");
/** A team block: people are added from the library, so an empty team starts empty. */
export const insertTeam = insertCollectionBlock("team", "team", "Nadpis");
export const insertLogos = insertItemsBlock("logos", "items");

/** Strings in the site's language, for placeholder headings of business blocks. */
function stringsOf(tr: Tr) {
  const site = tr.doc.nodes[tr.doc.document_id] as unknown as { lang?: string };
  return siteStrings(site?.lang ?? "");
}

/** A contact block showing every part of the business details, with a placeholder heading. */
export function insertContact(tr: Tr): boolean {
  const block = tr.generate_id();
  tr.create({
    id: block,
    type: "contact",
    heading: text(stringsOf(tr).contactHeading),
    show_address: true,
    show_phone: true,
    show_email: true,
    show_map: true,
    location_id: "",
  });
  insertAndFocus(tr, block, "heading");
  return true;
}

/** An opening hours block with a placeholder heading. */
export function insertOpeningHours(tr: Tr): boolean {
  const block = tr.generate_id();
  tr.create({
    id: block,
    type: "opening_hours",
    heading: text(stringsOf(tr).hoursHeading),
    location_id: "",
  });
  insertAndFocus(tr, block, "heading");
  return true;
}

/** A call to action with a placeholder heading and one button to the home page. */
export function insertCallToAction(tr: Tr): boolean {
  const site = tr.doc.nodes[tr.doc.document_id] as unknown as { home_page_id: string };
  const button = tr.generate_id();
  tr.create({ id: button, type: "page_link", label: text("Tlačítko"), page_id: site.home_page_id });
  const block = tr.generate_id();
  tr.create({
    id: block,
    type: "call_to_action",
    heading: text("Nadpis"),
    text: text(),
    actions: list([button]),
  });
  insertAndFocus(tr, block, "heading");
  return true;
}

function createTestimonial(tr: Tr): string {
  const id = tr.generate_id();
  tr.create({
    id,
    type: "testimonial",
    quote: text(),
    name: text(),
    detail: text(),
    image: list(),
  });
  return id;
}

/** A testimonials block; an empty collection gets one empty testimonial. */
export const insertTestimonials = insertCollectionBlock(
  "testimonials",
  "testimonials",
  "Nadpis",
  createTestimonial,
);

/** A questions block; an empty collection gets one placeholder question. */
export const insertFaq = insertCollectionBlock("faq", "faqs", "Časté dotazy", (tr) => {
  const id = tr.generate_id();
  tr.create({ id, type: "faq_item", question: text("Nová otázka"), answer: text() });
  return id;
});

export type BlockType =
  | "hero"
  | "rich_text"
  | "services"
  | "text_with_image"
  | "gallery"
  | "team"
  | "logos"
  | "contact"
  | "opening_hours"
  | "call_to_action"
  | "testimonials"
  | "faq"
  | "figures"
  | "steps";

export const blockInserters: Record<BlockType, (tr: Tr) => boolean> = {
  hero: insertHero,
  rich_text: insertRichText,
  services: insertServices,
  text_with_image: insertTextWithImage,
  gallery: insertGallery,
  team: insertTeam,
  logos: insertLogos,
  contact: insertContact,
  opening_hours: insertOpeningHours,
  call_to_action: insertCallToAction,
  testimonials: insertTestimonials,
  faq: insertFaq,
  figures: insertFigures,
  steps: insertSteps,
};

/** Block types that may be inserted at `index` of a page's blocks (hero: top only, once). */
export function insertableBlocks(blocks: { type: string }[], index: number): BlockType[] {
  // The hero stays first: nothing goes above it.
  if (index === 0 && blocks[0]?.type === "hero") return [];
  const heroAllowed = index === 0 && !blocks.some((b) => b.type === "hero");
  const others: BlockType[] = [
    "rich_text",
    "services",
    "text_with_image",
    "gallery",
    "team",
    "logos",
    "contact",
    "opening_hours",
    "call_to_action",
    "testimonials",
    "faq",
    "figures",
    "steps",
  ];
  return heroAllowed ? ["hero", ...others] : others;
}

/** Sets an image's alt text. */
export function setImageAlt(tr: Tr, imageId: string, alt: string): boolean {
  tr.set([imageId, "alt"], alt);
  return true;
}

/** Marks an image as decorative (which clears its alt text) or as informative. */
export function setImageDecorative(tr: Tr, imageId: string, decorative: boolean): boolean {
  tr.set([imageId, "decorative"], decorative);
  if (decorative) tr.set([imageId, "alt"], "");
  return true;
}

/** An image from the media library, as the document stores it. */
export interface ChosenImage {
  key: string;
  width: number;
  height: number;
  /** The uploaded file's name, for naming logos. */
  originalName?: string;
}

/**
 * Puts an image into its owner (a hero, text with image, person, gallery photo or logo), or
 * replaces the owner's image. A different image starts without alt text (the old description
 * would describe the wrong picture), or decorative when asked; choosing the same image again
 * keeps its alt text and decorative flag. Returns the image node's ID.
 */
export function setImage(
  tr: Tr,
  ownerId: string,
  image: ChosenImage,
  options: { decorative?: boolean } = {},
): string {
  const owner = tr.get(ownerId) as { image: { nodes: string[] } };
  const [existing] = owner.image.nodes;
  const decorative = options.decorative ?? false;
  if (existing) {
    const current = tr.get(existing) as { src: string };
    if (current.src !== image.key) {
      tr.set([existing, "alt"], "");
      tr.set([existing, "decorative"], decorative);
    }
    tr.set([existing, "src"], image.key);
    tr.set([existing, "width"], image.width);
    tr.set([existing, "height"], image.height);
    return existing;
  }
  const id = createImage(tr, image, decorative);
  tr.set([ownerId, "image"], list([id]));
  return id;
}

/** Creates an image node for a chosen image; returns its ID. */
export function createImage(tr: Tr, image: ChosenImage, decorative = false): string {
  const id = tr.generate_id();
  tr.create({
    id,
    type: "image",
    src: image.key,
    alt: "",
    decorative,
    width: image.width,
    height: image.height,
  });
  return id;
}

/** Takes the image out of its owner; undo brings it back with its alt text. */
export function removeImage(tr: Tr, ownerId: string): boolean {
  const owner = tr.get(ownerId) as { image: { nodes: string[] } };
  if (owner.image.nodes.length === 0) return false;
  tr.set([ownerId, "image"], list());
  return true;
}

/** Puts a text with image block's image on the left or the right of its text. */
export function setImageSide(tr: Tr, blockId: string, side: "left" | "right"): boolean {
  tr.set([blockId, "image_side"], side);
  return true;
}

/** Where a logo links: a page of the site, an address, or nowhere. */
export type LogoLink = { page: string } | { address: string } | null;

/**
 * Links a logo to a page or an address (checked like in the link dialog), or removes its link.
 * Refused addresses leave the logo unchanged and return why.
 */
export function setLogoLink(
  tr: Tr,
  logoId: string,
  link: LogoLink,
): LinkAddressCheck | { ok: true } {
  if (link && "address" in link) {
    const check = checkLinkAddress(link.address);
    if (!check.ok) return check;
    tr.set([logoId, "page_id"], "");
    tr.set([logoId, "url"], check.href);
    return check;
  }
  tr.set([logoId, "page_id"], link ? link.page : "");
  tr.set([logoId, "url"], "");
  return { ok: true };
}

/** What a logo is first called: the image's file name without its extension. */
export function logoNameFor(image: ChosenImage): string {
  return (image.originalName ?? image.key).replace(/\.[^.]*$/, "");
}

/**
 * Adds one item per image at the end of a gallery (a photo without a caption), a team (a person
 * with a placeholder name and a decorative portrait) or a logos block (a logo named after the
 * file), in the given order. Returns the new items' IDs.
 */
export function addItemsWithImages(tr: Tr, blockId: string, images: ChosenImage[]): string[] {
  const block = tr.get(blockId) as { type: string; items?: NodeList; show?: string };
  const siteId = tr.doc.document_id;
  // People join the site's team, and a block showing chosen people shows them too.
  const target: (string | number)[] = block.type === "team" ? [siteId, "team"] : [blockId, "items"];
  const existing = (tr.get(target) as NodeList | undefined)?.nodes ?? [];
  const added = images.map((image) => {
    const id = tr.generate_id();
    if (block.type === "gallery") {
      tr.create({
        id,
        type: "gallery_item",
        image: list([createImage(tr, image)]),
        caption: text(),
      });
    } else if (block.type === "team") {
      tr.create({
        id,
        type: "person",
        name: text("Jméno"),
        role: text(),
        text: text(),
        image: list([createImage(tr, image, true)]),
      });
    } else {
      tr.create({
        id,
        type: "logo_item",
        image: list([createImage(tr, image)]),
        name: text(logoNameFor(image)),
        page_id: "",
        url: "",
      });
    }
    return id;
  });
  tr.set(target, list([...existing, ...added]));
  if (block.type === "team" && block.show === "chosen") {
    const refs = added.map((item_id) => {
      const id = tr.generate_id();
      tr.create({ id, type: "item_ref", item_id });
      return id;
    });
    const chosen = (tr.get([blockId, "chosen"]) as NodeList | undefined)?.nodes ?? [];
    tr.set([blockId, "chosen"], list([...chosen, ...refs]));
  }
  return added;
}
