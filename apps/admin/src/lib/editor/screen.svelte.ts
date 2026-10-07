import { Command, define_keymap, KeyMapper } from "svedit";
import { setContext } from "svelte";
import { beforeNavigate, goto } from "$app/navigation";
import { getI18n, type I18n } from "$lib/i18n";
import type MediaLibrary from "./MediaLibrary.svelte";
import type { EditorState } from "./state.svelte";

// What every screen that edits the site document needs around its `EditorState`: the question
// before leaving with unsaved changes, and the media library dialog (project-tabs design.md
// decision 3). The editor and the Settings tab both use them. Call them while a component
// initialises.

/**
 * The keyboard shortcuts around a mounted Svedit, which pushes the focused document's own on top:
 * Save, and Undo and Redo outside the editable text in areas marked `data-history-keys` (inputs
 * elsewhere, dialogs included, keep the browser's own undo). Returns the key mapper; the screen
 * passes the window's keydown events to it (offer-and-about decision 4).
 */
export function useEditorKeys(editor: EditorState): KeyMapper {
  const keyMapper = new KeyMapper();
  setContext("key_mapper", keyMapper);
  const inHistoryKeysArea = () => {
    const focused = document.activeElement;
    return Boolean(focused?.closest("[data-history-keys]") && !focused.closest("dialog"));
  };
  class SaveCommand extends Command {
    override execute() {
      return editor.save();
    }
  }
  class PanelUndoCommand extends Command {
    override is_enabled() {
      return inHistoryKeysArea();
    }
    override execute() {
      editor.undo();
    }
  }
  class PanelRedoCommand extends Command {
    override is_enabled() {
      return inHistoryKeysArea();
    }
    override execute() {
      editor.redo();
    }
  }
  keyMapper.push_scope(
    define_keymap({
      "meta+s,ctrl+s": [new SaveCommand({} as never)],
      "meta+z,ctrl+z": [new PanelUndoCommand({} as never)],
      "meta+shift+z,ctrl+shift+z,ctrl+y": [new PanelRedoCommand({} as never)],
    }),
  );
  return keyMapper;
}

/**
 * Asks before leaving (a link, Back, closing the window) with unsaved changes. `staysHere` says
 * which navigations keep the person on this screen, and so don't ask.
 */
export function useUnsavedGuard(editor: EditorState, staysHere: (to: URL) => boolean): void {
  const i18n = getI18n();
  beforeNavigate(({ to, cancel }) => {
    if (editor.leaving) return;
    if (editor.dirty && !(to && staysHere(to.url)) && !confirm(i18n.t("editor.confirmLeave"))) {
      cancel();
    }
  });
  $effect(() => {
    const onbeforeunload = (event: BeforeUnloadEvent) => {
      if (editor.dirty && !editor.leaving) event.preventDefault();
    };
    window.addEventListener("beforeunload", onbeforeunload);
    return () => window.removeEventListener("beforeunload", onbeforeunload);
  });
}

/**
 * Opens the panel section that holds a settings field, for this language: the Website section
 * for the site's settings, the Business section otherwise (control-panel design decision 4), at
 * the field (its element ID) when given. Unsaved changes are saved first, after asking, so the
 * section shows what the editor shows.
 */
export async function openSettings(
  editor: EditorState,
  t: I18n["t"],
  fieldId?: string,
): Promise<void> {
  const base = fieldId?.startsWith("site-settings-") ? editor.paths.website : editor.paths.business;
  await openAfterSaving(
    editor,
    t("editor.settingsSaveFirst"),
    fieldId ? `${base}${base.includes("?") ? "&" : "?"}focus=${encodeURIComponent(fieldId)}` : base,
  );
}

/**
 * Opens another screen of the project. Unsaved changes are saved first, after asking with
 * `question`, so the other screen shows what this one does; nothing opens if saving fails.
 * `reload` opens it with a full page load (the editor, from a list form: offer-and-about
 * decision 9).
 */
export async function openAfterSaving(
  editor: EditorState,
  question: string,
  href: string,
  reload = false,
): Promise<void> {
  if (editor.dirty) {
    if (!confirm(question)) return;
    await editor.save();
    if (editor.dirty || editor.status.kind !== "saved") return;
  }
  if (reload) window.location.assign(href);
  else await goto(href);
}

/** The save status in words: saving, saved, conflicts and failures (the editor's toolbar). */
export function saveStatusText(editor: EditorState, t: I18n["t"]): string {
  const status = editor.status;
  if (status.kind === "saving") return t("editor.status.saving");
  if (status.kind === "conflict") return status.message ?? t("editor.status.conflict");
  if (status.kind === "error") {
    if (status.message) return status.message;
    if (status.broken) return t("editor.status.broken");
    if (status.httpStatus) return t("editor.status.failed", { status: status.httpStatus });
    return t("editor.status.failedError", { error: status.exception ?? "" });
  }
  if (editor.dirty) return t("editor.status.unsaved");
  return status.kind === "saved" ? t("editor.status.saved") : t("editor.status.allSaved");
}

/**
 * Connects the editor to a `<MediaLibrary bind:this={media.ref} {editor} />` in the screen.
 * `restoreFocus` gives focus back to where the person was working once the dialog closes.
 */
export function useMediaLibrary(editor: EditorState, restoreFocus: () => void = () => {}) {
  let library: MediaLibrary | undefined = $state();
  editor.openLibrary = async (current) => {
    const chosen = await library?.open(current);
    restoreFocus();
    return chosen;
  };
  editor.openLibraryMany = async () => {
    const chosen = (await library?.openMany()) ?? [];
    restoreFocus();
    return chosen;
  };
  return {
    get ref() {
      return library;
    },
    set ref(value: MediaLibrary | undefined) {
      library = value;
    },
  };
}
