<script lang="ts">
import { type ContactSwitch, selectedContactBlock, setContactSwitch } from "./business";
import type { EditorState } from "./state.svelte";

// Options of the selected contact block: which of the business details it shows.
let { editor }: { editor: EditorState } = $props();

const block = $derived(selectedContactBlock(editor.session));
const SWITCHES: [ContactSwitch, string][] = [
  ["show_address", "Address"],
  ["show_phone", "Phone"],
  ["show_email", "Email"],
  ["show_map", "Map link"],
];
</script>

{#if block}
  <section class="panel" aria-labelledby="block-panel-title" data-history-keys>
    <h2 id="block-panel-title">Contact block</h2>
    <fieldset>
      <legend>Show</legend>
      {#each SWITCHES as [which, label] (which)}
        <label class="check">
          <input
            type="checkbox"
            checked={block[which]}
            onchange={(e) => setContactSwitch(editor.session, block.id, which, e.currentTarget.checked)}
          />
          {label}
        </label>
      {/each}
    </fieldset>
  </section>
{/if}

<style>
  .panel {
    padding: 1rem;
    border-bottom: 1px solid #ddd;
  }

  h2 {
    margin: 0 0 0.5rem;
    font-size: 0.8rem;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: #555;
  }

  fieldset {
    margin: 0;
    padding: 0;
    border: 0;
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
  }

  legend {
    font-size: 0.9rem;
    margin-bottom: 0.25rem;
  }

  .check {
    display: flex;
    gap: 0.4rem;
    align-items: center;
    font-size: 0.9rem;
  }
</style>
