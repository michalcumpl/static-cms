import { slideClip, videoEmbed } from "@webmio/model";
import { siteStrings } from "@webmio/render";
import type { DocumentPath, Transaction } from "svedit";
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
    slug: "",
    body: list(),
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

/** The most slides a hero slideshow holds (hero-slideshow design decision 2). */
export const MAX_SLIDES = 8;

export function createSlide(tr: Tr): string {
  const id = tr.generate_id();
  tr.create({
    id,
    type: "slide",
    image: list(),
    title: text(),
    clip_url: "",
    target_id: "",
    url: "",
  });
  return id;
}

/** An empty slide (Enter and "Add item"); none past eight. */
export function insertSlide(tr: Tr): boolean {
  const at = insertionPoint(tr);
  const count = at ? ((tr.get(at.path) as NodeList | undefined)?.nodes.length ?? 0) : 0;
  if (count >= MAX_SLIDES) return false;
  insertAndFocus(tr, createSlide(tr), "title");
  return true;
}

/**
 * Sets a slide's clip when it is an MP4 file on Vimeo, or clears it with ""; false, changing
 * nothing, for anything else (hero-slideshow, "Changes made while building").
 */
export function setSlideClip(tr: Tr, slideId: string, url: string): boolean {
  const clip = url.trim();
  if (clip !== "" && !slideClip(clip)) return false;
  tr.set([slideId, "clip_url"], clip);
  return true;
}

/** The most cards a cards block holds (cards design decision 2). */
export const MAX_CARDS = 12;

function createCard(tr: Tr): string {
  const id = tr.generate_id();
  tr.create({
    id,
    type: "card",
    image: list(),
    title: text(),
    text: text(),
    target_id: "",
    url: "",
  });
  return id;
}

/** An empty card (Enter and "Add item"); none past twelve. */
export function insertCard(tr: Tr): boolean {
  const at = insertionPoint(tr);
  const count = at ? ((tr.get(at.path) as NodeList | undefined)?.nodes.length ?? 0) : 0;
  if (count >= MAX_CARDS) return false;
  insertAndFocus(tr, createCard(tr), "title");
  return true;
}

/** Cards: an empty heading, text under the photo, three empty cards, the caret in the first title. */
export function insertCards(tr: Tr): boolean {
  const items = [createCard(tr), createCard(tr), createCard(tr)];
  const block = tr.generate_id();
  tr.create({ id: block, type: "cards", heading: text(), layout: "below", items: list(items) });
  insertAndFocus(tr, block, "items", 0, "title");
  return true;
}

function createVideo(tr: Tr): string {
  const id = tr.generate_id();
  tr.create({ id, type: "video", url: "", title: text(), caption: text(), poster: list() });
  return id;
}

/** An empty video (Enter and "Add item"); none past twelve. */
export function insertVideo(tr: Tr): boolean {
  const at = insertionPoint(tr);
  const count = at ? ((tr.get(at.path) as NodeList | undefined)?.nodes.length ?? 0) : 0;
  if (count >= MAX_CARDS) return false;
  insertAndFocus(tr, createVideo(tr), "title");
  return true;
}

/** Videos: an empty heading and one empty video, the caret in its title. */
export function insertVideos(tr: Tr): boolean {
  const block = tr.generate_id();
  tr.create({ id: block, type: "videos", heading: text(), items: list([createVideo(tr)]) });
  insertAndFocus(tr, block, "items", 0, "title");
  return true;
}

/**
 * Sets a video's address when it is a YouTube or Vimeo video (video design decision 4); false,
 * changing nothing, for anything else.
 */
export function setVideoUrl(tr: Tr, videoId: string, url: string): boolean {
  if (!videoEmbed(url)) return false;
  tr.set([videoId, "url"], url.trim());
  return true;
}

