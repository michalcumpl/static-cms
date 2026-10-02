import { siteStrings } from "@static-cms/site";
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

export function insertServices(tr: Tr): boolean {
  const item = tr.generate_id();
  const block = tr.generate_id();
  tr.create({
    id: item,
    type: "service_item",
    name: text("Nová služba"),
    description: text(),
    price: text(),
  });
  tr.create({ id: block, type: "services", heading: text("Služby"), items: list([item]) });
  insertAndFocus(tr, block, "heading");
  return true;
}

export function insertHero(tr: Tr): boolean {
  const block = tr.generate_id();
  tr.create({
    id: block,
    type: "hero",
    heading: text("Nadpis"),
    text: text(),
    image: list(),
    action: list(),
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

/** A gallery, team or logos block with a placeholder heading and no items yet. */
function insertItemsBlock(type: "gallery" | "team" | "logos", items: "items" | "people") {
  return (tr: Tr): boolean => {
    const block = tr.generate_id();
    tr.create({ id: block, type, heading: text("Nadpis"), [items]: list() });
    insertAndFocus(tr, block, "heading");
    return true;
  };
}

export const insertGallery = insertItemsBlock("gallery", "items");
export const insertTeam = insertItemsBlock("team", "people");
export const insertLogos = insertItemsBlock("logos", "items");

/** A person without a portrait (Enter at the end of a person, or "Add item"). */
export function insertPerson(tr: Tr): boolean {
  const id = tr.generate_id();
  tr.create({ id, type: "person", name: text(), role: text(), text: text(), image: list() });
  insertAndFocus(tr, id, "name");
  return true;
}

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
  });
  insertAndFocus(tr, block, "heading");
  return true;
}

/** An opening hours block with a placeholder heading. */
export function insertOpeningHours(tr: Tr): boolean {
  const block = tr.generate_id();
  tr.create({ id: block, type: "opening_hours", heading: text(stringsOf(tr).hoursHeading) });
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

/** A testimonials block with a placeholder heading and one empty testimonial. */
export function insertTestimonials(tr: Tr): boolean {
  const block = tr.generate_id();
  tr.create({
    id: block,
    type: "testimonials",
    heading: text("Nadpis"),
    items: list([createTestimonial(tr)]),
  });
  insertAndFocus(tr, block, "heading");
  return true;
}

/** An empty testimonial (Enter at the end of one, or "Add item"). */
export function insertTestimonial(tr: Tr): boolean {
  const id = createTestimonial(tr);
  insertAndFocus(tr, id, "quote");
  return true;
}

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
  | "testimonials";

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
  const block = tr.get(blockId) as { type: string; items?: NodeList; people?: NodeList };
  const property = block.type === "team" ? "people" : "items";
  const existing = (block[property] as NodeList | undefined)?.nodes ?? [];
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
  tr.set([blockId, property], list([...existing, ...added]));
  return added;
}
