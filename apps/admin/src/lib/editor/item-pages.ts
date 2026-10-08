import { slugify, uniqueSlug } from "@webmio/model";
import type { Session, Transaction } from "svedit";
import { type ChosenImage, createImage, list, text } from "./transforms";

// Pages of services and projects, and the projects' own parts: facts, photos and categories
// (collection-pages design decision 6). Every operation is one undo step.

type Tr = Transaction;
type NodeList = { nodes: string[] };
type AnyNode = { id: string; type: string; [key: string]: unknown };

/** The collections whose items can have pages, and the site property naming their listing page. */
export const ITEM_PAGE_COLLECTIONS = {
  services: "services_page_id",
  projects: "projects_page_id",
} as const;

export type ItemPageCollection = keyof typeof ITEM_PAGE_COLLECTIONS;

const nodesOf = (value: unknown): string[] => (value as NodeList | undefined)?.nodes ?? [];
const nameOf = (item: AnyNode | undefined) =>
  (item?.name as { content?: string } | undefined)?.content ?? "";

/** The page listing a collection, or "" for none. */
export function listingPage(session: Session, siteId: string, collection: ItemPageCollection) {
  return String(session.get([siteId, ITEM_PAGE_COLLECTIONS[collection]]) ?? "");
}

/**
 * Gives the items of a collection pages under `pageId`, or none with "". Turning pages on gives
 * every item without an address one made from its name, unique within the collection, in the
 * same step; turning them off keeps the addresses.
 */
export function setListingPage(
  session: Session,
  siteId: string,
  collection: ItemPageCollection,
  pageId: string,
): void {
  const tr = session.tr;
  tr.set([siteId, ITEM_PAGE_COLLECTIONS[collection]], pageId);
  if (pageId !== "") fillAddresses(tr, siteId, collection);
  session.apply(tr);
}

function fillAddresses(tr: Tr, siteId: string, collection: ItemPageCollection): void {
  const items = nodesOf(tr.get([siteId, collection])).map((id) => tr.get(id) as AnyNode);
  const taken = items.map((item) => String(item.slug ?? "")).filter((slug) => slug !== "");
  for (const item of items) {
    if (item.slug !== "") continue;
    const slug = uniqueSlug(slugify(nameOf(item)), taken);
    taken.push(slug);
    tr.set([item.id, "slug"], slug);
  }
}

/**
 * Makes a new item's address from its name while its collection has pages, and keeps it
 * following the name while it is still the one made before (`made`): until the owner changes
 * it. Merged into the typing, so it adds no undo step of its own. Returns the address made.
 */
export function addressFromName(
  session: Session,
  siteId: string,
  collection: ItemPageCollection,
  itemId: string,
  made = "",
): string | undefined {
  if (listingPage(session, siteId, collection) === "") return undefined;
  const item = session.get(itemId) as AnyNode | undefined;
  if (!item || nameOf(item).trim() === "") return undefined;
  if (item.slug !== "" && item.slug !== made) return undefined;
  const taken = nodesOf(session.get([siteId, collection]))
    .filter((id) => id !== itemId)
    .map((id) => String((session.get(id) as AnyNode | undefined)?.slug ?? ""));
  const slug = uniqueSlug(slugify(nameOf(item)), taken);
  if (slug === item.slug) return slug;
  const tr = session.tr;
  tr.set([itemId, "slug"], slug);
  session.apply(tr, { batch: true });
  return slug;
}

/** Sets a plain string property of a node (an address, a video address), typed in a field. */
export function setString(session: Session, nodeId: string, property: string, value: string) {
  const tr = session.tr;
  tr.set([nodeId, property], value);
  session.apply(tr, { batch: true });
}

/** Starts an empty text body with one paragraph, ready for typing. */
export function startBody(session: Session, ownerId: string): string {
  const tr = session.tr;
  const id = tr.generate_id();
  tr.create({ id, type: "paragraph", content: text() });
  tr.set([ownerId, "body"], list([id]));
  session.apply(tr);
  return id;
}

/**
 * Adds an empty fact at the end of a project's facts, with the caret in its label when the
 * project's path is given.
 */
export function addFact(
  session: Session,
  projectId: string,
  projectPath?: (string | number)[],
): string {
  const tr = session.tr;
  const id = tr.generate_id();
  tr.create({ id, type: "fact", label: text(), value: text() });
  const facts = [...nodesOf(tr.get([projectId, "facts"])), id];
  tr.set([projectId, "facts"], list(facts));
  if (projectPath) {
    tr.set_selection({
      type: "text",
      path: [...projectPath, "facts", facts.length - 1, "label"],
      anchor_offset: 0,
      focus_offset: 0,
    } as never);
  }
  session.apply(tr);
  return id;
}

