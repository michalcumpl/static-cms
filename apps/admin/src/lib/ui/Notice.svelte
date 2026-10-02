<script lang="ts">
import type { Snippet } from "svelte";
import Icon from "./Icon.svelte";

// A message in the page: information, success, attention or a problem, with an icon.
let {
  kind = "info",
  children,
}: { kind?: "info" | "success" | "attention" | "problem"; children: Snippet } = $props();

const icon = $derived(kind === "success" ? "check" : kind === "info" ? "info" : "alert");
</script>

<div class="ui-notice {kind}" role={kind === "problem" ? "alert" : undefined}>
  <Icon name={icon} />
  <div class="text">{@render children()}</div>
</div>

<style>
  .ui-notice {
    display: flex;
    gap: var(--ui-space-3);
    align-items: flex-start;
    padding: var(--ui-space-3) var(--ui-space-4);
    border-radius: var(--ui-radius-field);
    font-size: var(--ui-text-sm);
  }

  .text {
    flex-grow: 1;
  }

  .text :global(p) {
    margin: 0;
  }

  .info {
    background: var(--ui-soft);
    color: var(--ui-ink);
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
</style>
