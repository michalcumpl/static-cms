<script lang="ts">
import type { EditorState } from "./state.svelte";
import { availableBlocks, insertBlock } from "./structure";
import type { BlockType } from "./transforms";

// The blocks a page can get, in the left column below the pages. A block goes after the one
// with the cursor, or at the end of the page.
let { editor }: { editor: EditorState } = $props();

const BLOCK_LABELS: Record<BlockType, string> = {
  hero: "Hero",
  rich_text: "Text",
  services: "Services",
  text_with_image: "Text + image",
  gallery: "Gallery",
  team: "Team",
  logos: "Logos",
  contact: "Contact",
  opening_hours: "Hours",
};
const BLOCK_ORDER = Object.keys(BLOCK_LABELS) as BlockType[];
const insertable = $derived(
  editor.pageIndex < 0 ? [] : availableBlocks(editor.session, editor.siteId, editor.pageIndex),
);
</script>

<section class="blocks" aria-labelledby="blocks-heading">
  <h2 id="blocks-heading">Add block</h2>
  <div class="buttons" role="group" aria-label="Add block" aria-describedby="blocks-hint">
    {#each BLOCK_ORDER as type (type)}
      <!-- mousedown would take the focus, and the cursor, from the canvas. -->
      <button
        type="button"
        onmousedown={(e) => e.preventDefault()}
        onclick={() => insertBlock(editor.session, editor.siteId, editor.pageIndex, type)}
        disabled={!insertable.includes(type)}
      >
        {BLOCK_LABELS[type]}
      </button>
    {/each}
  </div>
  <p class="hint" id="blocks-hint">Added after the block with the cursor, or at the end.</p>
</section>

<style>
  /* Stays in view while the page scrolls. */
  .blocks {
    position: sticky;
    top: 0;
    padding: 0.25rem 1rem 1rem;
    background: #f7f7f7;
  }

  h2 {
    font-size: 0.8rem;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: #555;
  }

  .buttons {
    display: flex;
    flex-wrap: wrap;
    gap: 0.35rem;
  }

  button {
    font: inherit;
    font-size: 0.9rem;
    padding: 0.25rem 0.5rem;
    white-space: nowrap;
  }

  .hint {
    margin: 0.5rem 0 0;
    font-size: 0.8rem;
    color: #555;
  }
</style>
