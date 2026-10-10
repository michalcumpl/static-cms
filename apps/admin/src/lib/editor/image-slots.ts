import type { DocumentPath } from "svedit";
import { tick } from "svelte";
import { locateNode } from "./locate";
import type { EditorState } from "./state.svelte";
import { addItemsWithImages, imagePropertyOf, removeImage, setImage } from "./transforms";

// Images of any block (image-blocks design.md decision 4): the hero, text with image, a person's
// portrait, a gallery photo and a logo all keep their image in an `image` list of 0..1 nodes.

/** The element ID of the Image panel's alt text field. */
export const IMAGE_ALT_FIELD = "image-alt";

/** Node types whose image may be taken away; gallery photos and logos always keep one. */
export const OPTIONAL_IMAGE_OWNERS: readonly string[] = [
  "hero",
  "banner",
  "text_with_image",
  "person",
  "testimonial",
  "project",
];

type Doc = Parameters<typeof locateNode>[0];

/** Node types whose images the site always shows whole, so they have no focal point. */
const WHOLE_IMAGE_OWNERS: readonly string[] = ["logo_item", "site"];

/** Whether the site may cut this owner's image, so that a focal point matters. */
export function hasFocalPoint(ownerType: string): boolean {
  return !WHOLE_IMAGE_OWNERS.includes(ownerType);
}

/**
 * The shape (width / height) the site cuts an owner's image to, or undefined where it shows
 * the image in its own shape (image-cropping design decision 5). `image_fit` is the gallery's
 * look, for a gallery's photo.
 */
export function shapeOf(ownerType: string, galleryFit?: string): number | undefined {
  switch (ownerType) {
    case "gallery_item":
      return galleryFit === "whole" ? undefined : 4 / 3;
    case "card":
      return 4 / 3;
    case "project":
      return 16 / 10;
    case "person":
    case "testimonial":
      return 1;
    case "share_image":
      return 1200 / 630;
    default:
      return undefined;
  }
}

/** The look of the gallery holding a gallery photo, for its shape. */
export function galleryFitOf(doc: Doc, itemId: string): string | undefined {
  for (const node of Object.values(doc.nodes)) {
    const items = node.items as { nodes: string[] } | undefined;
    if (node.type === "gallery" && items?.nodes.includes(itemId)) return node.image_fit as string;
  }
  return undefined;
}

/** Portraits and testimonial photos sit next to the person's name, which describes them. */
export function startsDecorative(ownerType: string): boolean {
  // A video's poster sits under its play link, which its title names.
  return ownerType === "person" || ownerType === "testimonial" || ownerType === "video";
}

/**
 * Lets the owner pick an image in the media library, then puts it into its owner (one undoable
 * action), selects it, and focuses its alt text so it gets described right away. A person's
 * portrait and a testimonial's photo start decorative: the name is next to them.
 */
export async function chooseImage(editor: EditorState, ownerId: string): Promise<void> {
  const { session } = editor;
  const owner = session.get(ownerId) as
    | ({ type: string } & Record<string, { nodes: string[] }>)
    | undefined;
  if (!owner) return;
  const property = imagePropertyOf(owner.type);
  const current = owner[property]?.nodes[0];
  const currentKey = current ? (session.get(current) as { src: string }).src : undefined;
  const chosen = await editor.openLibrary(currentKey);
  if (!chosen) return;
  const ownerPath = locateNode(session.doc as unknown as Doc, ownerId)?.path;
  if (!ownerPath) return;
  const tr = session.tr;
  setImage(tr, ownerId, chosen, { decorative: startsDecorative(owner.type) });
  tr.set_selection({ type: "property", path: [...ownerPath, property, 0, "src"] as DocumentPath });
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
  const index = Math.max(path.lastIndexOf("image"), path.lastIndexOf("cover"));
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
