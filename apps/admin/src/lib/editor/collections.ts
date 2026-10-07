import {
  COLLECTION_BLOCK_TYPES,
  COLLECTION_NAMES,
  COLLECTIONS,
  type CollectionBlockType,
  type CollectionName,
  isCollectionBlockType,
} from "@webmio/model";
import type { DocumentPath, Session, Transaction } from "svedit";
import { list, text } from "./transforms";

// Collection blocks on the canvas (business-collections design decision 4): which items each
// block of the current page shows, which block mounts each item editable (Svedit mounts a path
// once per canvas), and the operations the canvas offers on them.

type NodeList = { nodes: string[] };
type AnyNode = { id: string; type: string; [key: string]: unknown };

export type CollectionMode = "all" | "chosen";

/** One item a block shows. */
export interface ItemView {
  itemId: string;
  /** Its place in the site's collection. */
  index: number;
  /** Its place among the block's chosen items; -1 when the block shows all. */
  refIndex: number;
  /** Its place in the block, as shown. */
  position: number;
  /** False when an earlier block of the page already mounts it: then this one is a preview. */
  editable: boolean;
}

/** A collection block of the current page and what it shows. */
export interface BlockView {
  blockId: string;
  blockIndex: number;
  type: CollectionBlockType;
  collection: CollectionName;
  mode: CollectionMode;
  items: ItemView[];
  /** The block shows all items and mounts every one: it renders the collection as one list. */
  wholeList: boolean;
}

const nodesOf = (value: unknown): string[] => (value as NodeList | undefined)?.nodes ?? [];

/** What the canvas page shows, and whether collections' structure is fixed (another language). */
export interface CanvasContext {
  views: () => BlockView[];
  /** The canvas page's blocks, `[site, "pages", i, "blocks"]`. */
  blocksPath: () => DocumentPath;
  structureFixed: () => boolean;
}

const contexts = new WeakMap<object, CanvasContext>();

/** Lets editing commands, which only get the session, see what the canvas page shows. */
export function provideCanvasContext(session: Session, context: CanvasContext): void {
  contexts.set(session, context);
}

/** The collection item selected as a whole, with the block of the page that shows it. */
export function selectedCollectionItem(
  session: Session,
): { block: BlockView; item: ItemView; fixed: boolean } | undefined {
  const selection = session.selection as {
    type: string;
    path: DocumentPath;
    anchor_offset?: number;
    focus_offset?: number;
  } | null;
  if (selection?.type !== "node") return undefined;
  const { anchor_offset = 0, focus_offset = 0 } = selection;
  if (Math.abs(anchor_offset - focus_offset) !== 1) return undefined;
  const index = Math.min(anchor_offset, focus_offset);
  return collectionItemAt(session, [...selection.path, index]);
}

/** The collection item a path is in (an item's node or one of its texts), and its block. */
export function collectionItemAt(
  session: Session,
  path: DocumentPath,
): { block: BlockView; item: ItemView; fixed: boolean } | undefined {
  const context = contexts.get(session);
  const at = collectionPath(path, session.doc.document_id);
  if (!context || !at) return undefined;
  const itemId = nodesOf(session.get([session.doc.document_id, at.collection]))[at.index];
  const owner = itemId === undefined ? undefined : itemOwner(context.views(), itemId);
  return owner ? { ...owner, fixed: context.structureFixed() } : undefined;
}

/** The canvas page's blocks path, when the session belongs to an editor. */
export function canvasBlocksPath(session: Session): DocumentPath | undefined {
  return contexts.get(session)?.blocksPath();
}

/** Whether collections' structure is fixed on this canvas (a language other than the primary). */
export function isStructureFixed(session: Session): boolean {
  return contexts.get(session)?.structureFixed() ?? false;
}

/** The collection block of the canvas page with this ID. */
export function canvasBlock(session: Session, blockId: string): BlockView | undefined {
  return contexts
    .get(session)
    ?.views()
    .find((view) => view.blockId === blockId);
}

