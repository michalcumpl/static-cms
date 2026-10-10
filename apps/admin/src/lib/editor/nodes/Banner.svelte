<script lang="ts">
import { type DocumentPath, Node, type SveditContext, TextProperty } from "svedit";
import { getContext } from "svelte";
import { getI18n } from "$lib/i18n";
import Child from "./Child.svelte";
import ImageSlot from "./ImageSlot.svelte";

// A banner on the canvas as on the website (banner-block design decision 4): the photo filling
// the band, or the primary colour without one, and the heading, text and button in place.
let { path }: { path: DocumentPath } = $props();
const svedit = getContext<SveditContext>("svedit");
const banner = $derived(
  svedit.session.get(path) as { image: { nodes: string[] }; action: { nodes: string[] } },
);
const photo = $derived(banner.image.nodes.length > 0);
const i18n = getI18n();
</script>

<Node {path} tag="section" class={photo ? "block banner banner-photo" : "block banner banner-plain"}>
  {#if photo}
    <div class="banner-image cover-photo"><ImageSlot {path} /></div>
  {/if}
  <div class="container banner-inner">
    <div class="banner-content">
      <TextProperty tag="h2" path={[...path, "heading"]} placeholder={i18n.t("editor.canvas.heading")} />
      <TextProperty tag="p" class="banner-text" path={[...path, "text"]} placeholder={i18n.t("editor.canvas.bannerText")} />
      {#if banner.action.nodes.length > 0}
        <p class="banner-action"><Child path={[...path, "action", 0]} /></p>
      {/if}
      {#if !photo}
        <div class="canvas-banner-slot"><ImageSlot {path} label={i18n.t("editor.canvas.addPhoto")} /></div>
      {/if}
    </div>
  </div>
</Node>

<style>
  /* The photo fills the band, as on the website (the hero's cover does the same). */
  .cover-photo :global(:is(.image-node, div, img)) {
    height: 100%;
  }

  .cover-photo :global(img) {
    width: 100%;
    object-fit: cover;
  }

  /* The panel lies over the photo's selectable area: it takes the clicks, the rest go to the photo. */
  .banner-inner {
    position: relative;
    z-index: 1;
    pointer-events: none;
  }

  .banner-content {
    pointer-events: auto;
  }

  .canvas-banner-slot {
    margin-top: 1rem;
  }

  .canvas-banner-slot :global(.image-slot) {
    min-height: 3rem;
  }
</style>
