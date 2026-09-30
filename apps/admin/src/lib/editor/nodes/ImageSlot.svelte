<script lang="ts">
import type { DocumentPath, SveditContext } from "svedit";
import { getContext } from "svelte";
import { chooseImage } from "../image-slots";
import { getEditor } from "../state.svelte";
import Child from "./Child.svelte";

/** `path` is the image's owner (a hero, text with image or person); its image goes here. */
let { path, label = "Add image…" }: { path: DocumentPath; label?: string } = $props();
const svedit = getContext<SveditContext>("svedit");
const editor = getEditor();
const owner = $derived(svedit.session.get(path) as { id: string; image: { nodes: string[] } });
</script>

{#if owner.image.nodes.length > 0}
  <Child path={[...path, "image", 0]} />
{:else}
  <!-- Not part of the site: a way to add the image while editing. -->
  <div class="image-slot" contenteditable="false">
    <button type="button" onclick={() => chooseImage(editor, owner.id)}>{label}</button>
  </div>
{/if}

<style>
  .image-slot {
    display: grid;
    place-items: center;
    min-height: 8rem;
    border: 2px dashed currentColor;
    border-radius: var(--radius);
    opacity: 0.6;
  }

  .image-slot:hover,
  .image-slot:focus-within {
    opacity: 1;
  }
</style>
