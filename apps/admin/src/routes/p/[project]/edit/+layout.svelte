<script lang="ts">
import { Command, define_keymap, KeyMapper, Svedit } from "svedit";
import { setContext, untrack } from "svelte";
import { beforeNavigate } from "$app/navigation";
import { canvasCss } from "$lib/editor/canvas-css";
import ImagePanel from "$lib/editor/ImagePanel.svelte";
import LinkDialog from "$lib/editor/LinkDialog.svelte";
import ProblemsPanel from "$lib/editor/ProblemsPanel.svelte";
import { EditorState, setEditor } from "$lib/editor/state.svelte";
import {
  availableBlocks,
  insertBlock,
  insertItem,
  isFixedList,
  itemInsertionPoint,
} from "$lib/editor/structure";
import type { BlockType } from "$lib/editor/transforms";
import { projectPaths } from "$lib/project-paths";
import type { LayoutProps } from "./$types";

let { data, children }: LayoutProps = $props();

const editor = setEditor(
  new EditorState(
    untrack(() => data.site),
    projectPaths(untrack(() => data.project.id)),
  ),
);
const session = editor.session;

// Svedit pushes the focused document's shortcuts on top of the app-level ones.
const keyMapper = new KeyMapper();
setContext("key_mapper", keyMapper);
class SaveCommand extends Command {
  override execute() {
    return editor.save();
  }
}
keyMapper.push_scope(define_keymap({ "meta+s,ctrl+s": [new SaveCommand({} as never)] }));

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

beforeNavigate(({ to, cancel }) => {
  const staysInEditor = to?.url.pathname.startsWith(editor.paths.edit());
  if (editor.dirty && !staysInEditor && !confirm("You have unsaved changes. Leave anyway?")) {
    cancel();
  }
});

function onbeforeunload(event: BeforeUnloadEvent) {
  if (editor.dirty) event.preventDefault();
}

const commands = $derived(
  session.commands as Record<string, Command & { active?: boolean }> | undefined,
);
const BLOCK_LABELS: Record<BlockType, string> = {
  hero: "Hero",
  rich_text: "Text",
  services: "Services",
};
const insertable = $derived(availableBlocks(session, editor.siteId, editor.pageIndex));
const canAddItem = $derived(itemInsertionPoint(session) !== undefined);

function addBlock(type: BlockType) {
  insertBlock(session, editor.siteId, editor.pageIndex, type);
}

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

let linkDialog: LinkDialog | undefined = $state();
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
  <title>Editing {editor.pages[editor.pageIndex]?.title ?? ""} – Static CMS</title>
</svelte:head>

