<script lang="ts">
import { Command, define_keymap, KeyMapper, Svedit } from "svedit";
import { setContext, untrack } from "svelte";
import { beforeNavigate, goto } from "$app/navigation";
import BlockInserter from "$lib/editor/BlockInserter.svelte";
import BlockPanel from "$lib/editor/BlockPanel.svelte";
import BusinessSettings from "$lib/editor/BusinessSettings.svelte";
import ButtonPanel from "$lib/editor/ButtonPanel.svelte";
import { canvasCss } from "$lib/editor/canvas-css";
import ImagePanel from "$lib/editor/ImagePanel.svelte";
import LanguageSwitcher from "$lib/editor/LanguageSwitcher.svelte";
import LinkDialog from "$lib/editor/LinkDialog.svelte";
import MediaLibrary from "$lib/editor/MediaLibrary.svelte";
import PageSettings from "$lib/editor/PageSettings.svelte";
import PagesSidebar from "$lib/editor/PagesSidebar.svelte";
import ProblemsPanel from "$lib/editor/ProblemsPanel.svelte";
import SiteSettings from "$lib/editor/SiteSettings.svelte";
import { EditorState, setEditor } from "$lib/editor/state.svelte";
import { insertItem, isFixedList, itemInsertionPoint } from "$lib/editor/structure";
import PublishButton from "$lib/PublishButton.svelte";
import { projectPaths } from "$lib/project-paths";
import type { LayoutProps } from "./$types";

let { data, children }: LayoutProps = $props();

const editor = setEditor(
  new EditorState(
    untrack(() => data.site),
    projectPaths(
      untrack(() => data.project.id),
      untrack(() => (data.lang === data.primaryLang ? undefined : data.lang)),
    ),
    {
      lang: untrack(() => data.lang),
      primaryLang: untrack(() => data.primaryLang),
      languages: untrack(() => data.languages),
    },
  ),
  untrack(() => data.project.id),
);
untrack(() => {
  if (data.tab) editor.settingsTab = data.tab;
  editor.translations = data.translations;
});
const session = editor.session;

// Svedit pushes the focused document's shortcuts on top of the app-level ones.
const keyMapper = new KeyMapper();
setContext("key_mapper", keyMapper);
class SaveCommand extends Command {
  override execute() {
    return editor.save();
  }
}
/**
 * Undo and redo from the sidebar and the page settings panel. Svedit handles them while the
 * canvas has focus; elsewhere (dialogs included) inputs keep the browser's own undo.
 */
