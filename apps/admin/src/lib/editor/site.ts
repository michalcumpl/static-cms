import type { Document, Session, Transaction } from "svedit";
import { type ChosenImage, createImage, list } from "./transforms";

// Site settings and share images (seo-and-metadata design.md decision 8). Each operation is one
// transaction, so each is one undo step; typing into a text field batches into one step.

export interface SiteSettings {
  id: string;
  name: string;
  description: string;
  favicon: { nodes: string[] };
  share_image: { nodes: string[] };
  allow_ai_search: boolean;
  allow_ai_training: boolean;
  logo: { nodes: string[] };
  header_show_name: boolean;
  theme: string;
}

/** The properties that hold at most one image outside the page's blocks. */
export type ImageSlot = "favicon" | "share_image" | "logo";

type ImageFields = { id: string; src: string; alt: string; width: number; height: number };

export const siteSettings = (doc: Document) =>
  doc.nodes[doc.document_id] as unknown as SiteSettings;

/** The image in a slot of the site or a page, or undefined. */
export function slotImage(
  doc: Document,
  ownerId: string,
  slot: ImageSlot,
): ImageFields | undefined {
  const owner = doc.nodes[ownerId] as unknown as Record<ImageSlot, { nodes: string[] }> | undefined;
  const id = owner?.[slot]?.nodes[0];
  return id === undefined ? undefined : (doc.nodes[id] as unknown as ImageFields | undefined);
}

function setSiteText(session: Session, property: "name" | "description", value: string): void {
  const site = siteSettings(session.doc);
  if (site[property] === value) return;
  session.apply(session.tr.set([site.id, property], value), { batch: true });
}

export const setSiteName = (session: Session, name: string) => setSiteText(session, "name", name);

export const setSiteDescription = (session: Session, description: string) =>
  setSiteText(session, "description", description);

function setSiteSwitch(
  session: Session,
  property: "allow_ai_search" | "allow_ai_training",
  allowed: boolean,
): void {
  const site = siteSettings(session.doc);
  if (site[property] === allowed) return;
  session.apply(session.tr.set([site.id, property], allowed));
}

export const setAiSearch = (session: Session, allowed: boolean) =>
  setSiteSwitch(session, "allow_ai_search", allowed);

export const setAiTraining = (session: Session, allowed: boolean) =>
  setSiteSwitch(session, "allow_ai_training", allowed);

/**
 * Puts a chosen image into a slot of the site or a page (the favicon, a share image or the
 * logo), or empties the slot with `undefined`. A different image starts without a description;
 * choosing the same image again changes nothing.
 */
export function setSlotImage(
  session: Session,
  ownerId: string,
  slot: ImageSlot,
  image: ChosenImage | undefined,
): void {
  const tr = session.tr;
  if (changeSlotImage(session.doc, tr, ownerId, slot, image)) session.apply(tr);
}

/** Adds the slot change to `tr`; false when there is nothing to change. */
export function changeSlotImage(
  doc: Document,
  tr: Transaction,
  ownerId: string,
  slot: ImageSlot,
  image: ChosenImage | undefined,
): boolean {
  const current = slotImage(doc, ownerId, slot);
  if (!image) {
    if (!current) return false;
    tr.set([ownerId, slot], list());
  } else if (current) {
    if (current.src === image.key) return false;
    tr.set([current.id, "src"], image.key);
    tr.set([current.id, "width"], image.width);
    tr.set([current.id, "height"], image.height);
    tr.set([current.id, "alt"], "");
  } else {
    tr.set([ownerId, slot], list([createImage(tr, image)]));
  }
  return true;
}

/** Sets the description (alt text) of a share image, as the owner types. */
export function setSlotImageAlt(session: Session, imageId: string, alt: string): void {
  const image = session.doc.nodes[imageId] as unknown as ImageFields | undefined;
  if (!image || image.alt === alt) return;
  session.apply(session.tr.set([imageId, "alt"], alt), { batch: true });
}
