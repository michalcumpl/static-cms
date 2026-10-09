import { slugify, uniqueSlug } from "@webmio/model";
import { pageFromLayout } from "@webmio/templates";
import type { Document, Session, Transaction } from "svedit";
import { checkLinkAddress, type LinkAddressCheck } from "./links";
import { editorSchema } from "./schema";
import { siteTemplate } from "./template";
import { createRichText, list, text } from "./transforms";

// Page and menu operations (design.md decision 6). Each one builds one transaction and applies
// it once, so a single undo reverts it, including the follow-up changes it makes.

type Tr = Transaction;
type TextValue = { content: string; marks: unknown[]; annotations: unknown[] };
type NodeList = { nodes: string[]; marks: unknown[]; annotations: unknown[] };
type Nodes = Record<string, { id: string; type: string; [key: string]: unknown }>;
type SiteFields = { id: string; pages: NodeList; nav: string; home_page_id: string };
type PageFields = { id: string; title: string; slug: string; seo_description: string };
type LinkFields = { id: string; type: string; page_id?: string; label: TextValue };

const nodesOf = (doc: Document) => doc.nodes as unknown as Nodes;
const siteOf = (doc: Document) => nodesOf(doc)[doc.document_id] as unknown as SiteFields;
const pageOf = (doc: Document, id: string) => nodesOf(doc)[id] as unknown as PageFields | undefined;
const navItems = (doc: Document) =>
  (nodesOf(doc)[siteOf(doc).nav] as unknown as { items: NodeList }).items;

/**
 * Where a menu item is: its index in the menu, or in a group's list when `group` (the group's
 * ID) is set (menu-groups design decision 3).
 */
export interface MenuPosition {
  group?: string;
  index: number;
}

const isGroup = (doc: Document, id: string | undefined) =>
  id !== undefined && nodesOf(doc)[id]?.type === "menu_group";

/** The items of the menu, or of one of its groups. */
function listOf(doc: Document, group?: string): string[] {
  if (group === undefined) return navItems(doc).nodes;
  const node = nodesOf(doc)[group] as unknown as { type: string; items: NodeList } | undefined;
  return node?.type === "menu_group" ? node.items.nodes : [];
}

function setList(tr: Tr, doc: Document, group: string | undefined, nodes: string[]): void {
  tr.set(group === undefined ? [siteOf(doc).nav, "items"] : [group, "items"], list(nodes));
}

/** The menu's groups, in order. */
const groupsOf = (doc: Document) => navItems(doc).nodes.filter((id) => isGroup(doc, id));

function slugsExcept(doc: Document, pageId?: string): string[] {
  return siteOf(doc).pages.nodes.flatMap((id) =>
    id === pageId ? [] : [pageOf(doc, id)?.slug ?? ""],
  );
}

/** The menu items that link to a page, in the menu or in its groups, with where they are. */
function menuLinksOf(doc: Document, pageId: string): { id: string; group?: string }[] {
  const nodes = nodesOf(doc);
  const links = (group?: string) =>
    listOf(doc, group)
      .filter((id) => nodes[id]?.type === "page_link" && nodes[id]?.page_id === pageId)
      .map((id) => ({ id, group }));
  return [...links(), ...groupsOf(doc).flatMap(links)];
}

/** The IDs of the menu items that link to a page. */
const menuItemsOf = (doc: Document, pageId: string) => menuLinksOf(doc, pageId).map((l) => l.id);

/** Takes items out of the menu and its groups. */
function removeFromMenu(tr: Tr, doc: Document, ids: ReadonlySet<string>): void {
  for (const group of [undefined, ...groupsOf(doc)]) {
    const items = listOf(doc, group);
    if (items.some((id) => ids.has(id))) {
      setList(
        tr,
        doc,
        group,
        items.filter((id) => !ids.has(id)),
      );
    }
  }
}

function createMenuItem(tr: Tr, pageId: string, label: string): string {
  const id = tr.generate_id();
  tr.create({ id, type: "page_link", label: text(label), page_id: pageId });
  return id;
}

