<script lang="ts">
import type { Snippet } from "svelte";
import Icon from "./Icon.svelte";
import type { IconName } from "./icons";

// What a list says when it has nothing yet, with the action that fills it.
let {
  title,
  icon,
  children,
  action,
}: { title: string; icon?: IconName; children?: Snippet; action?: Snippet } = $props();
</script>

<div class="ui-empty">
  {#if icon}<span class="icon"><Icon name={icon} size={28} /></span>{/if}
  <p class="title">{title}</p>
  {#if children}<div class="text">{@render children()}</div>{/if}
  {#if action}<div class="action">{@render action()}</div>{/if}
</div>

<style>
  .ui-empty {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: var(--ui-space-2);
    padding: var(--ui-space-7) var(--ui-space-5);
    border: 1px dashed var(--ui-border-strong);
    border-radius: var(--ui-radius-card);
    text-align: center;
  }

  .icon {
    display: grid;
    place-items: center;
    width: 3.5rem;
    height: 3.5rem;
    border-radius: 50%;
    background: var(--ui-soft);
    color: var(--ui-link);
  }

  .title {
    margin: 0;
    font-size: var(--ui-text-lg);
    font-weight: 700;
  }

  .text {
    max-width: 32rem;
    color: var(--ui-muted);
  }

  .action {
    margin-top: var(--ui-space-2);
  }
</style>
