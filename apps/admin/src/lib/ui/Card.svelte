<script lang="ts">
import type { Snippet } from "svelte";

// A surface with an optional title (a heading at `level`) and actions beside it.
let {
  title,
  level = 2,
  id,
  actions,
  children,
}: {
  title?: string;
  level?: 2 | 3;
  id?: string;
  actions?: Snippet;
  children: Snippet;
} = $props();

const headingId = $derived(id ? `${id}-title` : undefined);
</script>

<section class="ui-card" {id} aria-labelledby={title ? headingId : undefined}>
  {#if title || actions}
    <div class="head">
      {#if title}<svelte:element this={`h${level}`} id={headingId}>{title}</svelte:element>{/if}
      {#if actions}<div class="actions">{@render actions()}</div>{/if}
    </div>
  {/if}
  {@render children()}
</section>

<style>
  .ui-card {
    display: flex;
    flex-direction: column;
    gap: var(--ui-space-4);
    padding: var(--ui-space-5);
    border: 1px solid var(--ui-border);
    border-radius: var(--ui-radius-card);
    background: var(--ui-surface);
    box-shadow: var(--ui-shadow);
  }

  .head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--ui-space-3);
    flex-wrap: wrap;
  }

  h2,
  h3 {
    margin: 0;
    font-size: var(--ui-text-lg);
    font-weight: 700;
  }

  .actions {
    display: flex;
    gap: var(--ui-space-2);
    flex-wrap: wrap;
  }
</style>