/** What every collection block of a page shows, in page order. */
export function pageCollections(
  doc: { document_id: string; nodes: Record<string, unknown> },
  blockIds: readonly string[],
): BlockView[] {
  const nodes = doc.nodes as Record<string, AnyNode | undefined>;
  const site = nodes[doc.document_id];
  const mounted = new Set<string>();
  const views: BlockView[] = [];
  blockIds.forEach((blockId, blockIndex) => {
    const block = nodes[blockId];
    if (!block || !isCollectionBlockType(block.type)) return;
    const { collection } = COLLECTIONS[block.type];
    const members = nodesOf(site?.[collection]);
    const mode: CollectionMode = block.show === "chosen" ? "chosen" : "all";
    const shown =
      mode === "all"
        ? members.map((itemId, index) => ({ itemId, index, refIndex: -1 }))
        : nodesOf(block.chosen).flatMap((refId, refIndex) => {
            const itemId = nodes[refId]?.item_id;
            const index = typeof itemId === "string" ? members.indexOf(itemId) : -1;
            return index < 0 ? [] : [{ itemId: itemId as string, index, refIndex }];
          });
    const items = shown.map((item, position) => {
      const editable = !mounted.has(item.itemId);
      mounted.add(item.itemId);
      return { ...item, position, editable };
    });
    views.push({
      blockId,
      blockIndex,
      type: block.type,
      collection,
      mode,
      items,
      wholeList: mode === "all" && items.every((item) => item.editable),
    });
  });
  return views;
}

/** The block of the page that mounts an item editable, and the item as it shows it. */
export function itemOwner(
  views: readonly BlockView[],
  itemId: string,
): { block: BlockView; item: ItemView } | undefined {
  for (const block of views) {
    const item = block.items.find((i) => i.itemId === itemId && i.editable);
    if (item) return { block, item };
  }
  return undefined;
}

/** A path into a site collection: `[site, "services", 2, …]` gives `services` and 2. */
export function collectionPath(
  path: DocumentPath,
  siteId: string,
): { collection: CollectionName; index: number } | undefined {
  const [root, property, index] = path;
  const names = Object.values(COLLECTIONS).map((c) => c.collection) as string[];
  if (root !== siteId || typeof property !== "string" || !names.includes(property)) return;
  if (typeof index !== "number") return;
  return { collection: property as CollectionName, index };
}

/** A new, empty item of a collection, with its placeholder texts; returns its ID and first text. */
function createItem(tr: Transaction, collection: CollectionName): { id: string; focus: string } {
  const id = tr.generate_id();
  switch (collection) {
    case "services":
      tr.create({
        id,
        type: "service_item",
        name: text("Nová služba"),
        description: text(),
        price: text(),
      });
      return { id, focus: "name" };
    case "team":
      tr.create({ id, type: "person", name: text(), role: text(), text: text(), image: list() });
      return { id, focus: "name" };
    case "testimonials":
      tr.create({
        id,
        type: "testimonial",
        quote: text(),
        name: text(),
        detail: text(),
        image: list(),
      });
      return { id, focus: "quote" };
    case "faqs":
      tr.create({ id, type: "faq_item", question: text("Nová otázka"), answer: text() });
      return { id, focus: "question" };
  }
}

function members(tr: Transaction, siteId: string, collection: CollectionName): string[] {
  return [...nodesOf(tr.get([siteId, collection]))];
}

function chosenRefs(tr: Transaction, blockId: string): string[] {
  return [...nodesOf(tr.get([blockId, "chosen"]))];
}

function createRef(tr: Transaction, itemId: string): string {
  const id = tr.generate_id();
  tr.create({ id, type: "item_ref", item_id: itemId });
  return id;
}

/**
 * Adds a new item: to the collection right after `after` (or at the end), and, for a block that
 * shows chosen items, to the block right after `after`'s place (or at its end). The caret goes
 * into its first text. One undo step.
 */
