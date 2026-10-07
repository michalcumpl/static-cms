import type { CollectionName } from "@webmio/model";
import { getContext, setContext } from "svelte";
import type { I18n } from "$lib/i18n";
import type { EditorState } from "../state.svelte";

export { listFieldId } from "../locate";

// Which lists a panel section's form shows, and the prefix of its field IDs (offer-and-about
// decisions 2 and 7): set by the section screen, read by the form's node components.

export interface FormLists {
  section: "offer" | "about";
  lists: readonly CollectionName[];
  /** Deletes an item, asking first when pages show it; the dialog lives outside the form. */
  askDelete: (collection: CollectionName, itemId: string, name: string) => void;
}

const KEY = Symbol("form-lists");

export function setFormLists(lists: FormLists): void {
  setContext(KEY, lists);
}

export function getFormLists(): FormLists {
  return getContext<FormLists>(KEY);
}

/** Why a list's items can't be added, deleted or moved here: another language, as on the canvas. */
export function listFixedReason(
  t: I18n["t"],
  editor: EditorState,
  collection: CollectionName,
): string {
  return t("editor.handles.addedInPrimary", {
    collection: t(`editor.collections.${collection}`),
    language: editor.primaryName,
  });
}
