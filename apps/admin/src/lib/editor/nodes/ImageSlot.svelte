<script lang="ts">
import type { DocumentPath, SveditContext } from "svedit";
import { getContext } from "svelte";
import { getI18n } from "$lib/i18n";
import { chooseImage } from "../image-slots";
import { getEditor } from "../state.svelte";
import { imagePropertyOf } from "../transforms";
import Child from "./Child.svelte";

/** `path` is the image's owner (a hero, text with image or person); its image goes here. */
const i18n = getI18n();
let { path, label = i18n.t("editor.canvas.addImage") }: { path: DocumentPath; label?: string } =
  $props();
const svedit = getContext<SveditContext>("svedit");
const editor = getEditor();
const owner = $derived(
  svedit.session.get(path) as { id: string; type: string } & Record<string, { nodes: string[] }>,
);
// A project's cover, everyone else's image.
const property = $derived(imagePropertyOf(owner.type));
// A collection item's image is chosen in the primary language (business-collections).
const shared = $derived(editor.sharedReadOnly && ["person", "testimonial"].includes(owner.type));
</script>

{#if (owner[property]?.nodes.length ?? 0) > 0}
  <Child path={[...path, property, 0]} />
{:else if !shared}
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