function setNavItems(tr: Tr, doc: Document, nodes: string[]): void {
  tr.set([siteOf(doc).nav, "items"], list(nodes));
}

/**
 * Adds a page with a slug made from its title and a menu item at the end. The page starts with
 * one text block, or with the blocks of `layoutId`, a layout of the site's template
 * (template-system design decision 7); nothing in it refers back to the layout. One undo step.
 * Returns the new page's ID, or undefined when the title is empty.
 */
export function addPage(session: Session, title: string, layoutId?: string): string | undefined {
  const name = title.trim();
  if (name === "") return undefined;
  const doc = session.doc;
  const tr = session.tr;
  const slug = uniqueSlug(slugify(name), slugsExcept(doc));
  const made = layoutId
    ? pageFromLayout(doc, siteTemplate(doc), layoutId, {
        title: name,
        slug,
        newId: () => tr.generate_id(),
      })
    : undefined;
  let id: string;
  if (made) {
    // Children first, the page last, as `pageFromLayout` orders them.
    for (const node of made.nodes) tr.create(node as Parameters<Tr["create"]>[0]);
    id = made.pageId;
  } else {
    id = tr.generate_id();
    tr.create({
      id,
      type: "page",
      title: name,
      slug,
      seo_description: "",
      // Its own key: not paired with a page in another language.
      translation_key: id,
      share_image: list([]),
      blocks: list([createRichText(tr)]),
    });
  }
  tr.set([doc.document_id, "pages"], list([...siteOf(doc).pages.nodes, id]));
  setNavItems(tr, doc, [...navItems(doc).nodes, createMenuItem(tr, id, name)]);
  session.apply(tr);
  return id;
}

/**
 * Copies a page with all its blocks under new IDs, titled "<title> (copy)", right after the
 * original in the page list and in the menu (when the original is in it). Links in the copy
 * keep their targets. Returns the copy's ID.
 */
export function duplicatePage(session: Session, pageId: string): string | undefined {
  const doc = session.doc;
  const page = pageOf(doc, pageId);
  if (!page) return undefined;
  const tr = session.tr;
  // Svedit's build copies the subtree (blocks, items, marks) under fresh IDs.
  const copyId = tr.build(pageId, doc.nodes as never);
  const title = `${page.title} (copy)`;
  tr.set([copyId, "title"], title);
  // A copy is a new page, not another language's version of the original.
  tr.set([copyId, "translation_key"], copyId);
  tr.set([copyId, "slug"], uniqueSlug(slugify(title), slugsExcept(doc)));
  const pages = [...siteOf(doc).pages.nodes];
  pages.splice(pages.indexOf(pageId) + 1, 0, copyId);
  tr.set([doc.document_id, "pages"], list(pages));
  const original = menuLinksOf(doc, pageId)[0];
  if (original) {
    const items = [...listOf(doc, original.group)];
    items.splice(items.indexOf(original.id) + 1, 0, createMenuItem(tr, copyId, title));
    setList(tr, doc, original.group, items);
  }
  session.apply(tr);
  return copyId;
}

/** Why a page can't be deleted (`editor.page.cannotDelete.<reason>`), or undefined when it can. */
export function cannotDelete(doc: Document, pageId: string): "home" | "last" | undefined {
  if (siteOf(doc).home_page_id === pageId) return "home";
  if (siteOf(doc).pages.nodes.length <= 1) return "last";
  return undefined;
}

/**
 * Deletes a page, its blocks and its menu items. Links to it elsewhere stay and are reported
 * as problems. Returns false (and changes nothing) for the home page.
 */
export function deletePage(session: Session, pageId: string): boolean {
  const doc = session.doc;
  if (!pageOf(doc, pageId) || cannotDelete(doc, pageId) !== undefined) return false;
  const tr = session.tr;
  removeFromMenu(tr, doc, new Set(menuItemsOf(doc, pageId)));
  tr.set([doc.document_id, "pages"], list(siteOf(doc).pages.nodes.filter((id) => id !== pageId)));
  // A page listing services or projects takes their own pages with it (collection-pages).
  for (const property of ["services_page_id", "projects_page_id"] as const) {
    if ((siteOf(doc) as unknown as Record<string, unknown>)[property] === pageId) {
      tr.set([doc.document_id, property], "");
    }
  }
  // The selection may point into the deleted page.
  tr.set_selection(null as never);
  session.apply(tr);
  return true;
}

