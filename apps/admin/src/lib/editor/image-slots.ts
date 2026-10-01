import type { DocumentPath } from "svedit";
import { tick } from "svelte";
import { locateNode } from "./locate";
import type { EditorState } from "./state.svelte";
import { addItemsWithImages, removeImage, setImage } from "./transforms";

// Images of any block (image-blocks design.md decision 4): the hero, text with image, a person's
// portrait, a gallery photo and a logo all keep their image in an `image` list of 0..1 nodes.

/** The element ID of the Image panel's alt text field. */
export const IMAGE_ALT_FIELD = "image-alt";

/** Node types whose image may be taken away; gallery photos and logos always keep one. */
export const OPTIONAL_IMAGE_OWNERS: readonly string[] = [
  "hero",
  "text_with_image",
  "person",
  "testimonial",
];

type Doc = Parameters<typeof locateNode>[0];

/** Portraits and testimonial photos sit next to the person's name, which describes them. */
export function startsDecorative(ownerType: string): boolean {
  return ownerType === "person" || ownerType === "testimonial";
}

/**
 * Lets the owner pick an image in the media library, then puts it into its owner (one undoable
 * action), selects it, and focuses its alt text so it gets described right away. A person's
 * portrait and a testimonial's photo start decorative: the name is next to them.
 */
export async function chooseImage(editor: EditorState, ownerId: string): Promise<void> {
  const { session } = editor;
  const owner = session.get(ownerId) as { type: string; image: { nodes: string[] } } | undefined;
  if (!owner) return;
  const current = owner.image.nodes[0];
  const currentKey = current ? (session.get(current) as { src: string }).src : undefined;
  const chosen = await editor.openLibrary(currentKey);
  if (!chosen) return;
  const ownerPath = locateNode(session.doc as unknown as Doc, ownerId)?.path;
  if (!ownerPath) return;
  const tr = session.tr;
  setImage(tr, ownerId, chosen, { decorative: startsDecorative(owner.type) });
  tr.set_selection({ type: "property", path: [...ownerPath, "image", 0, "src"] as DocumentPath });
  session.apply(tr);
  await tick();
  document.getElementById(IMAGE_ALT_FIELD)?.focus();
}

/** Takes the image out of its owner; the selection pointed at it, so it goes too. */
export function removeImageFrom(editor: EditorState, ownerId: string): void {
  const tr = editor.session.tr;
  if (!removeImage(tr, ownerId)) return;
  tr.set_selection(null as never);
  editor.session.apply(tr);
}

/** The node holding the selected image, from the selection's path (`…, owner, "image", 0, …`). */
export function ownerOfSelectedImage(
  editor: EditorState,
): { id: string; type: string } | undefined {
  const selection = editor.session.selection as { path?: DocumentPath } | null;
  const path = selection?.path;
  if (!path) return undefined;
  const index = path.lastIndexOf("image");
  if (index < 1) return undefined;
  const owner = editor.session.get(path.slice(0, index)) as { id?: string; type?: string };
  return owner?.id && owner.type ? { id: owner.id, type: owner.type } : undefined;
}

/**
 * Lets the owner pick several images in the media library and adds one item per image to a
 * gallery, team or logos block, in one undoable action.
 */
export async function addImagesToBlock(editor: EditorState, blockId: string): Promise<void> {
  const chosen = await editor.openLibraryMany();
  if (chosen.length === 0) return;
  const tr = editor.session.tr;
  addItemsWithImages(tr, blockId, chosen);
  editor.session.apply(tr);
}