<div class="editor">
  <aside class="sidebar" aria-label="Pages">
    <a class="back" href={editor.paths.overview}>← {data.project.name}</a>
    <h2>Pages</h2>
    <ul>
      {#each editor.pages as p, index (p.id)}
        <li>
          <a href={p.href} aria-current={index === editor.pageIndex ? "page" : undefined}>{p.title}</a>
        </li>
      {/each}
    </ul>
  </aside>

  <div class="workspace">
    <div class="toolbar" role="toolbar" aria-label="Editing">
      <button type="button" title="Undo (Ctrl/Cmd+Z)" onclick={() => commands?.undo?.execute()} disabled={commands?.undo?.disabled ?? true}>Undo</button>
      <button type="button" title="Redo (Ctrl/Cmd+Shift+Z)" onclick={() => commands?.redo?.execute()} disabled={commands?.redo?.disabled ?? true}>Redo</button>
      <span class="separator"></span>
      <button type="button" class="mark" aria-label="Bold" title="Bold (Ctrl/Cmd+B)" aria-pressed={commands?.bold?.active ?? false} onmousedown={(e) => e.preventDefault()} onclick={() => commands?.bold?.execute()} disabled={commands?.bold?.disabled ?? true}><strong>B</strong></button>
      <button type="button" class="mark" aria-label="Italic" title="Italic (Ctrl/Cmd+I)" aria-pressed={commands?.italic?.active ?? false} onmousedown={(e) => e.preventDefault()} onclick={() => commands?.italic?.execute()} disabled={commands?.italic?.disabled ?? true}><em>I</em></button>
      <button type="button" onclick={() => linkDialog?.open()} disabled={!linkEnabled} title="Link the selected text">Link</button>
      <button type="button" onmousedown={(e) => e.preventDefault()} onclick={() => commands?.unlink?.execute()} disabled={commands?.unlink?.disabled ?? true} title="Remove the link">Unlink</button>
      <span class="separator"></span>
      <span class="group" role="group" aria-label="Add block">
        Add:
        {#each ["hero", "rich_text", "services"] as const as type (type)}
          <button type="button" onmousedown={(e) => e.preventDefault()} onclick={() => addBlock(type)} disabled={!insertable.includes(type)}>{BLOCK_LABELS[type]}</button>
        {/each}
      </span>
      <button type="button" title="Add a list or service item after the current one" onmousedown={(e) => e.preventDefault()} onclick={() => insertItem(session)} disabled={!canAddItem}>Add item</button>
      <button type="button" aria-label="Move up" title="Move up (Alt+↑)" onmousedown={(e) => e.preventDefault()} onclick={() => commands?.move_up?.execute()} disabled={commands?.move_up?.disabled ?? true}>↑</button>
      <button type="button" aria-label="Move down" title="Move down (Alt+↓)" onmousedown={(e) => e.preventDefault()} onclick={() => commands?.move_down?.execute()} disabled={commands?.move_down?.disabled ?? true}>↓</button>
      <button type="button" title="Delete the selected block or item" onmousedown={(e) => e.preventDefault()} onclick={() => commands?.delete_node?.execute()} disabled={commands?.delete_node?.disabled ?? true}>Delete</button>
      <span class="separator"></span>
      <fieldset class="width">
        <legend class="visually-hidden">Preview width</legend>
        <label><input type="radio" bind:group={editor.width} value="desktop" /> Desktop</label>
        <label><input type="radio" bind:group={editor.width} value="mobile" /> Mobile</label>
      </fieldset>
      <span class="spacer"></span>
      <span class="status" role="status" class:problem={editor.status.kind === "conflict" || editor.status.kind === "error"}>{statusText}</span>
      <button type="button" class="save" onclick={() => editor.save()} disabled={editor.status.kind === "saving" || !editor.dirty}>Save</button>
    </div>

    <div class="canvas-frame" onbeforeinputcapture={guardFixedLists}>
      <div class="site-canvas" class:mobile={editor.width === "mobile"}>
        <Svedit bind:this={canvas} {session} path={[editor.siteId]} editable={true} />
      </div>
    </div>
  </div>

  <aside class="panels" aria-label="Details">
    <ImagePanel {editor} />
    <ProblemsPanel {editor} focusCanvas={() => canvas?.focus_canvas()} />
  </aside>
</div>

<!-- Focus left the canvas for the dialog; give it back, or Svedit restores a stale selection. -->
<LinkDialog {editor} bind:this={linkDialog} onclose={() => canvas?.focus_canvas()} />

{@render children()}

<style>
  .editor {
    display: grid;
    grid-template-columns: 13rem 1fr 18rem;
    min-height: 100vh;
    font-family: system-ui, sans-serif;
  }

  .sidebar {
    border-right: 1px solid #ddd;
    padding: 1rem;
    background: #f7f7f7;
  }

  .sidebar h2 {
    font-size: 0.8rem;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: #555;
  }

  .sidebar ul {
    list-style: none;
    padding: 0;
  }

  .sidebar a[aria-current="page"] {
    font-weight: 700;
  }

  .panels {
    border-left: 1px solid #ddd;
    background: #fafafa;
    font-family: system-ui, sans-serif;
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

  .group {
    display: inline-flex;
    align-items: center;
    gap: 0.25rem;
    font-size: 0.9rem;
    color: #555;
  }

  .spacer {
    flex: 1;
  }

  .width {
    display: flex;
    gap: 0.75rem;
    border: 0;
    margin: 0;
    padding: 0;
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
