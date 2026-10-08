import { isCollectionBlockType } from "@webmio/model";
import type { DocumentPath, Session } from "svedit";
import {
  addItem,
  canvasBlock,
  collectionItemAt,
  deleteItem,
  duplicateItem,
  isStructureFixed,
  moveItem,
  removeFromBlock,
  selectedCollectionItem,
} from "./collections";
import {
  type BlockType,
  blockInserters,
  insertableBlocks,
  insertCard,
  insertFigure,
  insertListItem,
  insertSlide,
  insertStep,
  insertVideo,
  MAX_CARDS,
  MAX_FIGURES,
  MAX_SLIDES,
} from "./transforms";

type NodeSelection = {
  type: "node";
  path: DocumentPath;
  anchor_offset: number;
  focus_offset: number;
};
type AnySelection = {
  type: string;
  path: DocumentPath;
  anchor_offset?: number;
  focus_offset?: number;
};
type NodeList = { nodes: string[]; marks: unknown[]; annotations: unknown[] };

/**
 * Node lists whose structure the canvas keeps fixed: the navigation and the site's pages (the
 * sidebar manages them), images (the image slots do), and buttons (the button panel does).
 */
export function isFixedList(session: Session, path: DocumentPath): boolean {
  const owner = session.get(path.slice(0, -1)) as { type?: string } | undefined;
  return isFixedListProperty(owner?.type, path.at(-1));
}

/** The fixed-list rule on its own: the owning node's type and the list property's name. */
export function isFixedListProperty(ownerType: string | undefined, property: unknown): boolean {
  if (
    property === "pages" ||
    property === "image" ||
    property === "action" ||
    property === "actions"
  ) {
    return true;
  }
  return property === "items" && ownerType === "nav";
}

/** The selected single node (list path + index), unless it sits in a fixed list. */
export function selectedNode(session: Session): { path: DocumentPath; index: number } | undefined {
  const selection = session.selection as AnySelection | null;
  if (selection?.type !== "node") return undefined;
  const { anchor_offset = 0, focus_offset = 0 } = selection;
  if (Math.abs(anchor_offset - focus_offset) !== 1) return undefined;
  if (isFixedList(session, selection.path)) return undefined;
  return { path: selection.path, index: Math.min(anchor_offset, focus_offset) };
}

/** Moves the selected node one place up or down within its list. */
export function moveSelectedNode(session: Session, direction: -1 | 1): boolean {
  const owned = selectedCollectionItem(session);
  if (owned) {
    if (owned.fixed && owned.block.mode === "all") return false;
    return moveItem(session, session.doc.document_id, owned.block, owned.item, direction);
  }
  const selected = selectedNode(session);
  if (!selected) return false;
  const list = session.get(selected.path) as NodeList;
  const target = selected.index + direction;
  if (target < 0 || target >= list.nodes.length) return false;
  const nodes = [...list.nodes];
  [nodes[selected.index], nodes[target]] = [
    nodes[target] as string,
    nodes[selected.index] as string,
  ];
  const tr = session.tr;
  tr.set(selected.path, { ...list, nodes });
  tr.set_selection({
    type: "node",
    path: selected.path,
    anchor_offset: target,
    focus_offset: target + 1,
  });
  session.apply(tr);
  return true;
}

/**
 * Inserts a copy of the selected block or item right after it, with everything it contains
 * under fresh IDs, and selects the copy; one undo step. A hero is never copied: a page has at
 * most one, and it comes first.
 */
