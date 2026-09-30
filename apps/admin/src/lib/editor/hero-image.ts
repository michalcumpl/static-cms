import type { DocumentPath } from "svedit";
import { tick } from "svelte";
import { locateNode } from "./locate";
import type { EditorState } from "./state.svelte";
import { removeHeroImage, setHeroImage } from "./transforms";

/** The element ID of the Image panel's alt text field. */
export const IMAGE_ALT_FIELD = "image-alt";

type Doc = Parameters<typeof locateNode>[0];

/**
 * Lets the owner pick a hero image in the media library, then puts it into the hero (one
 * undoable action), selects it, and focuses its alt text so it gets described right away.
 */
export async function chooseHeroImage(editor: EditorState, heroId: string): Promise<void> {
  const { session } = editor;
  const hero = session.get(heroId) as { image: { nodes: string[] } } | undefined;
  const current = hero?.image.nodes[0];
  const currentKey = current ? (session.get(current) as { src: string }).src : undefined;
  const chosen = await editor.openLibrary(currentKey);
  if (!chosen) return;
  const heroPath = locateNode(session.doc as unknown as Doc, heroId)?.path;
  if (!heroPath) return;
  const tr = session.tr;
  setHeroImage(tr, heroId, chosen);
  tr.set_selection({ type: "property", path: [...heroPath, "image", 0, "src"] as DocumentPath });
  session.apply(tr);
  await tick();
  document.getElementById(IMAGE_ALT_FIELD)?.focus();
}

/** Takes the image out of its hero; the selection pointed at it, so it goes too. */
export function removeImageFromHero(editor: EditorState, heroId: string): void {
  const tr = editor.session.tr;
  if (!removeHeroImage(tr, heroId)) return;
  tr.set_selection(null as never);
  editor.session.apply(tr);
}

/** The hero whose image is selected, from the selection's path (`…, hero, "image", 0, "src"`). */
export function heroOfSelectedImage(editor: EditorState): string | undefined {
  const selection = editor.session.selection as { path?: DocumentPath } | null;
  const path = selection?.path;
  if (!path) return undefined;
  const index = path.lastIndexOf("image");
  if (index < 1) return undefined;
  const owner = editor.session.get(path.slice(0, index)) as { id?: string; type?: string };
  return owner?.type === "hero" ? owner.id : undefined;
}
