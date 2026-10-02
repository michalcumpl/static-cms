<script lang="ts">
import type { Snippet } from "svelte";

// A modal dialog with a title, a body and actions at the bottom; `open()` and `close()` show it.
let {
  title,
  id,
  children,
  actions,
  onclose,
}: {
  title: string;
  id: string;
  children: Snippet;
  actions?: Snippet;
  onclose?: () => void;
} = $props();

let dialog: HTMLDialogElement | undefined = $state();

export function open() {
  dialog?.showModal();
}

export function close() {
  dialog?.close();
}
</script>

<dialog class="ui-dialog" bind:this={dialog} aria-labelledby="{id}-title" {onclose}>
  <h2 id="{id}-title">{title}</h2>
  <div class="body">{@render children()}</div>
  {#if actions}<div class="actions">{@render actions()}</div>{/if}
</dialog>

<style>
  .ui-dialog {
    width: min(32rem, calc(100vw - 2rem));
    padding: var(--ui-space-5);
    border: 0;
    border-radius: var(--ui-radius-card);
    background: var(--ui-surface);
    color: var(--ui-ink);
    box-shadow: var(--ui-shadow-pop);
    font-family: var(--ui-font);
  }

  .ui-dialog::backdrop {
    background: rgb(24 41 45 / 0.4);
  }

  h2 {
    margin: 0 0 var(--ui-space-3);
    font-size: var(--ui-text-lg);
  }

  .actions {
    display: flex;
    justify-content: flex-end;
    gap: var(--ui-space-2);
    margin-top: var(--ui-space-5);
  }
</style>