export function duplicateSelectedNode(session: Session): boolean {
  const owned = selectedCollectionItem(session);
  if (owned) {
    if (owned.fixed) return false;
    duplicateItem(session, session.doc.document_id, owned.block, owned.item);
    return true;
  }
  const selected = selectedNode(session);
  if (!selected) return false;
  const list = session.get(selected.path) as NodeList;
  const id = list.nodes[selected.index];
  if (id === undefined || !canDuplicate(session, id)) return false;
  const tr = session.tr;
  // Svedit's build copies the subtree (items, images, marks) under fresh IDs.
  const copyId = tr.build(id, session.doc.nodes as never);
  const nodes = [...list.nodes];
  nodes.splice(selected.index + 1, 0, copyId);
  tr.set(selected.path, { ...list, nodes });
  tr.set_selection({
    type: "node",
    path: selected.path,
    anchor_offset: selected.index + 1,
    focus_offset: selected.index + 2,
  });
  session.apply(tr);
  return true;
}

/** Whether a node may be duplicated: anything but a hero, and no card past twelve. */
export function canDuplicate(session: Session, id: string): boolean {
  const type = (session.get(id) as { type?: string } | undefined)?.type;
  if (type === "card" || type === "video" || type === "slide") {
    return itemLimit(session, id) !== "maxCards";
  }
  return type !== "hero";
}

/**
 * Why a card can't be deleted (the last one of its block) or added next to (twelve already),
 * from where it sits in the document (cards design decision 4).
 */
export function itemLimit(session: Session, itemId: string): "lastCard" | "maxCards" | undefined {
  for (const node of Object.values(session.doc.nodes) as {
    type?: string;
    [key: string]: unknown;
  }[]) {
    const limit = ITEM_LIMITS[node.type ?? ""];
    const ids = (node[limit?.property ?? ""] as NodeList | undefined)?.nodes ?? [];
    if (!limit || !ids.includes(itemId)) continue;
    if (ids.length >= limit.max) return "maxCards";
    if (ids.length <= limit.min) return "lastCard";
    return undefined;
  }
  return undefined;
}

/** The lists whose items have a smallest and largest number, by owner type. */
const ITEM_LIMITS: Record<string, { property: string; min: number; max: number }> = {
  cards: { property: "items", min: 1, max: MAX_CARDS },
  videos: { property: "items", min: 1, max: MAX_CARDS },
  // A slideshow with fewer than two slides warns instead (hero-slideshow decision 2).
  hero: { property: "slides", min: 0, max: MAX_SLIDES },
};

/**
 * Deletes the selected block or item. A collection item is taken out of a block that shows chosen
 * items, and deleted from the site (every page included) from a block that shows all of them.
 */
export function deleteSelectedNode(session: Session): boolean {
  const owned = selectedCollectionItem(session);
  if (owned) {
    if (owned.block.mode === "chosen") {
      removeFromBlock(session, owned.block, owned.item);
    } else if (owned.fixed) {
      return false;
    } else {
      deleteItem(session, session.doc.document_id, owned.block.collection, owned.item.itemId);
    }
    return true;
  }
  const selected = selectedNode(session);
  if (!selected) return false;
  // A cards block keeps at least one card.
  const id = (session.get(selected.path) as NodeList).nodes[selected.index];
  const node = id === undefined ? undefined : (session.get(id) as { type?: string });
  if (
    (node?.type === "card" || node?.type === "video") &&
    itemLimit(session, id as string) === "lastCard"
  ) {
    return false;
  }
  session.apply(session.tr.delete_selection());
  return true;
}

/**
 * Inserts a block of `type` at `index` of a page's blocks, whatever the selection, with the caret
 * in its first text; one undo step. False when that block can't go there.
 */
export function insertBlockAt(
  session: Session,
  blocksPath: DocumentPath,
  index: number,
  type: BlockType,
): boolean {
  const blocks = (session.get(blocksPath) as NodeList).nodes.map(
    (id) => session.get(id) as { type: string },
  );
  if (!insertableBlocks(blocks, index).includes(type)) return false;
  const tr = session.tr;
  tr.set_selection({
    type: "node",
    path: blocksPath,
    anchor_offset: index,
    focus_offset: index,
  } satisfies NodeSelection);
  blockInserters[type](tr);
  session.apply(tr);
  return true;
}

