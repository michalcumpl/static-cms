<script lang="ts">
import type { Snippet } from "svelte";

// The content of one tab of a page with tabs: a column of cards, `narrow` for forms and lists.
let { width = "wide", children }: { width?: "wide" | "narrow"; children: Snippet } = $props();
</script>

<div class="ui-tab-panel {width}">{@render children()}</div>

<style>
  .ui-tab-panel {
    display: flex;
    flex-direction: column;
    gap: var(--ui-space-5);
    box-sizing: border-box;
  }

  .narrow {
    max-width: 40rem;
  }
</style>
