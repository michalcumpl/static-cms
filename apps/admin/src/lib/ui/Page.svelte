<script lang="ts">
import type { Snippet } from "svelte";

// The main area of an admin page: a centred column, `narrow` for forms.
let { width = "wide", children }: { width?: "wide" | "narrow"; children: Snippet } = $props();
</script>

<main class="ui-page {width}">{@render children()}</main>

<style>
  .ui-page {
    display: flex;
    flex-direction: column;
    gap: var(--ui-space-5);
    margin: 0 auto;
    padding: var(--ui-space-6) var(--ui-space-5) var(--ui-space-7);
    box-sizing: border-box;
  }

  .wide {
    max-width: 72rem;
  }

  .narrow {
    max-width: 40rem;
  }

  .ui-page :global(a:not(.ui-button)) {
    color: var(--ui-link);
  }

  @media (max-width: 40rem) {
    .ui-page {
      padding: var(--ui-space-5) var(--ui-space-4);
    }
  }
</style>
