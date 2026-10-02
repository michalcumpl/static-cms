import { slugify, uniqueSlug } from "@static-cms/site";
import type { Document, Session, Transaction } from "svedit";
import { checkLinkAddress, type LinkAddressCheck } from "./links";
import { editorSchema } from "./schema";
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

function slugsExcept(doc: Document, pageId?: string): string[] {
  return siteOf(doc).pages.nodes.flatMap((id) =>
    id === pageId ? [] : [pageOf(doc, id)?.slug ?? ""],
  );
}

/** The menu items that link to a page. */
function menuItemsOf(doc: Document, pageId: string): string[] {
  const nodes = nodesOf(doc);
  return navItems(doc).nodes.filter(
    (id) => nodes[id]?.type === "page_link" && nodes[id]?.page_id === pageId,
  );
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
 * Adds a page with a slug made from its title, one text block, and a menu item at the end.
 * Returns the new page's ID, or undefined when the title is empty.
 */
export function addPage(session: Session, title: string): string | undefined {
  const name = title.trim();
  if (name === "") return undefined;
  const doc = session.doc;
  const tr = session.tr;
  const id = tr.generate_id();
  tr.create({
    id,
    type: "page",
    title: name,
    slug: uniqueSlug(slugify(name), slugsExcept(doc)),
    seo_description: "",
    // Its own key: not paired with a page in another language.
    translation_key: id,
    share_image: list([]),
    blocks: list([createRichText(tr)]),
  });
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
  const original = menuItemsOf(doc, pageId)[0];
  if (original) {
    const items = [...navItems(doc).nodes];
    items.splice(items.indexOf(original) + 1, 0, createMenuItem(tr, copyId, title));
    setNavItems(tr, doc, items);
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
  const own = new Set(menuItemsOf(doc, pageId));
  setNavItems(
    tr,
    doc,
    navItems(doc).nodes.filter((id) => !own.has(id)),
  );
  tr.set([doc.document_id, "pages"], list(siteOf(doc).pages.nodes.filter((id) => id !== pageId)));
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

/** Adds a page to the end of the menu, labelled with its title, or removes it from the menu. */
export function showInMenu(session: Session, pageId: string, show: boolean): void {
  const doc = session.doc;
  const page = pageOf(doc, pageId);
  const own = menuItemsOf(doc, pageId);
  if (!page || show === own.length > 0) return;
  const tr = session.tr;
  if (show) {
    setNavItems(tr, doc, [...navItems(doc).nodes, createMenuItem(tr, pageId, page.title)]);
  } else {
    setNavItems(
      tr,
      doc,
      navItems(doc).nodes.filter((id) => !own.includes(id)),
    );
  }
  session.apply(tr);
}

/** Moves the menu item at `from` to position `to`. */
export function moveMenuItem(session: Session, from: number, to: number): void {
  const doc = session.doc;
  const items = [...navItems(doc).nodes];
  if (from === to || from < 0 || to < 0 || from >= items.length || to >= items.length) return;
  const [moved] = items.splice(from, 1);
  items.splice(to, 0, moved as string);
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

/** Removes the menu item at `index` (a page's item or an external link; pages stay). */
export function removeMenuItem(session: Session, index: number): void {
  const doc = session.doc;
  const items = navItems(doc).nodes;
  if (index < 0 || index >= items.length) return;
  const tr = session.tr;
  setNavItems(
    tr,
    doc,
    items.filter((_, i) => i !== index),
  );
  session.apply(tr);
}