export function addItem(
  session: Session,
  siteId: string,
  block: BlockView,
  after?: ItemView,
): string {
  const tr = session.tr;
  const { id, focus } = createItem(tr, block.collection);
  const all = members(tr, siteId, block.collection);
  const at = after ? after.index + 1 : all.length;
  all.splice(at, 0, id);
  tr.set([siteId, block.collection], list(all));
  if (block.mode === "chosen") {
    const refs = chosenRefs(tr, block.blockId);
    refs.splice(after ? after.refIndex + 1 : refs.length, 0, createRef(tr, id));
    tr.set([block.blockId, "chosen"], list(refs));
  }
  tr.set_selection({
    type: "text",
    path: [siteId, block.collection, at, focus],
    anchor_offset: 0,
    focus_offset: 0,
  });
  session.apply(tr);
  return id;
}

/** Adds an item of the collection to the end of a block that shows chosen items. */
export function chooseItem(session: Session, block: BlockView, itemId: string): void {
  const tr = session.tr;
  tr.set(
    [block.blockId, "chosen"],
    list([...chosenRefs(tr, block.blockId), createRef(tr, itemId)]),
  );
  session.apply(tr);
}

/** Items of the collection a block that shows chosen items doesn't show yet. */
export function unchosenItems(
  doc: { document_id: string; nodes: Record<string, unknown> },
  block: BlockView,
): string[] {
  const shown = new Set(block.items.map((item) => item.itemId));
  const site = doc.nodes[doc.document_id] as AnyNode | undefined;
  return nodesOf(site?.[block.collection]).filter((id) => !shown.has(id));
}

/**
 * Moves an item one place up or down: in the collection when the block shows all items, among
 * the block's chosen items otherwise. The moved item stays selected.
 */
export function moveItem(
  session: Session,
  siteId: string,
  block: BlockView,
  item: ItemView,
  direction: -1 | 1,
): boolean {
  const tr = session.tr;
  if (block.mode === "all") {
    const all = members(tr, siteId, block.collection);
    const to = item.index + direction;
    if (to < 0 || to >= all.length) return false;
    [all[item.index], all[to]] = [all[to] as string, all[item.index] as string];
    tr.set([siteId, block.collection], list(all));
    tr.set_selection({
      type: "node",
      path: [siteId, block.collection],
      anchor_offset: to,
      focus_offset: to + 1,
    });
  } else {
    const refs = chosenRefs(tr, block.blockId);
    const to = item.refIndex + direction;
    if (to < 0 || to >= refs.length) return false;
    [refs[item.refIndex], refs[to]] = [refs[to] as string, refs[item.refIndex] as string];
    tr.set([block.blockId, "chosen"], list(refs));
    tr.set_selection({
      type: "node",
      path: [siteId, block.collection],
      anchor_offset: item.index,
      focus_offset: item.index + 1,
    });
  }
  session.apply(tr);
  return true;
}

/**
 * Copies an item, with its texts, marks and image under fresh IDs, right after it in the
 * collection and, for a block that shows chosen items, right after it in the block. Selects the
 * copy. One undo step.
 */
export function duplicateItem(
  session: Session,
  siteId: string,
  block: BlockView,
  item: ItemView,
): string {
  const tr = session.tr;
  const copyId = tr.build(item.itemId, session.doc.nodes as never);
  const all = members(tr, siteId, block.collection);
  all.splice(item.index + 1, 0, copyId);
  tr.set([siteId, block.collection], list(all));
  if (block.mode === "chosen") {
    const refs = chosenRefs(tr, block.blockId);
    refs.splice(item.refIndex + 1, 0, createRef(tr, copyId));
    tr.set([block.blockId, "chosen"], list(refs));
  }
  tr.set_selection({
    type: "node",
    path: [siteId, block.collection],
    anchor_offset: item.index + 1,
    focus_offset: item.index + 2,
  });
  session.apply(tr);
  return copyId;
}

/** Takes an item out of a block that shows chosen items; the item stays in the collection. */
export function removeFromBlock(session: Session, block: BlockView, item: ItemView): void {
  const tr = session.tr;
  const refs = chosenRefs(tr, block.blockId);
  refs.splice(item.refIndex, 1);
  tr.set([block.blockId, "chosen"], list(refs));
  tr.set_selection(null as never);
  session.apply(tr);
}

