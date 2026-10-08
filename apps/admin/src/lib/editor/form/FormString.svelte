<script lang="ts">
import { setString } from "../item-pages";
import { getEditor } from "../state.svelte";
import { getFormLists, listFieldId } from "./lists";

// A plain string of an item, such as a video address or a page address, as an ordinary input
// (collection-pages decision 6). Svedit takes input events inside its editable root as typing, so
// the field keeps its own.
let {
  nodeId,
  property,
  label,
  prefix = "",
  placeholder = "",
  type = "text",
  children,
}: {
  nodeId: string;
  property: string;
  label: string;
  prefix?: string;
  placeholder?: string;
  type?: "text" | "url";
  children?: import("svelte").Snippet;
} = $props();
const editor = getEditor();
const form = getFormLists();
const id = $derived(listFieldId(form.section, nodeId, property));
const value = $derived(
  String((editor.session.get(nodeId) as Record<string, unknown> | undefined)?.[property] ?? ""),
);
</script>

<div class="field" contenteditable="false" onbeforeinput={(event) => event.stopPropagation()}>
  <label class="label" for={id}>{label}</label>
  <div class="row">
    {#if prefix}<span class="prefix">{prefix}</span>{/if}
    <input
      {id}
      {type}
      {value}
      {placeholder}
      spellcheck="false"
      oninput={(event) => setString(editor.session, nodeId, property, event.currentTarget.value)}
    />
    {@render children?.()}
  </div>
</div>

<style>
  .field {
    display: flex;
    flex-direction: column;
    gap: var(--ui-space-1);
    user-select: none;
  }

  .label {
    font-size: var(--ui-text-sm);
    font-weight: 600;
  }

  .row {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: var(--ui-space-2);
  }

  .prefix {
    color: var(--ui-muted);
    font-size: var(--ui-text-sm);
  }

  input {
    flex: 1 1 12rem;
    min-height: var(--ui-control);
    padding: var(--ui-space-2) var(--ui-space-3);
    border: 1px solid var(--ui-border-strong);
    border-radius: var(--ui-radius-field);
    background: var(--ui-surface);
    color: var(--ui-ink);
    font: var(--ui-text-md) / 1.4 var(--ui-font);
    user-select: text;
  }
</style>