function inHistoryKeysArea(): boolean {
  const focused = document.activeElement;
  return Boolean(focused?.closest("[data-history-keys]") && !focused.closest("dialog"));
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

// The theme can't change in M2, so the canvas stylesheet is built once.
$effect(() => {
  const style = document.createElement("style");
  style.textContent = canvasCss(
    untrack(() => session.doc),
    ".site-canvas",
  );
  document.head.append(style);
  return () => style.remove();
});

// The current page can disappear: deleted, or its addition undone. Show home instead.
$effect(() => {
  if (editor.currentPage) return;
  editor.showPage(editor.homeId);
  goto(editor.paths.edit(), { replaceState: true });
});

beforeNavigate(({ to, cancel }) => {
  // Pages of the same language stay in the editor; switching languages reloads it.
  const staysInEditor =
    to?.url.pathname.startsWith(projectPaths(data.project.id).edit()) &&
    (to.url.searchParams.get("lang") ?? editor.primaryLang) === editor.lang &&
    !to.url.searchParams.has("key");
  if (editor.leaving) return;
  if (editor.dirty && !staysInEditor && !confirm("You have unsaved changes. Leave anyway?")) {
    cancel();
  }
});

function onbeforeunload(event: BeforeUnloadEvent) {
  if (editor.dirty && !editor.leaving) event.preventDefault();
}

const commands = $derived(
  session.commands as Record<string, Command & { active?: boolean }> | undefined,
);
const canAddItem = $derived(itemInsertionPoint(session) !== undefined);

// Svedit deletes a node selection itself on Backspace/Delete, before any command runs.
// Keep the navigation and the hero's fixed slots from being deleted that way.
function guardFixedLists(event: InputEvent) {
  const selection = session.selection as { type: string; path: (string | number)[] } | null;
  const deleting = event.inputType.startsWith("delete");
  if (deleting && selection?.type === "node" && isFixedList(session, selection.path)) {
    event.preventDefault();
    event.stopPropagation();
  }
}

/** Publishing sends what is saved: save unsaved changes first, and stop if that fails. */
async function saveBeforePublish(): Promise<boolean> {
  if (!editor.dirty) return true;
  await editor.save();
  return editor.status.kind === "saved";
}

let linkDialog: LinkDialog | undefined = $state();
let mediaLibrary: MediaLibrary | undefined = $state();
editor.openLibrary = async (current) => {
  const chosen = await mediaLibrary?.open(current);
  // Focus left the canvas for the dialog; give it back before the image gets selected.
  canvas?.focus_canvas();
  return chosen;
};
editor.openLibraryMany = async () => {
  const chosen = (await mediaLibrary?.openMany()) ?? [];
  canvas?.focus_canvas();
  return chosen;
};
let canvas: { focus_canvas: () => void } | undefined = $state();
const linkEnabled = $derived(
  Boolean(commands && (!commands.link?.disabled || !commands.internal_link?.disabled)),
);

const statusText = $derived.by(() => {
  const status = editor.status;
  if (status.kind === "saving") return "Saving…";
  if (status.kind === "conflict" || status.kind === "error") return status.message;
  if (editor.dirty) return "Unsaved changes";
  return status.kind === "saved" ? "Saved" : "All changes saved";
});
</script>

<svelte:window onkeydown={(event) => keyMapper.handle_keydown(event)} {onbeforeunload} />

<svelte:head>
  <title>Editing {editor.currentPage?.title ?? ""} – Static CMS</title>
</svelte:head>

<div class="editor">
  <div class="left-column">
    <LanguageSwitcher {editor} projectId={data.project.id} />
    <PagesSidebar {editor} projectName={data.project.name} />
    <BlockInserter {editor} />
  </div>

  <div class="workspace">
    <div class="toolbar" role="toolbar" aria-label="Editing">
      <button type="button" title="Undo (Ctrl/Cmd+Z)" onclick={() => editor.undo()} disabled={commands?.undo?.disabled ?? true}>Undo</button>
      <button type="button" title="Redo (Ctrl/Cmd+Shift+Z)" onclick={() => editor.redo()} disabled={commands?.redo?.disabled ?? true}>Redo</button>
      <span class="separator"></span>
      <button type="button" class="mark" aria-label="Bold" title="Bold (Ctrl/Cmd+B)" aria-pressed={commands?.bold?.active ?? false} onmousedown={(e) => e.preventDefault()} onclick={() => commands?.bold?.execute()} disabled={commands?.bold?.disabled ?? true}><strong>B</strong></button>
      <button type="button" class="mark" aria-label="Italic" title="Italic (Ctrl/Cmd+I)" aria-pressed={commands?.italic?.active ?? false} onmousedown={(e) => e.preventDefault()} onclick={() => commands?.italic?.execute()} disabled={commands?.italic?.disabled ?? true}><em>I</em></button>
      <button type="button" onclick={() => linkDialog?.open()} disabled={!linkEnabled} title="Link the selected text">Link</button>
      <button type="button" onmousedown={(e) => e.preventDefault()} onclick={() => commands?.unlink?.execute()} disabled={commands?.unlink?.disabled ?? true} title="Remove the link">Unlink</button>
      <span class="separator"></span>
      <button type="button" title="Add a list item, service or person after the current one" onmousedown={(e) => e.preventDefault()} onclick={() => insertItem(session)} disabled={!canAddItem}>Add item</button>
      <button type="button" aria-label="Move up" title="Move up (Alt+↑)" onmousedown={(e) => e.preventDefault()} onclick={() => commands?.move_up?.execute()} disabled={commands?.move_up?.disabled ?? true}>↑</button>
      <button type="button" aria-label="Move down" title="Move down (Alt+↓)" onmousedown={(e) => e.preventDefault()} onclick={() => commands?.move_down?.execute()} disabled={commands?.move_down?.disabled ?? true}>↓</button>
      <button type="button" title="Delete the selected block or item" onmousedown={(e) => e.preventDefault()} onclick={() => commands?.delete_node?.execute()} disabled={commands?.delete_node?.disabled ?? true}>Delete</button>
      <span class="separator"></span>
      <fieldset class="width">
        <legend class="visually-hidden">Preview width</legend>
        <!-- Icons, with the radios kept for keyboard and screen-reader use. -->
        <label title="Desktop">
          <input class="visually-hidden" type="radio" bind:group={editor.width} value="desktop" />
          <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
            <rect x="3" y="4" width="18" height="12" rx="1.5" />
            <path d="M8 20h8M12 16v4" />
          </svg>
          <span class="visually-hidden">Desktop</span>
        </label>
        <label title="Mobile">
          <input class="visually-hidden" type="radio" bind:group={editor.width} value="mobile" />
          <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
            <rect x="7" y="2.5" width="10" height="19" rx="2" />
            <path d="M11 18.5h2" />
          </svg>
          <span class="visually-hidden">Mobile</span>
        </label>
      </fieldset>
      <span class="spacer"></span>
      <span class="status" role="status" class:problem={editor.status.kind === "conflict" || editor.status.kind === "error"}>{statusText}</span>
      <button type="button" class="save" onclick={() => editor.save()} disabled={editor.status.kind === "saving" || !editor.dirty}>Save</button>
      <PublishButton paths={editor.paths} unsaved={editor.dirty} beforePublish={saveBeforePublish} />
    </div>

    <div class="canvas-frame" onbeforeinputcapture={guardFixedLists}>
      <div class="site-canvas" class:mobile={editor.width === "mobile"}>
        <Svedit bind:this={canvas} {session} path={[editor.siteId]} editable={true} />
      </div>
    </div>
  </div>

  <aside class="panels" aria-label="Details">
    <div class="tabs" role="tablist" aria-label="Settings">
      <button
        type="button"
        role="tab"
        id="settings-tab-page"
        aria-selected={editor.settingsTab === "page"}
        aria-controls="settings-panel"
        onclick={() => (editor.settingsTab = "page")}
      >
        Page
      </button>
      <button
        type="button"
        role="tab"
        id="settings-tab-site"
        aria-selected={editor.settingsTab === "site"}
        aria-controls="settings-panel"
        onclick={() => (editor.settingsTab = "site")}
      >
        Site
      </button>
      <button
        type="button"
        role="tab"
        id="settings-tab-business"
        aria-selected={editor.settingsTab === "business"}
        aria-controls="settings-panel"
        onclick={() => (editor.settingsTab = "business")}
      >
        Business
      </button>
    </div>
    <div
      id="settings-panel"
      role="tabpanel"
      aria-labelledby="settings-tab-{editor.settingsTab}"
    >
      {#if editor.settingsTab === "page"}
        <PageSettings {editor} />
      {:else if editor.settingsTab === "site"}
        <SiteSettings {editor} />
      {:else}
        <BusinessSettings {editor} />
      {/if}
    </div>
    <ButtonPanel {editor} />
    <BlockPanel {editor} />
    <ImagePanel {editor} />
    <ProblemsPanel {editor} focusCanvas={() => canvas?.focus_canvas()} />
  </aside>
</div>

<!-- Focus left the canvas for the dialog; give it back, or Svedit restores a stale selection. -->
<LinkDialog {editor} bind:this={linkDialog} onclose={() => canvas?.focus_canvas()} />
<MediaLibrary {editor} bind:this={mediaLibrary} />

{@render children()}

<style>
  .editor {
    display: grid;
    grid-template-columns: 13rem 1fr 18rem;
    min-height: 100vh;
    font-family: system-ui, sans-serif;
  }

  .left-column {
    border-right: 1px solid #ddd;
    background: #f7f7f7;
  }

  .panels {
    border-left: 1px solid #ddd;
    background: #fafafa;
    font-family: system-ui, sans-serif;
  }

  .tabs {
    display: flex;
    border-bottom: 1px solid #ddd;
  }

  .tabs button {
    flex: 1;
    padding: 0.5rem;
    border: 0;
    border-bottom: 3px solid transparent;
    background: none;
    font: inherit;
    cursor: pointer;
  }

  .tabs button[aria-selected="true"] {
    border-bottom-color: #1f5a8a;
    font-weight: 600;
  }

  .workspace {
    display: flex;
    flex-direction: column;
    min-width: 0;
  }

  .toolbar {
    flex-wrap: wrap;
    position: sticky;
    top: 0;
    z-index: 10;
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.5rem 1rem;
    border-bottom: 1px solid #ddd;
    background: #fff;
  }

  .separator {
    width: 1px;
    height: 1.5rem;
    background: #ddd;
  }


  .spacer {
    flex: 1;
  }

  .width {
    display: flex;
    border: 0;
    margin: 0;
    padding: 0;
  }

  .width label {
    display: flex;
    padding: 0.2rem 0.35rem;
    border: 1px solid #bbb;
    color: #555;
    cursor: pointer;
  }

  .width label:first-of-type {
    border-radius: 0.3rem 0 0 0.3rem;
  }

  .width label:last-of-type {
    border-left: 0;
    border-radius: 0 0.3rem 0.3rem 0;
  }

  .width label:has(:checked) {
    background: #dde7f0;
    color: #1f5a8a;
  }

  .width label:has(:focus-visible) {
    outline: 2px solid #1f5a8a;
    outline-offset: 1px;
  }

  .width svg {
    fill: none;
    stroke: currentColor;
    stroke-width: 1.8;
    stroke-linecap: round;
  }

  .status {
    color: #555;
    font-size: 0.9rem;
  }

  .status.problem {
    color: #a3161a;
  }

  button[aria-pressed="true"] {
    background: #dde7f0;
  }

  .canvas-frame {
    flex: 1;
    padding: 1.5rem;
    background: #eceef0;
    overflow: auto;
  }

  .site-canvas {
    margin: 0 auto;
    background: #fff;
    box-shadow: 0 1px 4px rgb(0 0 0 / 0.15);
    transition: max-width 0.2s;
    max-width: 100%;
  }

  .site-canvas.mobile {
    max-width: 390px;
  }

  .visually-hidden {
    position: absolute;
    width: 1px;
    height: 1px;
    overflow: hidden;
    clip-path: inset(50%);
  }
</style>
