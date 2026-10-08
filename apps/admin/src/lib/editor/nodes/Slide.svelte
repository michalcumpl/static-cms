<script lang="ts">
import { type DocumentPath, Node, TextProperty } from "svedit";
import { getI18n } from "$lib/i18n";
import ImageSlot from "./ImageSlot.svelte";

// A slide on the canvas: its photo in the usual slot and its title over it. Its link is set in
// the link panel (hero-slideshow design decision 4).
let { path }: { path: DocumentPath } = $props();
const i18n = getI18n();
</script>

<Node {path} tag="li" class="slide">
  <div class="slide-photo"><ImageSlot {path} /></div>
  <TextProperty tag="p" class="slide-title" path={[...path, "title"]} placeholder={i18n.t("editor.canvas.heading")} />
</Node>

<style>
  .slide-photo {
    grid-area: 1 / 1;
  }

  .slide-photo :global(:is(.image-node, div, img)) {
    width: 100%;
    height: 100%;
  }

  .slide-photo :global(img) {
    object-fit: cover;
  }
</style>
