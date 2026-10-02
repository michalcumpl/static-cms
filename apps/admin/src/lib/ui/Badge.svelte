<script lang="ts">
import type { Snippet } from "svelte";

// A status in words with a dot (admin-interface spec: never by colour alone).
let {
  status = "neutral",
  children,
}: { status?: "success" | "attention" | "problem" | "neutral"; children: Snippet } = $props();
</script>

<span class="ui-badge {status}"><span class="dot" aria-hidden="true"></span>{@render children()}</span>

<style>
  .ui-badge {
    display: inline-flex;
    align-items: center;
    gap: var(--ui-space-2);
    padding: 0.2rem 0.65rem;
    border-radius: var(--ui-radius-pill);
    font-size: var(--ui-text-sm);
    font-weight: 600;
    white-space: nowrap;
  }

  .dot {
    width: 0.45rem;
    height: 0.45rem;
    border-radius: 50%;
    background: currentColor;
  }

  .success {
    background: var(--ui-success-soft);
    color: var(--ui-success);
  }

  .attention {
    background: var(--ui-attention-soft);
    color: var(--ui-attention);
  }

  .problem {
    background: var(--ui-problem-soft);
    color: var(--ui-problem);
  }

  .neutral {
    background: var(--ui-soft);
    color: var(--ui-ink);
  }
</style>