/** Takes a fact or a photo out of its project. */
export function removeChild(
  session: Session,
  ownerId: string,
  property: "facts" | "photos",
  childId: string,
) {
  const tr = session.tr;
  tr.set(
    [ownerId, property],
    list(nodesOf(tr.get([ownerId, property])).filter((id) => id !== childId)),
  );
  session.apply(tr);
}

/** Moves a fact or a photo one place up (-1) or down (1). */
export function moveChild(
  session: Session,
  ownerId: string,
  property: "facts" | "photos",
  childId: string,
  direction: -1 | 1,
) {
  const ids = nodesOf(session.get([ownerId, property]));
  const from = ids.indexOf(childId);
  const to = from + direction;
  if (from < 0 || to < 0 || to >= ids.length) return;
  const moved = [...ids];
  [moved[from], moved[to]] = [moved[to] as string, moved[from] as string];
  const tr = session.tr;
  tr.set([ownerId, property], list(moved));
  session.apply(tr);
}

/** Adds one photo per chosen image at the end of a project's photos. */
export function addPhotos(session: Session, projectId: string, images: ChosenImage[]): void {
  if (images.length === 0) return;
  const tr = session.tr;
  const added = images.map((image) => {
    const id = tr.generate_id();
    tr.create({
      id,
      type: "gallery_item",
      image: list([createImage(tr, image, false)]),
      caption: text(),
    });
    return id;
  });
  tr.set([projectId, "photos"], list([...nodesOf(tr.get([projectId, "photos"])), ...added]));
  session.apply(tr);
}

/** Puts a project in a category, or in none with "". */
export function setProjectCategory(session: Session, projectId: string, categoryId: string) {
  const tr = session.tr;
  tr.set([projectId, "category_id"], categoryId);
  session.apply(tr);
}

/** Adds an empty category at the end of the site's categories; returns its ID. */
export function addCategory(session: Session, siteId: string): string {
  const tr = session.tr;
  const id = tr.generate_id();
  tr.create({ id, type: "project_category", name: text() });
  tr.set(
    [siteId, "project_categories"],
    list([...nodesOf(tr.get([siteId, "project_categories"])), id]),
  );
  tr.set_selection({
    type: "text",
    path: [
      siteId,
      "project_categories",
      nodesOf(tr.get([siteId, "project_categories"])).length - 1,
      "name",
    ],
    anchor_offset: 0,
    focus_offset: 0,
  });
  session.apply(tr);
  return id;
}

/** How many projects are in a category, and how many projects blocks show it. */
export function categoryUse(
  doc: { nodes: Record<string, unknown> },
  categoryId: string,
): { projects: number; blocks: number } {
  const nodes = Object.values(doc.nodes) as AnyNode[];
  return {
    projects: nodes.filter((n) => n.type === "project" && n.category_id === categoryId).length,
    blocks: nodes.filter((n) => n.type === "projects" && n.category_id === categoryId).length,
  };
}

/**
 * Deletes a category: its projects have none, and its blocks show every category, in the same
 * step.
 */
export function deleteCategory(session: Session, siteId: string, categoryId: string): void {
  const tr = session.tr;
  for (const node of Object.values(tr.doc.nodes) as AnyNode[]) {
    if ((node.type === "project" || node.type === "projects") && node.category_id === categoryId) {
      tr.set([node.id, "category_id"], "");
    }
  }
  tr.set(
    [siteId, "project_categories"],
    list(nodesOf(tr.get([siteId, "project_categories"])).filter((id) => id !== categoryId)),
  );
  tr.set_selection(null as never);
  session.apply(tr);
}

/** Which category a projects block shows; "" for every category. */
export function setProjectsCategory(session: Session, blockId: string, categoryId: string) {
  const tr = session.tr;
  tr.set([blockId, "category_id"], categoryId);
  session.apply(tr);
}

/** How many projects a projects block shows at most; 0 for all of them. */
export function setProjectsLimit(session: Session, blockId: string, limit: number) {
  const tr = session.tr;
  tr.set([blockId, "limit"], Math.max(0, Math.min(24, Math.round(limit))));
  session.apply(tr);
}

/** The pages that can list services or projects: every page but the home page, in order. */
export function listingPageChoices(doc: {
  document_id: string;
  nodes: Record<string, unknown>;
}): string[] {
  const site = doc.nodes[doc.document_id] as { pages: NodeList; home_page_id: string };
  return site.pages.nodes.filter((id) => id !== site.home_page_id);
}

/** The collections a page lists, as their listing page (for deleting it). */
export function collectionsListedOn(
  doc: { document_id: string; nodes: Record<string, unknown> },
  pageId: string,
): ItemPageCollection[] {
  const site = doc.nodes[doc.document_id] as Record<string, unknown> | undefined;
  return (Object.keys(ITEM_PAGE_COLLECTIONS) as ItemPageCollection[]).filter(
    (collection) => site?.[ITEM_PAGE_COLLECTIONS[collection]] === pageId,
  );
}
