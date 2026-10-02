<script lang="ts">
// Tabs that are pages: links, the current one marked with `aria-current="page"`.
let {
  label,
  items,
}: { label: string; items: { href: string; label: string; current?: boolean }[] } = $props();
</script>

<nav class="ui-tabs" aria-label={label}>
  {#each items as item (item.href)}
    <a href={item.href} aria-current={item.current ? "page" : undefined}>{item.label}</a>
  {/each}
</nav>

<style>
  .ui-tabs {
    display: flex;
    flex-wrap: wrap;
    gap: var(--ui-space-1);
  }

  a {
    display: inline-flex;
    align-items: center;
    min-height: var(--ui-control-sm);
    padding: 0 var(--ui-space-4);
    border-radius: var(--ui-radius-pill);
    color: var(--ui-muted);
    font-weight: 600;
    text-decoration: none;
  }

  a:hover {
    background: var(--ui-soft);
    color: var(--ui-ink);
  }

  a[aria-current="page"] {
    background: var(--ui-button);
    color: var(--ui-button-label);
  }
</style>