/**
 * Deletes an item from the site: from its collection, and from every block on every page that
 * chose it. One undo step brings it back everywhere.
 */
export function deleteItem(
  session: Session,
  siteId: string,
  collection: CollectionName,
  itemId: string,
): void {
  const tr = session.tr;
  for (const node of Object.values(session.doc.nodes as Record<string, AnyNode>)) {
    if (!isCollectionBlockType(node.type)) continue;
    const refs = nodesOf(node.chosen);
    const kept = refs.filter((refId) => (tr.get(refId) as AnyNode | undefined)?.item_id !== itemId);
    if (kept.length !== refs.length) tr.set([node.id, "chosen"], list(kept));
  }
  tr.set([siteId, collection], list(members(tr, siteId, collection).filter((id) => id !== itemId)));
  tr.set_selection(null as never);
  session.apply(tr);
}

/**
 * Switches a block between showing all items and chosen ones. Switching to chosen starts with
 * every item in collection order, so the page doesn't change. One undo step.
 */
export function setBlockMode(
  session: Session,
  siteId: string,
  blockId: string,
  mode: CollectionMode,
): void {
  const tr = session.tr;
  const block = tr.get(blockId) as AnyNode;
  if (!isCollectionBlockType(block.type)) return;
  const { collection } = COLLECTIONS[block.type];
  const refs =
    mode === "chosen" ? members(tr, siteId, collection).map((id) => createRef(tr, id)) : [];
  tr.set([blockId, "show"], mode);
  tr.set([blockId, "chosen"], list(refs));
  session.apply(tr);
}

/**
 * A collection as the panel's list forms show it: like a block showing all of it, so the canvas's
 * item operations (`addItem`, `moveItem`, `duplicateItem`) act on the collection alone and leave
 * blocks showing chosen items as they are (offer-and-about decision 3).
 */
export function collectionView(
  doc: { document_id: string; nodes: Record<string, unknown> },
  collection: CollectionName,
): BlockView {
  const site = doc.nodes[doc.document_id] as AnyNode | undefined;
  const type = COLLECTION_BLOCK_TYPES.find((t) => COLLECTIONS[t].collection === collection);
  return {
    blockId: "",
    blockIndex: -1,
    type: type ?? "services",
    collection,
    mode: "all",
    items: nodesOf(site?.[collection]).map((itemId, index) => ({
      itemId,
      index,
      refIndex: -1,
      position: index,
      editable: true,
    })),
    wholeList: true,
  };
}

/**
 * The pages that show a collection, in page order: through a block showing all of it, or one
 * that chose some of its items. With `itemId`, the pages that show that item.
 */
export function pagesShowing(
  doc: { document_id: string; nodes: Record<string, unknown> },
  collection: CollectionName,
  itemId?: string,
): string[] {
  const nodes = doc.nodes as Record<string, AnyNode | undefined>;
  const site = nodes[doc.document_id];
  const shows = (blockId: string) => {
    const block = nodes[blockId];
    if (!block || !isCollectionBlockType(block.type)) return false;
    if (COLLECTIONS[block.type].collection !== collection) return false;
    if (block.show !== "chosen") {
      return itemId === undefined || nodesOf(site?.[collection]).includes(itemId);
    }
    const refs = nodesOf(block.chosen);
    return itemId === undefined
      ? refs.length > 0
      : refs.some((refId) => nodes[refId]?.item_id === itemId);
  };
  return nodesOf(site?.pages).filter((id) => nodesOf(nodes[id]?.blocks).some(shows));
}

/**
 * The pages other than `pageId` that show an item: through a block showing all of its
 * collection, or one that chose it.
 */
export function otherPagesShowing(
  doc: { document_id: string; nodes: Record<string, unknown> },
  itemId: string,
  pageId: string,
): string[] {
  const site = doc.nodes[doc.document_id] as AnyNode | undefined;
  const collection = COLLECTION_NAMES.find((name) => nodesOf(site?.[name]).includes(itemId));
  if (!collection) return [];
  return pagesShowing(doc, collection, itemId).filter((id) => id !== pageId);
}
