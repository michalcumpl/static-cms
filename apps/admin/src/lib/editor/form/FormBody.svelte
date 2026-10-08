<script lang="ts">
import { type DocumentPath, NodeArrayProperty, type SveditContext } from "svedit";
import { getContext, tick } from "svelte";
import { getI18n } from "$lib/i18n";
import Button from "$lib/ui/Button.svelte";
import { startBody } from "../item-pages";
import { getFormLists, listFieldId } from "./lists";

// The text of a project or of a service's page: paragraphs, subheadings and lists, edited with
// the editor's own node components and shortcuts (collection-pages decision 6).
let { path, label }: { path: DocumentPath; label: string } = $props();
const i18n = getI18n();
const svedit = getContext<SveditContext>("svedit");
const form = getFormLists();
const owner = $derived(svedit.session.get(path) as { id: string; body: { nodes: string[] } });
const id = $derived(listFieldId(form.section, owner.id, "body"));

async function start() {
  startBody(svedit.session, owner.id);
  await tick();
  svedit.session.selection = {
    type: "text",
    path: [...path, "body", 0, "content"],
    anchor_offset: 0,
    focus_offset: 0,
  } as never;
  svedit.focus_canvas();
}
</script>

<div class="field">
  <span class="label" id="{id}-label" contenteditable="false">{label}</span>
  {#if owner.body.nodes.length > 0}
    <div class="body" {id} role="group" aria-labelledby="{id}-label">
      <NodeArrayProperty path={[...path, "body"]} />
    </div>
  {:else}
    <div contenteditable="false">
      <Button size="sm" {id} icon="plus" onclick={start}>{i18n.t("panel.lists.fields.addText")}</Button>
    </div>
  {/if}
</div>

<style>
  .field {
    display: flex;
    flex-direction: column;
    gap: var(--ui-space-1);
  }

  .label {
    font-size: var(--ui-text-sm);
    font-weight: 600;
    user-select: none;
  }

  .body {
    padding: var(--ui-space-2) var(--ui-space-3);
    border: 1px solid var(--ui-border-strong);
    border-radius: var(--ui-radius-field);
    background: var(--ui-surface);
    font: var(--ui-text-md) / 1.5 var(--ui-font);
  }

  .body :global(p),
  .body :global(ul) {
    margin: 0 0 var(--ui-space-2);
  }

  .body :global(h2),
  .body :global(h3) {
    margin: var(--ui-space-2) 0;
    font-size: var(--ui-text-md);
  }

  .body:focus-within {
    outline: 3px solid var(--ui-focus);
  }
</style>