/** An empty fact of a project (Enter in a fact's value). */
export function insertFact(tr: Tr): boolean {
  const id = tr.generate_id();
  tr.create({ id, type: "fact", label: text(), value: text() });
  insertAndFocus(tr, id, "label");
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

/** An empty job: a title to fill, and one empty paragraph to start its description in. */
function createJob(tr: Tr): string {
  const paragraph = tr.generate_id();
  tr.create({ id: paragraph, type: "paragraph", content: text() });
  const id = tr.generate_id();
  tr.create({
    id,
    type: "job",
    title: text(),
    summary: text(),
    body: list([paragraph]),
    contact_name: text(),
    contact_email: "",
    contact_phone: "",
  });
  return id;
}

/** An empty job (Enter and "Add item"); none past twelve. */
export function insertJob(tr: Tr): boolean {
  const at = insertionPoint(tr);
  const count = at ? ((tr.get(at.path) as NodeList | undefined)?.nodes.length ?? 0) : 0;
  if (count >= MAX_CARDS) return false;
  insertAndFocus(tr, createJob(tr), "title");
  return true;
}

/** Jobs: the heading in the site's language, no note, one empty job with the caret in its title. */
export function insertJobs(tr: Tr): boolean {
  const block = tr.generate_id();
  tr.create({
    id: block,
    type: "jobs",
    heading: text(stringsOf(tr).jobsHeading),
    empty_note: text(),
    items: list([createJob(tr)]),
  });
  insertAndFocus(tr, block, "items", 0, "title");
  return true;
}

/** Gives a job without a description an empty paragraph, with the caret in it. */
export function addJobDescription(tr: Tr, jobPath: DocumentPath): boolean {
  const paragraph = tr.generate_id();
  tr.create({ id: paragraph, type: "paragraph", content: text() });
  tr.set([...jobPath, "body"], list([paragraph]));
  tr.set_selection({
    type: "text",
    path: [...jobPath, "body", 0, "content"],
    anchor_offset: 0,
    focus_offset: 0,
  });
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
  type: "services" | "team" | "testimonials" | "faq" | "projects",
  collection: "services" | "team" | "testimonials" | "faqs" | "projects",
  heading: string,
  first?: (tr: Tr) => string,
) {
  return (tr: Tr): boolean => {
    const siteId = tr.doc.document_id;
    const members = (tr.get([siteId, collection]) as NodeList | undefined)?.nodes ?? [];
    if (members.length === 0 && first) tr.set([siteId, collection], list([first(tr)]));
    const block = tr.generate_id();
    const layout =
      type === "services" || type === "team"
        ? { layout: "cards" }
        : type === "projects"
          ? { category_id: "", limit: 0 }
          : {};
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
    slug: "",
    body: list(),
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
    slides: list(),
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

/** A projects block showing every project of every category (collection-pages). */
export const insertProjects = insertCollectionBlock("projects", "projects", "Projekty");

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
  | "steps"
  | "projects"
  | "cards"
  | "videos"
  | "jobs";

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
  projects: insertProjects,
  cards: insertCards,
  videos: insertVideos,
  jobs: insertJobs,
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
    "projects",
    "cards",
    "videos",
    "jobs",
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

/** The property holding an owner's 0..1 image: a project's cover, everyone else's image. */
export function imagePropertyOf(ownerType: string | undefined): "image" | "cover" | "poster" {
  if (ownerType === "project") return "cover";
  return ownerType === "video" ? "poster" : "image";
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
  const owner = tr.get(ownerId) as { type: string } & Record<string, { nodes: string[] }>;
  const property = imagePropertyOf(owner.type);
  const [existing] = owner[property]?.nodes ?? [];
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
  tr.set([ownerId, property], list([id]));
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
  const owner = tr.get(ownerId) as { type: string } & Record<string, { nodes: string[] }>;
  const property = imagePropertyOf(owner.type);
  if ((owner[property]?.nodes.length ?? 0) === 0) return false;
  tr.set([ownerId, property], list());
  return true;
}

/** Puts a text with image block's image on the left or the right of its text. */
export function setImageSide(tr: Tr, blockId: string, side: "left" | "right"): boolean {
  tr.set([blockId, "image_side"], side);
  return true;
}

/** Where a card links: a page, a project or service with its own page, an address, or nowhere. */
export type ItemLink = { page: string } | { item: string } | { address: string } | null;

/**
 * Sets a card's link (cards design decision 4). Refused addresses leave the card unchanged and
 * return why.
 */
export function setItemLink(
  tr: Tr,
  cardId: string,
  link: ItemLink,
): LinkAddressCheck | { ok: true } {
  if (link && "address" in link) {
    const check = checkLinkAddress(link.address);
    if (!check.ok) return check;
    tr.set([cardId, "target_id"], "");
    tr.set([cardId, "url"], check.href);
    return check;
  }
  tr.set([cardId, "target_id"], link ? ("page" in link ? link.page : link.item) : "");
  tr.set([cardId, "url"], "");
  return { ok: true };
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