/** The IDs of a node and everything it contains, marks included. */
function subtree(doc: Document, rootId: string): Set<string> {
  const nodes = nodesOf(doc);
  const seen = new Set<string>();
  const visit = (id: string) => {
    const node = nodes[id];
    if (!node || seen.has(id)) return;
    seen.add(id);
    for (const [name, def] of Object.entries(editorSchema[node.type]?.properties ?? {})) {
      const value = node[name] as { nodes?: string[]; marks?: { node_id: string }[] } | string;
      if (def.type === "node" && typeof value === "string") visit(value);
      if (typeof value !== "object" || value === null) continue;
      for (const child of value.nodes ?? []) visit(child);
      for (const range of value.marks ?? []) visit(range.node_id);
    }
  };
  visit(rootId);
  return seen;
}

/**
 * How many links elsewhere in the site point to a page: text links, calls to action and menu
 * items, leaving out links on the page itself and its own menu items (deleted with it).
 */
export function countLinksTo(doc: Document, pageId: string): number {
  const reachable = subtree(doc, doc.document_id);
  const onPage = subtree(doc, pageId);
  const own = new Set(menuItemsOf(doc, pageId));
  return Object.values(nodesOf(doc)).filter(
    (node) =>
      (node.type === "internal_link" || node.type === "page_link") &&
      node.page_id === pageId &&
      reachable.has(node.id) &&
      !onPage.has(node.id) &&
      !own.has(node.id),
  ).length;
}

/** Makes a page the home page. Slugs, the menu and the order of pages don't change. */
export function setHome(session: Session, pageId: string): void {
  const doc = session.doc;
  if (!pageOf(doc, pageId) || siteOf(doc).home_page_id === pageId) return;
  session.apply(session.tr.set([doc.document_id, "home_page_id"], pageId));
}

/**
 * Changes a page's title. The slug follows while it equals the slugified old title, and each
 * menu label for the page follows while it equals the old title. Typing bursts are batched
 * into one undo step.
 */
export function setPageTitle(session: Session, pageId: string, title: string): void {
  const doc = session.doc;
  const page = pageOf(doc, pageId);
  if (!page || page.title === title) return;
  const tr = session.tr;
  tr.set([pageId, "title"], title);
  if (page.slug === slugify(page.title)) tr.set([pageId, "slug"], slugify(title));
  const nodes = nodesOf(doc);
  for (const itemId of menuItemsOf(doc, pageId)) {
    const label = (nodes[itemId] as unknown as LinkFields).label;
    if (label.content === page.title) tr.set([itemId, "label"], text(title));
  }
  session.apply(tr, { batch: true });
}

/** Sets a page's slug, normalised. */
export function setPageSlug(session: Session, pageId: string, input: string): void {
  const page = pageOf(session.doc, pageId);
  const slug = slugify(input);
  if (!page || page.slug === slug) return;
  session.apply(session.tr.set([pageId, "slug"], slug));
}

export function setSeoDescription(session: Session, pageId: string, description: string): void {
  const page = pageOf(session.doc, pageId);
  if (!page || page.seo_description === description) return;
  session.apply(session.tr.set([pageId, "seo_description"], description), { batch: true });
}

/**
 * Adds a page to the menu, labelled with its title, at `at` (by default the end of the menu), or
 * removes it from the menu and its groups.
 */
export function showInMenu(
  session: Session,
  pageId: string,
  show: boolean,
  at?: MenuPosition,
): void {
  const doc = session.doc;
  const page = pageOf(doc, pageId);
  const own = menuItemsOf(doc, pageId);
  if (!page || show === own.length > 0) return;
  const tr = session.tr;
  if (show) {
    const group = isGroup(doc, at?.group) ? at?.group : undefined;
    const items = [...listOf(doc, group)];
    items.splice(at?.index ?? items.length, 0, createMenuItem(tr, pageId, page.title));
    setList(tr, doc, group, items);
  } else {
    removeFromMenu(tr, doc, new Set(own));
  }
  session.apply(tr);
}

