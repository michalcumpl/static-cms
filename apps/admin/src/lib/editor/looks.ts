import {
  CARDS_LAYOUTS,
  GALLERY_IMAGE_FITS,
  HERO_LAYOUTS,
  SERVICES_LAYOUTS,
  TEAM_LAYOUTS,
} from "@webmio/model";
import type { Session } from "svedit";
import { handleTargets, selectionPath } from "./handles";
import { createSlide } from "./transforms";

/** The block types with a choice of look, the property holding it and its values (block-variants). */
export const LOOKS = {
  hero: { property: "layout", values: HERO_LAYOUTS },
  services: { property: "layout", values: SERVICES_LAYOUTS },
  team: { property: "layout", values: TEAM_LAYOUTS },
  gallery: { property: "image_fit", values: GALLERY_IMAGE_FITS },
  cards: { property: "layout", values: CARDS_LAYOUTS },
} as const;

export type LookBlockType = keyof typeof LOOKS;

export type LookBlock = {
  id: string;
  type: LookBlockType;
  property: string;
  values: readonly string[];
  value: string;
  /** A full-photo hero without a photo, which shows beside the text until it has one. */
  missingImage: boolean;
};

const isLookBlockType = (type: string): type is LookBlockType => type in LOOKS;

/** The selected block, or the one holding the caret, when it has a choice of look. */
export function selectedLookBlock(session: Session): LookBlock | undefined {
  const path = selectionPath(session);
  const target = path ? handleTargets(session, path).block : undefined;
  if (!target || !isLookBlockType(target.type)) return undefined;
  const node = session.get(target.id) as Record<string, unknown> & { image?: { nodes: string[] } };
  const { property, values } = LOOKS[target.type];
  const value = String(node[property]);
  return {
    id: target.id,
    type: target.type,
    property,
    values,
    value,
    missingImage: target.type === "hero" && value === "cover" && !node.image?.nodes.length,
  };
}

/** Sets a block's look. One undo step. */
export function setBlockLook(session: Session, blockId: string, property: string, value: string) {
  const block = session.get(blockId) as { type?: string } | undefined;
  if (!block?.type || !isLookBlockType(block.type)) return;
  const look = LOOKS[block.type];
  if (look.property !== property || !(look.values as readonly string[]).includes(value)) return;
  const tr = session.tr;
  tr.set([blockId, property], value);
  // A hero becoming a slideshow starts with two empty slides (hero-slideshow decision 4).
  const slides = (block as { slides?: { nodes: string[] } }).slides;
  if (block.type === "hero" && value === "slideshow" && slides?.nodes.length === 0) {
    tr.set([blockId, "slides"], {
      nodes: [createSlide(tr), createSlide(tr)],
      marks: [],
      annotations: [],
    });
  }
  session.apply(tr);
}
