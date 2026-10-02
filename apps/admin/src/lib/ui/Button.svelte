<script lang="ts">
import type { Snippet } from "svelte";
import type { HTMLAnchorAttributes, HTMLButtonAttributes } from "svelte/elements";
import Icon from "./Icon.svelte";
import type { IconName } from "./icons";

// The admin's one button (admin-foundation design.md decision 2): a pill in three kinds; with
// `href` it is a link that looks like a button.
type Common = {
  kind?: "primary" | "secondary" | "danger" | "quiet";
  size?: "md" | "sm";
  icon?: IconName;
  children?: Snippet;
};
type Props = Common &
  ((HTMLButtonAttributes & { href?: undefined }) | (HTMLAnchorAttributes & { href: string }));

let { kind = "secondary", size = "md", icon, children, href, ...rest }: Props = $props();
</script>

{#if href !== undefined}
  <a {href} class="ui-button {kind} {size}" {...rest as HTMLAnchorAttributes}>
    {#if icon}<Icon name={icon} size={size === "sm" ? 16 : 18} />{/if}
    {@render children?.()}
  </a>
{:else}
  <button type="button" class="ui-button {kind} {size}" {...rest as HTMLButtonAttributes}>
    {#if icon}<Icon name={icon} size={size === "sm" ? 16 : 18} />{/if}
    {@render children?.()}
  </button>
{/if}

<style>
  .ui-button {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: var(--ui-space-2);
    min-height: var(--ui-control);
    padding: 0 var(--ui-space-4);
    border: 1px solid transparent;
    border-radius: var(--ui-radius-pill);
    font: 600 var(--ui-text-sm) / 1 var(--ui-font);
    text-decoration: none;
    white-space: nowrap;
    cursor: pointer;
    transition:
      background-color 0.15s,
      border-color 0.15s;
  }

  .sm {
    min-height: var(--ui-control-sm);
    padding: 0 var(--ui-space-3);
  }

  .primary {
    background: var(--ui-button);
    color: var(--ui-button-label);
  }

  .primary:hover:not(:disabled) {
    background: var(--ui-button-hover);
  }

  .secondary {
    background: var(--ui-surface);
    border-color: var(--ui-border-strong);
    color: var(--ui-ink);
  }

  .secondary:hover:not(:disabled) {
    background: var(--ui-soft);
  }

  .danger {
    background: var(--ui-surface);
    border-color: var(--ui-problem-border);
    color: var(--ui-problem);
  }

  .danger:hover:not(:disabled) {
    background: var(--ui-problem-soft);
  }

  .quiet {
    background: transparent;
    color: var(--ui-ink);
  }

  .quiet:hover:not(:disabled) {
    background: var(--ui-soft);
  }

  .ui-button:disabled {
    cursor: default;
    opacity: 0.5;
  }
</style>
