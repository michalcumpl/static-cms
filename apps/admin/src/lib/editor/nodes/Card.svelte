<script lang="ts">
import { type DocumentPath, Node, type SveditContext, TextProperty } from "svedit";
import { getContext } from "svelte";
import { getI18n } from "$lib/i18n";
import ImageSlot from "./ImageSlot.svelte";

// A card on the canvas: its image in the usual slot, its title and text editable in place. Its
// link is set in the Card panel.
let { path }: { path: DocumentPath } = $props();
const i18n = getI18n();
const svedit = getContext<SveditContext>("svedit");
const card = $derived(svedit.session.get(path) as { image: { nodes: string[] } });
const titled = getContext<() => boolean>("cards-titled");
</script>

<Node {path} tag="li" class={card.image.nodes.length > 0 ? "card" : "card card-no-image"}>
  <ImageSlot {path} />
  <TextProperty tag={titled?.() ? "h3" : "h2"} class="card-title" path={[...path, "title"]} placeholder={i18n.t("editor.canvas.heading")} />
  <TextProperty tag="p" class="card-text" path={[...path, "text"]} placeholder={i18n.t("editor.canvas.shortTextOptional")} />
</Node>

<style>
  /* Over the photo, the slot and the image share the title's cell, as on the page. */
  :global(.cards-over .card > :is(.image-node, .image-slot)) {
    grid-area: 1 / 1;
  }
</style>
