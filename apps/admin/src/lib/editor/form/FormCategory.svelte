<script lang="ts">
import { type DocumentPath, Node, type SveditContext } from "svedit";
import { getContext } from "svelte";
import { getI18n } from "$lib/i18n";
import Button from "$lib/ui/Button.svelte";
import { categoryUse, deleteCategory } from "../item-pages";
import { getEditor } from "../state.svelte";
import FormField from "./FormField.svelte";

// A project category in the Projects list: its name, and deleting it after saying what uses it.
let { path }: { path: DocumentPath } = $props();
const i18n = getI18n();
const svedit = getContext<SveditContext>("svedit");
const editor = getEditor();
const category = $derived(svedit.session.get(path) as { id: string; name: { content: string } });
const index = $derived(Number(path[path.length - 1]));
let asking = $state(false);
const use = $derived(categoryUse(svedit.session.doc as never, category.id));
const name = $derived(
  category.name.content.trim() || i18n.t("panel.lists.categories.name", { n: index + 1 }),
);

function remove() {
  if (use.projects === 0 && use.blocks === 0)
    deleteCategory(svedit.session, editor.siteId, category.id);
  else asking = true;
}
</script>

<Node {path} tag="div" class="category-row">
  <FormField path={[...path, "name"]} label={i18n.t("panel.lists.categories.name", { n: index + 1 })} />
  <div class="actions" contenteditable="false">
    {#if asking}
      <p class="ask" role="alert">
        <strong>{i18n.t("panel.lists.categories.deleteTitle", { name })}</strong>
        {i18n.t("panel.lists.categories.deleteUsed", { projects: use.projects, blocks: use.blocks })}
      </p>
      <Button size="sm" kind="danger" onclick={() => deleteCategory(svedit.session, editor.siteId, category.id)}>{i18n.t("common.delete")}</Button>
      <Button size="sm" kind="quiet" onclick={() => (asking = false)}>{i18n.t("common.cancel")}</Button>
    {:else}
      <Button size="sm" kind="quiet" icon="trash" disabled={editor.sharedReadOnly} onclick={remove}>{i18n.t("common.delete")}</Button>
    {/if}
  </div>
</Node>

<style>
  :global(.category-row) {
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto;
    align-items: end;
    gap: var(--ui-space-2);
  }

  .actions {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: var(--ui-space-1);
    user-select: none;
  }

  .ask {
    flex-basis: 100%;
    margin: 0;
    font-size: var(--ui-text-sm);
  }
</style>
