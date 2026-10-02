<script lang="ts">
import type { Snippet } from "svelte";

// The top of a page: an optional breadcrumb, the title with a status beside it, and actions.
let {
  title,
  breadcrumb = [],
  breadcrumbLabel,
  status,
  actions,
  children,
}: {
  title: string;
  breadcrumb?: { href: string; label: string }[];
  /** The breadcrumb's accessible name, in the interface language. */
  breadcrumbLabel?: string;
  status?: Snippet;
  actions?: Snippet;
  /** A line under the title. */
  children?: Snippet;
} = $props();
</script>

<header class="ui-page-header">
  {#if breadcrumb.length > 0}
    <nav aria-label={breadcrumbLabel}>
      <ol>
        {#each breadcrumb as crumb (crumb.href)}
          <li><a href={crumb.href}>{crumb.label}</a></li>
        {/each}
      </ol>
    </nav>
  {/if}
  <div class="row">
    <div class="title">
      <h1>{title}</h1>
      {#if status}{@render status()}{/if}
    </div>
    {#if actions}<div class="actions">{@render actions()}</div>{/if}
  </div>
  {#if children}<div class="sub">{@render children()}</div>{/if}
</header>

<style>
  .ui-page-header {
    display: flex;
    flex-direction: column;
    gap: var(--ui-space-2);
  }

  ol {
    display: flex;
    flex-wrap: wrap;
    margin: 0;
    padding: 0;
    list-style: none;
    font-size: var(--ui-text-sm);
  }

  li + li::before {
    content: "/";
    margin: 0 var(--ui-space-2);
    color: var(--ui-muted);
  }

  nav a {
    color: var(--ui-muted);
  }

  .row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--ui-space-4);
    flex-wrap: wrap;
  }

  .title {
    display: flex;
    align-items: center;
    gap: var(--ui-space-3);
    flex-wrap: wrap;
  }

  h1 {
    margin: 0;
    font-size: var(--ui-text-2xl);
    line-height: 1.15;
    font-weight: 700;
  }

  .actions {
    display: flex;
    gap: var(--ui-space-2);
    flex-wrap: wrap;
  }

  .sub {
    color: var(--ui-muted);
  }
</style>