/**
 * Moves a menu item: within the menu or a group, into a group, or out of it. `to.index` is
 * counted after the item has left its place; past the end means at the end. Groups don't go
 * into groups.
 */
export function moveMenuItem(session: Session, from: MenuPosition, to: MenuPosition): void {
  const doc = session.doc;
  if (to.group !== undefined && !isGroup(doc, to.group)) return;
  const source = [...listOf(doc, from.group)];
  const id = source[from.index];
  if (id === undefined || (to.group !== undefined && isGroup(doc, id))) return;
  const sameList = from.group === to.group;
  source.splice(from.index, 1);
  const target = sameList ? source : [...listOf(doc, to.group)];
  // Past the end means at the end.
  const at = Math.min(to.index, target.length);
  if (at < 0 || (sameList && at === from.index)) return;
  target.splice(at, 0, id);
  const tr = session.tr;
  // The new place first: Svedit deletes a node as soon as nothing refers to it.
  setList(tr, doc, to.group, target);
  if (!sameList) setList(tr, doc, from.group, source);
  session.apply(tr);
}

/** Adds an empty group at the end of the menu; returns its ID, or undefined for no label. */
export function addMenuGroup(session: Session, label: string): string | undefined {
  const name = label.trim();
  if (name === "") return undefined;
  const doc = session.doc;
  const tr = session.tr;
  const id = tr.generate_id();
  tr.create({ id, type: "menu_group", label: text(name), items: list([]) });
  setNavItems(tr, doc, [...navItems(doc).nodes, id]);
  session.apply(tr);
  return id;
}

/** Renames a group; an empty label is refused (returns false). */
export function renameMenuGroup(session: Session, groupId: string, label: string): boolean {
  const name = label.trim();
  if (name === "" || !isGroup(session.doc, groupId)) return false;
  session.apply(session.tr.set([groupId, "label"], text(name)));
  return true;
}

/** Removes a group, keeping its links in the menu where the group was. */
export function removeMenuGroup(session: Session, groupId: string): void {
  const doc = session.doc;
  const items = [...navItems(doc).nodes];
  const index = items.indexOf(groupId);
  if (index < 0 || !isGroup(doc, groupId)) return;
  items.splice(index, 1, ...listOf(doc, groupId));
  const tr = session.tr;
  setNavItems(tr, doc, items);
  session.apply(tr);
}

export type MenuLinkResult = LinkAddressCheck;

function checkMenuLink(label: string, address: string): MenuLinkResult {
  if (label.trim() === "") return { ok: false, reason: "noLabel" };
  return checkLinkAddress(address);
}

/** Adds an external link at the end of the menu, if its label and address are acceptable. */
export function addExternalLink(session: Session, label: string, address: string): MenuLinkResult {
  const check = checkMenuLink(label, address);
  if (!check.ok) return check;
  const doc = session.doc;
  const tr = session.tr;
  const id = tr.generate_id();
  tr.create({ id, type: "external_link", label: text(label.trim()), url: check.href });
  setNavItems(tr, doc, [...navItems(doc).nodes, id]);
  session.apply(tr);
  return check;
}

/** Changes an external menu link's label and address, if they are acceptable. */
export function setExternalLink(
  session: Session,
  itemId: string,
  label: string,
  address: string,
): MenuLinkResult {
  const check = checkMenuLink(label, address);
  if (!check.ok) return check;
  const tr = session.tr;
  tr.set([itemId, "label"], text(label.trim()));
  tr.set([itemId, "url"], check.href);
  session.apply(tr);
  return check;
}

/** Removes the menu item at a position (a page's item or an external link; pages stay). */
export function removeMenuItem(session: Session, at: MenuPosition): void {
  const doc = session.doc;
  const items = listOf(doc, at.group);
  if (at.index < 0 || at.index >= items.length) return;
  const tr = session.tr;
  setList(
    tr,
    doc,
    at.group,
    items.filter((_, i) => i !== at.index),
  );
  session.apply(tr);
}
