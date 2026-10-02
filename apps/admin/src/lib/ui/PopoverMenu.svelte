<script lang="ts" module>
export interface MenuEntry {
  label: string;
  /** A second line under the label, such as a block's description. */
  detail?: string;
  /** Why the entry can't be chosen; the entry is disabled when set. */
  disabledReason?: string;
  disabled?: boolean;
  /** A picture shown above the label in a grid menu: trusted, static SVG markup. */
  illustration?: string;
  /** One of a set of choices (a `menuitemradio`): whether it is the current one. */
  checked?: boolean;
  /** Entries with the same group are shown together under its name. */
  group?: string;
  /** The entry's language, when it differs from the interface's (a language's own name). */
  lang?: string;
  run: () => void;
}
</script>

<script lang="ts">
import { tick } from "svelte";
import Icon from "./Icon.svelte";

// A menu opened by a button (WAI-ARIA menu button pattern), placed under it with CSS anchor
// positioning: arrow keys move, Enter or a click chooses, Escape or a click outside closes.
let {
  label,
  anchor,
  entries,
  onclose,
  layout = "list",
  align = "start",
}: {
  /** The menu's accessible name. */
  label: string;
  /** The anchor name of the button that opened it, e.g. `--handle-block`. */
  anchor: string;
  entries: MenuEntry[];
  /** Called when the menu closes; `chosen` says whether an entry ran. */
  onclose: (chosen: boolean) => void;
  /** A list, or a grid of cards (the block picker), where Up and Down move by a row. */
  layout?: "list" | "grid";
  /** Which edge of the button the menu lines up with; "end" for buttons at the window's edge. */
  align?: "start" | "end";
} = $props();

let menu: HTMLElement | undefined = $state();
const items = () => [
  ...(menu?.querySelectorAll<HTMLElement>('[role="menuitem"], [role="menuitemradio"]') ?? []),
];

/** Consecutive entries of the same group, in order. */
const sections = $derived(
  entries.reduce<{ group?: string; entries: MenuEntry[] }[]>((all, entry) => {
    const last = all.at(-1);
    if (last && last.group === entry.group) last.entries.push(entry);
    else all.push({ group: entry.group, entries: [entry] });
    return all;
  }, []),
);

$effect(() => {
  // Focus the current choice, else the first entry that can be chosen, once the menu is in the page.
  tick().then(() => {
    const all = items();
    const start =
      all.find((item) => item.getAttribute("aria-checked") === "true") ??
      all.find((item) => item.getAttribute("aria-disabled") !== "true") ??
      all[0];
    start?.focus();
  });
});

/** How many cards a grid row holds, as laid out. */
function columns(): number {
  const template = menu ? getComputedStyle(menu).gridTemplateColumns : "";
  return Math.max(1, template.split(" ").filter(Boolean).length);
}

function choose(entry: MenuEntry) {
  if (entry.disabled || entry.disabledReason) return;
  onclose(true);
  entry.run();
}

function onkeydown(event: KeyboardEvent) {
  const all = items();
  const at = all.indexOf(document.activeElement as HTMLElement);
  const move = (to: number) => {
    event.preventDefault();
    all[(to + all.length) % all.length]?.focus();
  };
  if (layout === "grid") {
    // A row down or up, stopping at the first and last card; Left and Right go one card.
    const row = columns();
    if (event.key === "ArrowDown") return move(Math.min(at + row, all.length - 1));
    if (event.key === "ArrowUp") return move(Math.max(at - row, 0));
  }
  if (event.key === "ArrowDown") move(at + 1);
  else if (event.key === "ArrowUp") move(at - 1);
  else if (layout === "grid" && event.key === "ArrowRight") move(at + 1);
  else if (layout === "grid" && event.key === "ArrowLeft") move(at - 1);
  else if (event.key === "Home") move(0);
  else if (event.key === "End") move(all.length - 1);
  else if (event.key === "Escape" || event.key === "Tab") {
    event.preventDefault();
    event.stopPropagation();
    onclose(false);
  }
}

function onpointerdown(event: PointerEvent) {
  if (menu && !menu.contains(event.target as Node)) onclose(false);
}
</script>

<svelte:window onpointerdowncapture={onpointerdown} />

<div
  class="menu"
  class:grid={layout === "grid"}
  class:end={align === "end"}
  role="menu"
  aria-label={label}
  tabindex="-1"
  style="position-anchor: {anchor};"
  bind:this={menu}
  {onkeydown}