/** The item lists "Add item" fills, by the type of the node holding them. */
const ITEM_OWNERS = ["list", "figures", "steps", "cards", "videos"];

/**
 * The item list the selection is in (a bulleted list's items, a key figures or steps block's
 * items), the position after the current item, and the list's owner type.
 */
export function itemInsertionPoint(
  session: Session,
): { path: DocumentPath; index: number; owner: string } | undefined {
  const selection = session.selection as AnySelection | null;
  if (!selection) return undefined;
  // Walk up the selection path to the innermost item list of a bulleted list. Collection items
  // have their own insertion (`collectionInsertion`); gallery photos and logos need an image,
  // so they come from the library instead.
  for (let end = selection.path.length; end > 0; end--) {
    const path = selection.path.slice(0, end);
    const property = path.at(-1);
    if (property !== "items" && property !== "slides") continue;
    const owner = session.get(path.slice(0, -1)) as
      | { type?: string; items?: { nodes: string[] }; slides?: { nodes: string[] } }
      | undefined;
    if (!owner?.type) continue;
    if (property === "items" ? !ITEM_OWNERS.includes(owner.type) : owner.type !== "hero") continue;
    if (property === "slides" && (owner.slides?.nodes.length ?? 0) >= MAX_SLIDES) return;
    // A key figures block holds at most six.
    if (owner.type === "figures" && (owner.items?.nodes.length ?? 0) >= MAX_FIGURES) return;
    if (
      (owner.type === "cards" || owner.type === "videos") &&
      (owner.items?.nodes.length ?? 0) >= MAX_CARDS
    ) {
      return;
    }
    const next = selection.path[end];
    if (typeof next === "number") return { path, index: next + 1, owner: owner.type };
    if (selection.type === "node") {
      return {
        path,
        index: Math.max(selection.anchor_offset ?? 0, selection.focus_offset ?? 0),
        owner: owner.type,
      };
    }
  }
  return undefined;
}

/**
 * Where "Add item" puts a new collection item: after the item holding the selection, or at the
 * end of the collection block holding it. Undefined outside collection blocks, and in another
 * language than the primary, where items are added in the primary.
 */
function collectionInsertion(session: Session) {
  const selection = session.selection as AnySelection | null;
  if (!selection) return undefined;
  const owned = selectedCollectionItem(session) ?? collectionItemAt(session, selection.path);
  if (owned) return owned.fixed ? undefined : { block: owned.block, after: owned.item };
  const at = selection.path.findIndex(
    (segment, i) => segment === "blocks" && typeof selection.path[i + 1] === "number",
  );
  if (at < 0 || isStructureFixed(session)) return undefined;
  const node = session.get(selection.path.slice(0, at + 2)) as
    | { id?: string; type?: string }
    | undefined;
  if (!node?.id || !isCollectionBlockType(node.type)) return undefined;
  const block = canvasBlock(session, node.id);
  return block ? { block, after: undefined } : undefined;
}

/** Whether "Add item" can add something where the selection is. */
export function canInsertItem(session: Session): boolean {
  return itemInsertionPoint(session) !== undefined || collectionInsertion(session) !== undefined;
}

/** Inserts an empty list item, or a new collection item, after the current one. */
export function insertItem(session: Session): boolean {
  const collection = collectionInsertion(session);
  if (collection) {
    addItem(session, session.doc.document_id, collection.block, collection.after);
    return true;
  }
  const at = itemInsertionPoint(session);
  if (!at) return false;
  const tr = session.tr;
  tr.set_selection({
    type: "node",
    path: at.path,
    anchor_offset: at.index,
    focus_offset: at.index,
  });
  if (at.owner === "figures") insertFigure(tr);
  else if (at.owner === "steps") insertStep(tr);
  else if (at.owner === "cards") insertCard(tr);
  else if (at.owner === "videos") insertVideo(tr);
  else if (at.owner === "hero") insertSlide(tr);
  else insertListItem(tr);
  session.apply(tr);
  return true;
}
