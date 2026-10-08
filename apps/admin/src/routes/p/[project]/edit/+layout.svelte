<script lang="ts">
import { type Command, Svedit } from "svedit";
import { untrack } from "svelte";
import { goto } from "$app/navigation";
import BlockHandles from "$lib/editor/BlockHandles.svelte";
import BlockPanel from "$lib/editor/BlockPanel.svelte";
import ButtonPanel from "$lib/editor/ButtonPanel.svelte";
import CardPanel from "$lib/editor/CardPanel.svelte";
import { canvasCss, canvasTheme } from "$lib/editor/canvas-css";
import { selectionLabel } from "$lib/editor/handles";
import ImagePanel from "$lib/editor/ImagePanel.svelte";
import LanguageSwitcher from "$lib/editor/LanguageSwitcher.svelte";
import LinkDialog from "$lib/editor/LinkDialog.svelte";
import MediaLibrary from "$lib/editor/MediaLibrary.svelte";
import PageSettings from "$lib/editor/PageSettings.svelte";
import PagesSidebar from "$lib/editor/PagesSidebar.svelte";
import ProblemsPanel from "$lib/editor/ProblemsPanel.svelte";
import {
  saveStatusText,
  useEditorKeys,
  useMediaLibrary,
  useUnsavedGuard,
} from "$lib/editor/screen.svelte";
import { EditorState, setEditor } from "$lib/editor/state.svelte";
import { canInsertItem, insertItem, isFixedList } from "$lib/editor/structure";
import ThemeSettings from "$lib/editor/ThemeSettings.svelte";
import VideoPanel from "$lib/editor/VideoPanel.svelte";
import { getI18n } from "$lib/i18n";
import PublishButton from "$lib/PublishButton.svelte";
import { projectPaths } from "$lib/project-paths";
import Button from "$lib/ui/Button.svelte";
import type { LayoutProps } from "./$types";

let { data, children }: LayoutProps = $props();
const i18n = getI18n();

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
const keyMapper = useEditorKeys(editor);

// The canvas follows the theme as it's edited (theme-and-branding design.md decision 8). The
// theme node is only replaced when it changes, so typing in a page doesn't rebuild the CSS.
const themeNode = $derived.by(() => {
  const site = session.doc.nodes[session.doc.document_id] as { theme?: string } | undefined;
  return site?.theme ? session.doc.nodes[site.theme] : undefined;
});
let shownTheme = canvasTheme(untrack(() => session.doc));
const canvasStyle = document.createElement("style");
$effect(() => {
  document.head.append(canvasStyle);
  return () => canvasStyle.remove();
});
$effect(() => {
  void themeNode;
  shownTheme = canvasTheme(
    untrack(() => session.doc),
    shownTheme,
  );
  canvasStyle.textContent = canvasCss(shownTheme, ".site-canvas");
});

// The current page can disappear: deleted, or its addition undone. Show home instead.
$effect(() => {
  if (editor.currentPage) return;
  editor.showPage(editor.homeId);
  goto(editor.paths.edit(), { replaceState: true });
});

// Pages of the same language stay in the editor; switching languages reloads it.
useUnsavedGuard(
  editor,
  (to) =>
    to.pathname.startsWith(projectPaths(data.project.id).edit()) &&
    (to.searchParams.get("lang") ?? editor.primaryLang) === editor.lang &&
    !to.searchParams.has("key"),
);

const commands = $derived(
  session.commands as Record<string, Command & { active?: boolean }> | undefined,
);
const canAddItem = $derived(canInsertItem(session));
// The block or item selected as a whole, in words (canvas-structure design.md decision 5).
const selectedLabel = $derived(selectionLabel(session, i18n.t));

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
// Focus left the canvas for the dialog; give it back before the image gets selected.
const media = useMediaLibrary(editor, () => canvas?.focus_canvas());
let canvas: { focus_canvas: () => void } | undefined = $state();
let canvasElement: HTMLElement | undefined = $state();
const linkEnabled = $derived(
  Boolean(commands && (!commands.link?.disabled || !commands.internal_link?.disabled)),
);

