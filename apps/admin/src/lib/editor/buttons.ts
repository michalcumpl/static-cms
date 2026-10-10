import type { DocumentPath, Session, Transaction } from "svedit";
import { checkLinkAddress, type LinkAddressCheck } from "./links";
import { locateNode } from "./locate";
import { list, text } from "./transforms";

// Buttons of a hero, a banner or a call to action (cta-and-testimonials design.md decision 3):
// where they point, and adding or removing them. Each operation is one transaction, one undo step.

type Doc = Parameters<typeof locateNode>[0];
type TextValue = { content: string; marks: unknown[]; annotations: unknown[] };

export interface Button {
  id: string;
  type: "page_link" | "external_link";
  label: TextValue;
  page_id?: string;
  url?: string;
}

/** A block whose buttons the panel manages, with the property holding them and its limit. */
export interface ButtonBlock {
  id: string;
  type: "hero" | "banner" | "call_to_action";
  property: "action" | "actions";
  buttons: string[];
  max: number;
}

const BUTTON_LISTS: Record<string, { property: "action" | "actions"; max: number }> = {
  hero: { property: "action", max: 1 },
  banner: { property: "action", max: 1 },
  call_to_action: { property: "actions", max: 2 },
};

export function buttonBlockOf(doc: Doc, blockId: string): ButtonBlock | undefined {
  const node = doc.nodes[blockId] as unknown as
    | ({ id: string; type: string } & Record<string, { nodes: string[] }>)
    | undefined;
  const rule = node ? BUTTON_LISTS[node.type] : undefined;
  if (!node || !rule) return undefined;
  return {
    id: node.id,
    type: node.type as ButtonBlock["type"],
    property: rule.property,
    buttons: node[rule.property]?.nodes ?? [],
    max: rule.max,
  };
}

/**
 * The button and the button block the selection is in or on: a node selection of a button, or
 * a caret in its label, or anywhere in a hero, banner or call to action (block only).
 */
export function selectedButton(session: Session): { button?: Button; block?: ButtonBlock } {
  const doc = session.doc as unknown as Doc;
  const selection = session.selection as {
    type: string;
    path: DocumentPath;
    anchor_offset?: number;
    focus_offset?: number;
  } | null;
  if (!selection) return {};
  let path = [...selection.path];
  // A node selection of one node: the path to that node.
  if (selection.type === "node") {
    const from = Math.min(selection.anchor_offset ?? 0, selection.focus_offset ?? 0);
    const to = Math.max(selection.anchor_offset ?? 0, selection.focus_offset ?? 0);
    if (to - from === 1) path = [...path, from];
  }
  let button: Button | undefined;
  for (let end = path.length; end > 0; end--) {
    const node = session.get(path.slice(0, end)) as { id?: string; type?: string } | undefined;
    if (!node?.id) continue;
    if (!button && (node.type === "page_link" || node.type === "external_link")) {
      const list = path[end - 2];
      if (list === "action" || list === "actions") button = node as Button;
      continue;
    }
    const block = buttonBlockOf(doc, node.id);
    if (block) return { button, block };
  }
  return {};
}

function pathOfButton(doc: Doc, block: ButtonBlock, index: number): DocumentPath | undefined {
  const at = locateNode(doc, block.id)?.path;
  return at ? ([...at, block.property, index] as DocumentPath) : undefined;
}

/**
 * Puts `newId` where `buttonId` was in its block and selects it, so the panel stays on it.
 */
function replaceButton(
  tr: Transaction,
  doc: Doc,
  block: ButtonBlock,
  buttonId: string,
  newId: string,
): void {
  const index = block.buttons.indexOf(buttonId);
  const buttons = block.buttons.map((id) => (id === buttonId ? newId : id));
  tr.set([block.id, block.property], list(buttons));
  const path = pathOfButton(doc, block, index);
  if (path) {
    tr.set_selection({
      type: "node",
      path: path.slice(0, -1),
      anchor_offset: index,
      focus_offset: index + 1,
    } as never);
  }
}

function ownerOf(doc: Doc, buttonId: string): ButtonBlock | undefined {
  for (const node of Object.values(doc.nodes)) {
    const block = node ? buttonBlockOf(doc, (node as unknown as { id: string }).id) : undefined;
    if (block?.buttons.includes(buttonId)) return block;
  }
  return undefined;
}

/** Makes a button link to a page of the site, keeping its label. */
export function setButtonPage(session: Session, buttonId: string, pageId: string): void {
  const doc = session.doc as unknown as Doc;
  const button = doc.nodes[buttonId] as unknown as Button | undefined;
  const block = ownerOf(doc, buttonId);
  if (!button || !block) return;
  if (button.type === "page_link") {
    if (button.page_id !== pageId) session.apply(session.tr.set([buttonId, "page_id"], pageId));
    return;
  }
  const tr = session.tr;
  const id = tr.generate_id();
  tr.create({ id, type: "page_link", label: button.label, page_id: pageId });
  replaceButton(tr, doc, block, buttonId, id);
  session.apply(tr);
}

/**
 * Makes a button link to an address (https, mailto: or tel:), keeping its label. An address
 * that isn't allowed changes nothing, and the result says why.
 */
export function setButtonAddress(
  session: Session,
  buttonId: string,
  address: string,
): LinkAddressCheck {
  const check = checkLinkAddress(address);
  const doc = session.doc as unknown as Doc;
  const button = doc.nodes[buttonId] as unknown as Button | undefined;
  const block = ownerOf(doc, buttonId);
  if (!check.ok || !button || !block) return check;
  if (button.type === "external_link") {
    if (button.url !== check.href) session.apply(session.tr.set([buttonId, "url"], check.href));
    return check;
  }
  const tr = session.tr;
  const id = tr.generate_id();
  tr.create({ id, type: "external_link", label: button.label, url: check.href });
  replaceButton(tr, doc, block, buttonId, id);
  session.apply(tr);
  return check;
}

/** Whether a block has room for another button. */
export const canAddButton = (block: ButtonBlock) => block.buttons.length < block.max;

/** Adds a button "Tlačítko" to the home page at the end of a block's buttons, if there's room. */
export function addButton(session: Session, blockId: string): boolean {
  const doc = session.doc as unknown as Doc;
  const block = buttonBlockOf(doc, blockId);
  if (!block || !canAddButton(block)) return false;
  const site = doc.nodes[doc.document_id] as unknown as { home_page_id: string };
  const tr = session.tr;
  const id = tr.generate_id();
  tr.create({ id, type: "page_link", label: text("Tlačítko"), page_id: site.home_page_id });
  tr.set([block.id, block.property], list([...block.buttons, id]));
  session.apply(tr);
  return true;
}

/** Whether a button can be removed: a call to action keeps at least one; a hero or banner none. */
export function canRemoveButton(doc: Doc, buttonId: string): boolean {
  const block = ownerOf(doc, buttonId);
  return block !== undefined && (block.type !== "call_to_action" || block.buttons.length > 1);
}

/** Removes a button from its block, unless it is a call to action's last one. */
export function removeButton(session: Session, buttonId: string): boolean {
  const doc = session.doc as unknown as Doc;
  const block = ownerOf(doc, buttonId);
  if (!block || !canRemoveButton(doc, buttonId)) return false;
  const tr = session.tr;
  tr.set([block.id, block.property], list(block.buttons.filter((id) => id !== buttonId)));
  tr.set_selection(null as never);
  session.apply(tr);
  return true;
}
