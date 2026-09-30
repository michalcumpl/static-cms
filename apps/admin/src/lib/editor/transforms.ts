import type { Transaction } from "svedit";

type Tr = Transaction;
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

export type BlockType = "hero" | "rich_text" | "services";

export const blockInserters: Record<BlockType, (tr: Tr) => boolean> = {
  hero: insertHero,
  rich_text: insertRichText,
  services: insertServices,
};

/** Block types that may be inserted at `index` of a page's blocks (hero: top only, once). */
export function insertableBlocks(blocks: { type: string }[], index: number): BlockType[] {
  const heroAllowed = index === 0 && !blocks.some((b) => b.type === "hero");
  return heroAllowed ? ["hero", "rich_text", "services"] : ["rich_text", "services"];
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
}

/**
 * Puts an image into a hero, or replaces its image. A different image starts without alt
 * text (the old description would describe the wrong picture); choosing the same image again
 * keeps its alt text and decorative flag. Returns the image node's ID.
 */
export function setHeroImage(tr: Tr, heroId: string, image: ChosenImage): string {
  const hero = tr.get(heroId) as { image: { nodes: string[] } };
  const [existing] = hero.image.nodes;
  if (existing) {
    const current = tr.get(existing) as { src: string };
    if (current.src !== image.key) {
      tr.set([existing, "alt"], "");
      tr.set([existing, "decorative"], false);
    }
    tr.set([existing, "src"], image.key);
    tr.set([existing, "width"], image.width);
    tr.set([existing, "height"], image.height);
    return existing;
  }
  const id = tr.generate_id();
  tr.create({
    id,
    type: "image",
    src: image.key,
    alt: "",
    decorative: false,
    width: image.width,
    height: image.height,
  });
  tr.set([heroId, "image"], list([id]));
  return id;
}

/** Takes the image out of a hero; undo brings it back with its alt text. */
export function removeHeroImage(tr: Tr, heroId: string): boolean {
  const hero = tr.get(heroId) as { image: { nodes: string[] } };
  if (hero.image.nodes.length === 0) return false;
  tr.set([heroId, "image"], list());
  return true;
}
