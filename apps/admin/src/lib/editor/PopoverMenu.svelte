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
  run: () => void;
}
</script>

<script lang="ts">
import { tick } from "svelte";

// A menu opened by a button (WAI-ARIA menu button pattern), placed under it with CSS anchor
// positioning: arrow keys move, Enter or a click chooses, Escape or a click outside closes.
let {
  label,
  anchor,
  entries,
  onclose,
  layout = "list",
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
} = $props();

let menu: HTMLElement | undefined = $state();
const items = () => [...(menu?.querySelectorAll<HTMLElement>('[role="menuitem"]') ?? [])];

$effect(() => {
  // Focus the first entry that can be chosen, once the menu is in the page.
  tick().then(() => (items().find((item) => item.getAttribute("aria-disabled") !== "true") ?? items()[0])?.focus());
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
  role="menu"
  aria-label={label}
  tabindex="-1"
  style="position-anchor: {anchor};"
  bind:this={menu}
  {onkeydown}
>
  {#each entries as entry (entry.label)}
    {@const unavailable = Boolean(entry.disabled || entry.disabledReason)}
    <div
      role="menuitem"
      tabindex="-1"
      aria-disabled={unavailable}
      class:unavailable
      onclick={() => choose(entry)}
      onkeydown={(e) => (e.key === "Enter" || e.key === " ") && (e.preventDefault(), choose(entry))}
    >
      {#if entry.illustration}
        <span class="illustration" aria-hidden="true">{@html entry.illustration}</span>
      {/if}
      <span class="label">{entry.label}</span>
      {#if entry.disabledReason}
        <span class="detail">{entry.disabledReason}</span>
      {:else if entry.detail}
        <span class="detail">{entry.detail}</span>
      {/if}
    </div>
  {/each}
</div>

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
    border: 1px solid #ccc;
    border-radius: 0.4rem;
    background: #fff;
    box-shadow: 0 4px 16px rgb(0 0 0 / 0.18);
    font: 0.9rem/1.3 system-ui, sans-serif;
    color: #1a1a1a;
    text-align: left;
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
    background: #fff;
    box-shadow: inset 0 0 0 1px #e1e4e8;
  }

  .illustration :global(svg) {
    display: block;
    width: 100%;
    height: auto;
  }

  .unavailable .illustration {
    opacity: 0.45;
  }

  [role="menuitem"] {
    display: flex;
    flex-direction: column;
    padding: 0.4rem 0.6rem;
    border-radius: 0.3rem;
    cursor: pointer;
  }

  [role="menuitem"]:focus,
  [role="menuitem"]:hover {
    outline: none;
    background: #e8eef4;
  }

  .unavailable {
    cursor: default;
    color: #888;
  }

  .label {
    font-weight: 600;
  }

  .detail {
    font-size: 0.8rem;
    color: #555;
  }

  .unavailable .detail {
    color: #888;
    font-style: italic;
  }
</style>
