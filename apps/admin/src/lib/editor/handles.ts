import type { DocumentPath, Session } from "svedit";
import type { I18n } from "$lib/i18n";
import { type BlockView, canvasBlocksPath, collectionItemAt, type ItemView } from "./collections";
import { isFixedList, selectedNode } from "./structure";
import type { BlockType } from "./transforms";

// What the block and item handles act on, and how the editor names it (canvas-structure
// design.md decisions 2 and 5).

/** Every block type, in the order the picker shows them. */
export const BLOCK_TYPES: readonly BlockType[] = [
  "hero",
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
];

/** Why a block can't go somewhere; the picker says it with `editor.unavailable.<reason>`. */
export type Unavailable = "heroTop" | "oneHero" | "onlyTop";

/** Why a block type can't go at `index` of these blocks, or undefined when it can. */
export function unavailableReason(
  type: BlockType,
  blocks: { type: string }[],
  index: number,
): Unavailable | undefined {
  if (index === 0 && blocks[0]?.type === "hero") return "heroTop";
  if (type !== "hero") return undefined;
  if (blocks.some((b) => b.type === "hero")) return "oneHero";
  if (index !== 0) return "onlyTop";
  return undefined;
}

/** The node types of items that get a handle, as `editor.items` names them. */
const ITEM_TYPES = new Set([
  "list_item",
  "service_item",
  "gallery_item",
  "person",
  "logo_item",
  "testimonial",
  "faq_item",
  "figure",
  "step",
  "card",
  "video",
]);

/** The translator the names are made with: the interface language's `t`. */
type T = I18n["t"];

/** The block or item types whose lists hold items with handles, by list property. */
const ITEM_LISTS: Record<string, readonly string[]> = {
  items: [
    "list",
    "services",
    "gallery",
    "logos",
    "testimonials",
    "figures",
    "steps",
    "cards",
    "videos",
  ],
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
  /** For an item of a site collection: the block of the page showing it, and its place there. */
  collection?: { block: BlockView; item: ItemView; fixed: boolean };
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
  // An item of a site collection belongs to the block of the page that shows it.
  const owned = collectionItemAt(session, path);
  const blocksPath = canvasBlocksPath(session);
  if (owned && blocksPath) {
    const block = target(session, blocksPath, owned.block.blockIndex);
    const listPath = path.slice(0, 2);
    const item = target(session, listPath, owned.item.index);
    return block && item ? { block, item: { ...item, collection: owned } } : {};
  }
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

function itemName(type: string, t: T): string {
  return ITEM_TYPES.has(type) ? t(`editor.items.${type as "list_item"}`) : t("editor.items.other");
}

const isBlock = (type: string): type is BlockType =>
  (BLOCK_TYPES as readonly string[]).includes(type);

/** What a handle is called: "Services block", "Photo 3". */
export function targetName(target: HandleTarget, t: T): string {
  if (isBlock(target.type)) {
    return t("editor.handles.block", { name: t(`editor.blocks.${target.type}.name`) });
  }
  const number = (target.collection?.item.position ?? target.index) + 1;
  return t("editor.handles.item", { name: itemName(target.type, t), number });
}

/**
 * The block or item selected as a whole, in words: "Services block", "Photo 3 of 6". Nothing
 * for the caret, a text selection, or a node that is neither a block nor an item.
 */
export function selectionLabel(session: Session, t: T): string | undefined {
  const selected = selectedNode(session);
  if (!selected) return undefined;
  const { block, item } = handleTargets(session, [...selected.path, selected.index]);
  const isSelected = (target: HandleTarget | undefined) =>
    target !== undefined &&
    target.listPath.length === selected.path.length &&
    target.index === selected.index;
  if (item && isSelected(item)) {
    const count =
      item.collection?.block.items.length ?? (session.get(item.listPath) as NodeList).nodes.length;
    return t("editor.handles.itemOf", {
      name: itemName(item.type, t),
      number: (item.collection?.item.position ?? item.index) + 1,
      count,
    });
  }
  if (block && isSelected(block)) return targetName(block, t);
  return undefined;
}
