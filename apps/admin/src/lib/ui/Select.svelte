<script lang="ts">
import type { Snippet } from "svelte";
import type { HTMLSelectAttributes } from "svelte/elements";

// A labelled select; the options are its children.
let {
  id,
  label,
  value = $bindable(),
  hint,
  children,
  ...rest
}: {
  id: string;
  label: string;
  value?: string;
  hint?: string;
  children: Snippet;
} & Omit<HTMLSelectAttributes, "id" | "value"> = $props();
</script>

<div class="ui-field">
  <label for={id}>{label}</label>
  <select {id} bind:value aria-describedby={hint ? `${id}-hint` : undefined} {...rest}>
    {@render children()}
  </select>
  {#if hint}<p class="hint" id="{id}-hint">{hint}</p>{/if}
</div>

<style>
  .ui-field {
    display: flex;
    flex-direction: column;
    gap: var(--ui-space-1);
  }

  label {
    font-size: var(--ui-text-sm);
    font-weight: 600;
  }

  select {
    min-height: var(--ui-control);
    padding: 0 var(--ui-space-3);
    border: 1px solid var(--ui-border-strong);
    border-radius: var(--ui-radius-field);
    background: var(--ui-surface);
    color: var(--ui-ink);
    font: var(--ui-text-md) var(--ui-font);
  }

  .hint {
    margin: 0;
    font-size: var(--ui-text-sm);
    color: var(--ui-muted);
  }
</style>