>
  {#each sections as section, i (i)}
    {#if section.group}
      <div class="group" role="group" aria-label={section.group}>
        <span class="group-name" aria-hidden="true">{section.group}</span>
        {#each section.entries as entry (entry.label)}{@render item(entry)}{/each}
      </div>
    {:else}
      {#if i > 0}<div class="separator" role="separator"></div>{/if}
      {#each section.entries as entry (entry.label)}{@render item(entry)}{/each}
    {/if}
  {/each}
</div>

{#snippet item(entry: MenuEntry)}
  {@const unavailable = Boolean(entry.disabled || entry.disabledReason)}
  {@const radio = entry.checked !== undefined}
  <div
    role={radio ? "menuitemradio" : "menuitem"}
    aria-checked={radio ? entry.checked : undefined}
    tabindex="-1"
    aria-disabled={unavailable}
    lang={entry.lang}
    class:unavailable
    class:radio
    onclick={() => choose(entry)}
    onkeydown={(e) => (e.key === "Enter" || e.key === " ") && (e.preventDefault(), choose(entry))}
  >
    {#if entry.illustration}
      <span class="illustration" aria-hidden="true">{@html entry.illustration}</span>
    {/if}
    {#if radio}
      <span class="check" aria-hidden="true">{#if entry.checked}<Icon name="check" size={16} />{/if}</span>
    {/if}
    <span class="label">{entry.label}</span>
    {#if entry.disabledReason}
      <span class="detail">{entry.disabledReason}</span>
    {:else if entry.detail}
      <span class="detail">{entry.detail}</span>
    {/if}
  </div>
{/snippet}

<style>
  .menu {
    position: absolute;
    top: anchor(bottom);
    left: anchor(left);
    position-try-fallbacks: flip-block;
    /* Open towards whichever side has more room, then scroll inside. */
    position-try-order: most-block-size;
    z-index: 30;
    min-width: 11rem;
    max-width: 20rem;
    max-height: 70vh;
    overflow-y: auto;
    margin-top: 0.25rem;
    padding: 0.25rem;
    border: 1px solid var(--ui-border);
    border-radius: var(--ui-radius-field);
    background: var(--ui-surface);
    box-shadow: var(--ui-shadow-pop);
    font: var(--ui-text-sm) / 1.35 var(--ui-font);
    color: var(--ui-ink);
    text-align: left;
    /* A menu, not text: labels and gaps keep the arrow, entries show the hand. */
    cursor: default;
    user-select: none;
  }

  .menu.end {
    left: auto;
    right: anchor(right);
  }

  /* The block picker: cards with a drawing, two to a row, one when narrow. */
  .menu.grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(10rem, 1fr));
    gap: 0.25rem;
    width: min(22rem, calc(100vw - 2rem));
    max-width: none;
  }

  .illustration {
    display: block;
    margin-bottom: 0.3rem;
    border-radius: 0.25rem;
    background: var(--ui-surface);
    box-shadow: inset 0 0 0 1px var(--ui-border);
  }

  .illustration :global(svg) {
    display: block;
    width: 100%;
    height: auto;
  }

  .unavailable .illustration {
    opacity: 0.45;
  }

  [role="menuitem"],
  [role="menuitemradio"] {
    display: flex;
    flex-direction: column;
    padding: 0.4rem 0.6rem;
    border-radius: calc(var(--ui-radius-field) - 4px);
    cursor: pointer;
  }

  /* Focus shows only for the keyboard: a menu opened with the mouse highlights what's pointed at. */
  [role="menuitem"]:focus,
  [role="menuitemradio"]:focus {
    outline: none;
  }

  [role="menuitem"]:focus-visible,
  [role="menuitem"]:hover,
  [role="menuitemradio"]:focus-visible,
  [role="menuitemradio"]:hover {
    background: var(--ui-soft);
  }

  .group-name {
    display: block;
    padding: 0.4rem 0.6rem 0.2rem;
    font-size: var(--ui-text-xs);
    font-weight: 600;
    color: var(--ui-muted);
  }

  .separator {
    margin: 0.25rem 0;
    border-top: 1px solid var(--ui-border);
  }

  .radio {
    display: grid;
    grid-template-columns: 1.25rem 1fr;
    align-items: center;
  }

  .radio .detail {
    grid-column: 2;
  }

  .check {
    display: flex;
    color: var(--ui-link);
  }

  .unavailable {
    cursor: default;
    color: var(--ui-muted);
  }

  .label {
    font-weight: 600;
  }

  .detail {
    font-size: 0.8rem;
    color: var(--ui-muted);
  }

  .unavailable .detail {
    color: var(--ui-muted);
    font-style: italic;
  }
</style>
