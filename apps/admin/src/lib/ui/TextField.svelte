<script lang="ts">
import type { HTMLInputAttributes, HTMLTextareaAttributes } from "svelte/elements";

// A labelled text field, with an optional hint and error under it, or a text area with `rows`.
let {
  id,
  label,
  value = $bindable(""),
  hint,
  error,
  rows,
  ...rest
}: {
  id: string;
  label: string;
  value?: string;
  hint?: string;
  error?: string;
  rows?: number;
} & Omit<HTMLInputAttributes & HTMLTextareaAttributes, "id" | "value"> = $props();

const describedBy = $derived(
  [hint ? `${id}-hint` : "", error ? `${id}-error` : ""].filter(Boolean).join(" ") || undefined,
);
</script>

<div class="ui-field">
  <label for={id}>{label}</label>
  {#if rows}
    <textarea
      {id}
      {rows}
      bind:value
      aria-describedby={describedBy}
      aria-invalid={error ? true : undefined}
      {...rest as HTMLTextareaAttributes}
    ></textarea>
  {:else}
    <input
      {id}
      bind:value
      aria-describedby={describedBy}
      aria-invalid={error ? true : undefined}
      {...rest as HTMLInputAttributes}
    />
  {/if}
  {#if hint}<p class="hint" id="{id}-hint">{hint}</p>{/if}
  {#if error}<p class="error" id="{id}-error">{error}</p>{/if}
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

  input,
  textarea {
    min-height: var(--ui-control);
    padding: var(--ui-space-2) var(--ui-space-3);
    border: 1px solid var(--ui-border-strong);
    border-radius: var(--ui-radius-field);
    background: var(--ui-surface);
    color: var(--ui-ink);
    font: var(--ui-text-md) / 1.4 var(--ui-font);
    box-sizing: border-box;
  }

  input:focus-visible,
  textarea:focus-visible {
    outline: 3px solid var(--ui-focus);
    outline-offset: 0;
  }

  [aria-invalid="true"] {
    border-color: var(--ui-problem);
  }

  .hint,
  .error {
    margin: 0;
    font-size: var(--ui-text-sm);
    color: var(--ui-muted);
  }

  .error {
    color: var(--ui-problem);
  }
</style>
