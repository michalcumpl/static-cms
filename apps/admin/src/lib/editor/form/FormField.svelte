<script lang="ts">
import { type DocumentPath, type SveditContext, TextProperty } from "svedit";
import { getContext } from "svelte";
import { getFormLists, listFieldId } from "./lists";

// One text of an item, labelled like an input. The text is Svedit's, so marks, undo and paste
// are the editor's (offer-and-about decision 2).
let {
  path,
  label,
  multiline = false,
}: { path: DocumentPath; label: string; multiline?: boolean } = $props();
const svedit = getContext<SveditContext>("svedit");
const form = getFormLists();
const property = $derived(String(path[path.length - 1]));
const itemId = $derived((svedit.session.get(path.slice(0, -1)) as { id: string }).id);
const id = $derived(listFieldId(form.section, itemId, property));
</script>

<div class="field">
  <span class="label" id="{id}-label" contenteditable="false">{label}</span>
  <TextProperty
    tag="div"
    class="input{multiline ? ' multiline' : ''}"
    {path}
    {id}
    role="textbox"
    aria-labelledby="{id}-label"
    aria-multiline={multiline}
  />
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

  .field :global(.input) {
    min-height: var(--ui-control);
    padding: var(--ui-space-2) var(--ui-space-3);
    border: 1px solid var(--ui-border-strong);
    border-radius: var(--ui-radius-field);
    background: var(--ui-surface);
    color: var(--ui-ink);
    font: var(--ui-text-md) / 1.4 var(--ui-font);
    box-sizing: border-box;
  }

  .field :global(.input.multiline) {
    min-height: calc(var(--ui-control) * 2);
  }

  .field :global(.input:focus-within) {
    outline: 3px solid var(--ui-focus);
    outline-offset: 0;
  }
</style>