const statusText = $derived(saveStatusText(editor, i18n.t));
</script>

<svelte:window onkeydown={(event) => keyMapper.handle_keydown(event)} />

<svelte:head>
  <title>{i18n.t("common.pageTitle", { page: i18n.t("editor.pageTitle", { page: editor.currentPage?.title ?? "" }) })}</title>
</svelte:head>

<div class="editor">
  <div class="left-column">
    <div class="left-pages">
      <LanguageSwitcher {editor} projectId={data.project.id} />
      <PagesSidebar {editor} projectName={data.project.name} />
    </div>
    <div class="left-problems">
      <ProblemsPanel {editor} focusCanvas={() => canvas?.focus_canvas()} />
    </div>
  </div>

  <div class="workspace">
    <div class="toolbar" role="toolbar" aria-label={i18n.t("editor.toolbar.label")}>
      <Button size="sm" kind="quiet" icon="undo" title={i18n.t("editor.toolbar.undoTitle")} onclick={() => editor.undo()} disabled={commands?.undo?.disabled ?? true}>{i18n.t("editor.toolbar.undo")}</Button>
      <Button size="sm" kind="quiet" icon="redo" title={i18n.t("editor.toolbar.redoTitle")} onclick={() => editor.redo()} disabled={commands?.redo?.disabled ?? true}>{i18n.t("editor.toolbar.redo")}</Button>
      <span class="separator"></span>
      <button type="button" class="mark" aria-label={i18n.t("editor.toolbar.bold")} title={i18n.t("editor.toolbar.boldTitle")} aria-pressed={commands?.bold?.active ?? false} onmousedown={(e) => e.preventDefault()} onclick={() => commands?.bold?.execute()} disabled={commands?.bold?.disabled ?? true}><strong>B</strong></button>
      <button type="button" class="mark" aria-label={i18n.t("editor.toolbar.italic")} title={i18n.t("editor.toolbar.italicTitle")} aria-pressed={commands?.italic?.active ?? false} onmousedown={(e) => e.preventDefault()} onclick={() => commands?.italic?.execute()} disabled={commands?.italic?.disabled ?? true}><em>I</em></button>
      <Button size="sm" kind="quiet" onclick={() => linkDialog?.open()} disabled={!linkEnabled} title={i18n.t("editor.toolbar.linkTitle")}>{i18n.t("editor.toolbar.link")}</Button>
      <Button size="sm" kind="quiet" onmousedown={(e: MouseEvent) => e.preventDefault()} onclick={() => commands?.unlink?.execute()} disabled={commands?.unlink?.disabled ?? true} title={i18n.t("editor.toolbar.unlinkTitle")}>{i18n.t("editor.toolbar.unlink")}</Button>
      <span class="separator"></span>
      <span class="selection-label" aria-live="polite">{#if selectedLabel}{i18n.t("editor.toolbar.selected", { name: selectedLabel })}{/if}</span>
      <Button size="sm" kind="quiet" icon="plus" title={i18n.t("editor.toolbar.addItemTitle")} onmousedown={(e: MouseEvent) => e.preventDefault()} onclick={() => insertItem(session)} disabled={!canAddItem}>{i18n.t("editor.toolbar.addItem")}</Button>
      <button type="button" class="mark" aria-label={i18n.t("editor.toolbar.moveUp")} title={i18n.t("editor.toolbar.moveUpTitle")} onmousedown={(e) => e.preventDefault()} onclick={() => commands?.move_up?.execute()} disabled={commands?.move_up?.disabled ?? true}>↑</button>
      <button type="button" class="mark" aria-label={i18n.t("editor.toolbar.moveDown")} title={i18n.t("editor.toolbar.moveDownTitle")} onmousedown={(e) => e.preventDefault()} onclick={() => commands?.move_down?.execute()} disabled={commands?.move_down?.disabled ?? true}>↓</button>
      <Button size="sm" kind="quiet" icon="trash" title={i18n.t("editor.toolbar.deleteTitle")} onmousedown={(e: MouseEvent) => e.preventDefault()} onclick={() => commands?.delete_node?.execute()} disabled={commands?.delete_node?.disabled ?? true}>{i18n.t("editor.toolbar.delete")}</Button>
      <span class="separator"></span>
      <fieldset class="width">
        <legend class="visually-hidden">{i18n.t("editor.toolbar.width")}</legend>
        <!-- Icons, with the radios kept for keyboard and screen-reader use. -->
        <label title={i18n.t("editor.toolbar.desktop")}>
          <input class="visually-hidden" type="radio" bind:group={editor.width} value="desktop" />
          <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
            <rect x="3" y="4" width="18" height="12" rx="1.5" />
            <path d="M8 20h8M12 16v4" />
          </svg>
          <span class="visually-hidden">{i18n.t("editor.toolbar.desktop")}</span>
        </label>
        <label title={i18n.t("editor.toolbar.mobile")}>
          <input class="visually-hidden" type="radio" bind:group={editor.width} value="mobile" />
          <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
            <rect x="7" y="2.5" width="10" height="19" rx="2" />
            <path d="M11 18.5h2" />
          </svg>
          <span class="visually-hidden">{i18n.t("editor.toolbar.mobile")}</span>
        </label>
      </fieldset>
      <span class="spacer"></span>
      <span class="status" role="status" class:problem={editor.status.kind === "conflict" || editor.status.kind === "error"}>{statusText}</span>
      <Button size="sm" onclick={() => editor.save()} disabled={editor.status.kind === "saving" || !editor.dirty}>{i18n.t("editor.toolbar.save")}</Button>
      <PublishButton paths={editor.paths} unsaved={editor.dirty} beforePublish={saveBeforePublish} size="sm" />
    </div>

    <div class="canvas-frame" onbeforeinputcapture={guardFixedLists}>
      <div class="site-canvas" class:mobile={editor.width === "mobile"} bind:this={canvasElement}>
        <Svedit bind:this={canvas} {session} path={[editor.siteId]} editable={true} />
        <BlockHandles {editor} canvas={canvasElement} focusCanvas={() => canvas?.focus_canvas()} />
      </div>
    </div>
  </div>

  <aside class="panels" aria-label={i18n.t("editor.details")}>
    <div class="tabs" role="tablist" aria-label={i18n.t("editor.settings")}>
      <button
        type="button"
        role="tab"
        id="settings-tab-page"
        aria-selected={editor.settingsTab === "page"}
        aria-controls="settings-panel"
        onclick={() => (editor.settingsTab = "page")}
      >
        {i18n.t("editor.tabs.page")}
      </button>
      <button
        type="button"
        role="tab"
        id="settings-tab-design"
        aria-selected={editor.settingsTab === "design"}
        aria-controls="settings-panel"
        onclick={() => (editor.settingsTab = "design")}
      >
        {i18n.t("editor.tabs.design")}
      </button>
    </div>
    <div
      id="settings-panel"
      role="tabpanel"
      aria-labelledby="settings-tab-{editor.settingsTab}"
    >
      {#if editor.settingsTab === "page"}
        <PageSettings {editor} />
      {:else}
        <ThemeSettings {editor} />
      {/if}
    </div>
    <ButtonPanel {editor} />
    <BlockPanel {editor} focusCanvas={() => canvas?.focus_canvas()} />
    <CardPanel {editor} />
    <VideoPanel {editor} />
    <ImagePanel {editor} />
  </aside>
</div>

<!-- Focus left the canvas for the dialog; give it back, or Svedit restores a stale selection. -->
<LinkDialog {editor} bind:this={linkDialog} onclose={() => canvas?.focus_canvas()} />
<MediaLibrary {editor} bind:this={media.ref} />

{@render children()}

<style>
  .editor {
    display: grid;
    grid-template-columns: 16rem 1fr 18rem;
    min-height: calc(100vh - var(--ui-bar-height-compact));
    font-family: var(--ui-font);
  }

  /* Pages above, problems below: the column keeps the window's height, the problems scroll. */
  .left-column {
    position: sticky;
    top: var(--ui-bar-height-compact);
    align-self: start;
    display: flex;
    flex-direction: column;
    height: calc(100vh - var(--ui-bar-height-compact));
    overflow: hidden;
    border-right: 1px solid var(--ui-border);
    background: var(--ui-ground);
  }

  .left-pages {
    flex: 0 1 auto;
    max-height: 65%;
    overflow-y: auto;
  }

  .left-problems {
    flex: 1 1 0;
    min-height: 7rem;
    overflow-y: auto;
    border-top: 1px solid var(--ui-border);
  }

  .panels {
    border-left: 1px solid var(--ui-border);
    background: var(--ui-ground);
    font-family: var(--ui-font);
  }

  .tabs {
    display: flex;
    border-bottom: 1px solid var(--ui-border);
  }

  .tabs button {
    flex: 1;
    padding: 0.5rem 0.25rem;
    border: 0;
    border-bottom: 3px solid transparent;
    background: none;
    font: inherit;
    cursor: pointer;
  }

  .tabs button[aria-selected="true"] {
    border-bottom-color: var(--ui-focus);
    font-weight: 600;
  }

  .workspace {
    display: flex;
    flex-direction: column;
    min-width: 0;
  }

  .selection-label {
    font-size: 0.85rem;
    color: var(--ui-button-label);
    white-space: nowrap;
  }

  .toolbar {
    flex-wrap: wrap;
    position: sticky;
    top: 0;
    /* Above the canvas's overlays (selection outline, handles, menus) as they scroll under it. */
    z-index: 40;
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.5rem 1rem;
    border-bottom: 1px solid var(--ui-border);
    background: var(--ui-surface);
  }

  .separator {
    width: 1px;
    height: 1.5rem;
    background: var(--ui-border);
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
    border: 1px solid var(--ui-border-strong);
    color: var(--ui-muted);
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
    background: var(--ui-soft);
    color: var(--ui-focus);
  }

  .width label:has(:focus-visible) {
    outline: 2px solid var(--ui-focus);
    outline-offset: 1px;
  }

  .width svg {
    fill: none;
    stroke: currentColor;
    stroke-width: 1.8;
    stroke-linecap: round;
  }

  .status {
    color: var(--ui-muted);
    font-size: 0.9rem;
  }

  .status.problem {
    color: var(--ui-problem);
  }

  /* The toolbar's compact one-glyph buttons (bold, italic, move up and down). */
  .mark {
    display: inline-grid;
    place-items: center;
    min-width: var(--ui-control-sm);
    min-height: var(--ui-control-sm);
    padding: 0 var(--ui-space-2);
    border: 0;
    border-radius: var(--ui-radius-pill);
    background: transparent;
    color: var(--ui-ink);
    font: 600 var(--ui-text-sm) / 1 var(--ui-font);
    cursor: pointer;
  }

  .mark:hover:not(:disabled) {
    background: var(--ui-soft);
  }

  .mark:disabled {
    opacity: 0.5;
    cursor: default;
  }

  button[aria-pressed="true"] {
    background: var(--ui-button);
    color: var(--ui-button-label);
  }

  .canvas-frame {
    flex: 1;
    padding: 1.5rem;
    background: var(--ui-ground);
    overflow: auto;
  }

  .site-canvas {
    position: relative;
    margin: 0 auto;
    background: var(--ui-surface);
    box-shadow: 0 1px 4px rgb(0 0 0 / 0.15);
    transition: max-width 0.2s;
    max-width: 100%;
  }

  /* A block just added: outlined for a moment (canvas-structure design.md decision 9). */
  .site-canvas :global([data-just-added]) {
    outline: 3px solid var(--ui-focus);
    outline-offset: -3px;
    transition: outline-color 0.6s;
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
