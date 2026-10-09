import type { Session } from "svedit";
import { handleTargets, selectionPath } from "./handles";
import type { BlockType } from "./transforms";

// Showing and hiding blocks (template-system, site-editing "Showing and hiding blocks"): a hidden
// block stays in its page and in the editor, but isn't on the website.

export interface BlockVisibility {
  id: string;
  type: BlockType;
  hidden: boolean;
}

/** The selected block, or the one holding the caret, with whether it is hidden. */
export function selectedVisibility(session: Session): BlockVisibility | undefined {
  const path = selectionPath(session);
  const target = path ? handleTargets(session, path).block : undefined;
  if (!target) return undefined;
  const hidden = (session.get(target.id) as { hidden?: unknown } | undefined)?.hidden;
  if (typeof hidden !== "boolean") return undefined;
  return { id: target.id, type: target.type as BlockType, hidden };
}

/** Hides a block, or shows it again. One undo step; nothing when it already is. */
export function setBlockHidden(session: Session, blockId: string, hidden: boolean): void {
  const current = (session.get(blockId) as { hidden?: unknown } | undefined)?.hidden;
  if (typeof current !== "boolean" || current === hidden) return;
  const tr = session.tr;
  tr.set([blockId, "hidden"], hidden);
  session.apply(tr);
}
