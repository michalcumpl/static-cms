<script lang="ts">
import { type DocumentPath, Node, type SveditContext, TextProperty } from "svedit";
import { getContext } from "svelte";
import { getI18n } from "$lib/i18n";
import { getEditor } from "../state.svelte";
import Child from "./Child.svelte";

// A group of the menu (menu-groups design decision 3): its label is editable, and its links
// show while the selection is in the group, so they stay editable too. Not a <details>: an
// editable summary would open and close as the owner types. The canvas keeps the focus, so the
// selection's path says where the caret is.
let { path }: { path: DocumentPath } = $props();
const svedit = getContext<SveditContext>("svedit");
const editor = getEditor();
const group = $derived(svedit.session.get(path));
const isCurrent = $derived(
  group.items.nodes.some(
    (id: string) =>
      (svedit.session.get(id) as { page_id?: string }).page_id === editor.currentPageId,
  ),
);
const open = $derived.by(() => {
  const at = (svedit.session.selection as { path?: DocumentPath } | null)?.path;
  return at !== undefined && path.every((step, i) => at[i] === step);
});
const i18n = getI18n();
</script>

<Node {path} tag="div" class={open ? "menu-group canvas-menu-group open" : "menu-group canvas-menu-group"}>
  <span class="canvas-menu-label" class:current={isCurrent}>
    <TextProperty tag="span" path={[...path, "label"]} placeholder={i18n.t("editor.canvas.menuGroup")} />
  </span>
  <ul>
    {#each group.items.nodes as id, index (id)}
      <li><Child path={[...path, "items", index]} /></li>
    {:else}
      <li class="canvas-menu-empty">{i18n.t("editor.left.groupEmpty")}</li>
    {/each}
  </ul>
</Node>

<style>
  :global(.site-nav .canvas-menu-group:not(.open) > ul) {
    display: none;
  }

  .canvas-menu-label {
    display: inline-flex;
    align-items: center;
    gap: 0.4rem;
  }

  .canvas-menu-label::after {
    content: "";
    width: 0.6em;
    height: 0.4em;
    background: currentColor;
    clip-path: polygon(0 0, 100% 0, 50% 100%);
  }

  .canvas-menu-label.current {
    color: var(--color-primary);
    text-decoration: underline;
    text-decoration-thickness: 2px;
  }

  .canvas-menu-empty {
    font-style: italic;
    opacity: 0.7;
  }
</style>
