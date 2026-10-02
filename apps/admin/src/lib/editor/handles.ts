import type { DocumentPath, Session } from "svedit";
import { isFixedList, selectedNode } from "./structure";
import type { BlockType } from "./transforms";

// What the block and item handles act on, and how the editor names it (canvas-structure
// design.md decisions 2 and 5).

/** Block names as owners read them in a sentence ("Services block selected"). */
export const BLOCK_NAMES: Record<BlockType, string> = {
  hero: "Hero",
  rich_text: "Text",
  services: "Services",
  text_with_image: "Text with image",
  gallery: "Gallery",
  team: "Team",
  logos: "Partner logos",
  contact: "Contact",
  opening_hours: "Opening hours",
  call_to_action: "Call to action",
  testimonials: "Testimonials",
};

/** What each block shows, in a line, for the block picker. */
export const BLOCK_DESCRIPTIONS: Record<BlockType, string> = {
  hero: "The big opening: a heading, a short text, a photo and a button",
  rich_text: "Paragraphs, subheadings and bullet lists",
  services: "What you offer, with descriptions and prices",
  text_with_image: "A text beside a photo",
  gallery: "A grid of photos with captions",
  team: "The people behind the business, with portraits",
  logos: "Logos of partners or clients",
  contact: "Address, phone, email and map link, from the Business tab",
  opening_hours: "Your weekly hours, from the Business tab",
  call_to_action: "A short invitation with one or two buttons",
  testimonials: "What customers say about you",
};

/** Why a block type can't go at `index` of these blocks, or undefined when it can. */
export function unavailableReason(
  type: BlockType,
  blocks: { type: string }[],
  index: number,
): string | undefined {
  if (index === 0 && blocks[0]?.type === "hero") return "The hero stays at the top of the page";
  if (type !== "hero") return undefined;
  if (blocks.some((b) => b.type === "hero")) return "A page has only one hero";
  if (index !== 0) return "Only at the top of a page without a hero";
  return undefined;
}

/** Item names by node type, for the items that get a handle. */
export const ITEM_NAMES: Record<string, string> = {
  list_item: "List item",
  service_item: "Service",
  gallery_item: "Photo",
  person: "Person",
  logo_item: "Logo",
  testimonial: "Testimonial",
};

/** The block or item types whose lists hold items with handles, by list property. */
const ITEM_LISTS: Record<string, readonly string[]> = {
  items: ["list", "services", "gallery", "logos", "testimonials"],
  people: ["team"],
};

/** One block or item a handle acts on: its place in its list, its node and its type. */
export interface HandleTarget {
  /** The list it is in, e.g. `[site, "pages", 0, "blocks"]`. */
  listPath: DocumentPath;
  index: number;
  id: string;
  type: string;
  /** The node's own path: `listPath` plus `index`. */
  path: DocumentPath;
}

type NodeList = { nodes: string[] };

function target(session: Session, listPath: DocumentPath, index: number): HandleTarget | undefined {
  const id = (session.get(listPath) as NodeList | undefined)?.nodes[index];
  const node = id === undefined ? undefined : (session.get(id) as { type?: string } | undefined);
  if (id === undefined || !node?.type) return undefined;
  return { listPath, index, id, type: node.type, path: [...listPath, index] };
}

/**
 * The block, and the item inside it if any, that a document path is in: the path of a
 * node, of a text property, or of a list. Navigation, image slots, buttons and other fixed
 * lists have no item; a path outside a page's blocks has neither.
 */
export function handleTargets(
  session: Session,
  path: DocumentPath,
): { block?: HandleTarget; item?: HandleTarget } {
  const at = path.findIndex(
    (segment, i) =>
      segment === "blocks" && path[i - 2] === "pages" && typeof path[i + 1] === "number",
  );
  if (at < 0) return {};
  const block = target(session, path.slice(0, at + 1), path[at + 1] as number);
  if (!block) return {};
  let item: HandleTarget | undefined;
  for (let i = at + 2; i < path.length - 1; i++) {
    const property = path[i];
    const index = path[i + 1];
    if (typeof property !== "string" || typeof index !== "number") continue;
    const listPath = path.slice(0, i + 1);
    const owner = session.get(path.slice(0, i)) as { type?: string } | undefined;
    if (!ITEM_LISTS[property]?.includes(owner?.type ?? "") || isFixedList(session, listPath))
      continue;
    item = target(session, listPath, index) ?? item;
  }
  return item ? { block, item } : { block };
}

/** The path of the current selection, as a node path when one node is selected as a whole. */
export function selectionPath(session: Session): DocumentPath | undefined {
  const selection = session.selection as { type: string; path: DocumentPath } | null;
  if (!selection) return undefined;
  const selected = selectedNode(session);
  return selected ? [...selected.path, selected.index] : selection.path;
}

/** What a handle is called: "Services block", "Photo 3". */
export function targetName(target: HandleTarget): string {
  const block = BLOCK_NAMES[target.type as BlockType];
  if (block) return `${block} block`;
  return `${ITEM_NAMES[target.type] ?? "Item"} ${target.index + 1}`;
}

/**
 * The block or item selected as a whole, in words: "Services block", "Photo 3 of 6". Nothing
 * for the caret, a text selection, or a node that is neither a block nor an item.
 */
export function selectionLabel(session: Session): string | undefined {
  const selected = selectedNode(session);
  if (!selected) return undefined;
  const { block, item } = handleTargets(session, [...selected.path, selected.index]);
  const isSelected = (t: HandleTarget | undefined) =>
    t !== undefined && t.listPath.length === selected.path.length && t.index === selected.index;
  if (isSelected(item) && item) {
    const count = (session.get(item.listPath) as NodeList).nodes.length;
    return `${targetName(item)} of ${count}`;
  }
  if (isSelected(block) && block) return targetName(block);
  return undefined;
}
