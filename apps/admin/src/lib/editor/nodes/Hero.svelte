<script lang="ts">
import {
  type DocumentPath,
  Node,
  NodeArrayProperty,
  type SveditContext,
  TextProperty,
} from "svedit";
import { getContext } from "svelte";
import { getI18n } from "$lib/i18n";
import Child from "./Child.svelte";
import ImageSlot from "./ImageSlot.svelte";

let { path }: { path: DocumentPath } = $props();
const svedit = getContext<SveditContext>("svedit");
const hero = $derived(svedit.session.get(path));
const i18n = getI18n();
// The slideshow shows its slides side by side while editing, without moving (hero-slideshow).
const slideshow = $derived(hero.layout === "slideshow");
// Like the page, a full-photo hero needs its photo; until then it shows beside the text.
const cover = $derived(hero.layout === "cover" && hero.image.nodes.length > 0);
</script>

<Node
  {path}
  tag="section"
  class={slideshow ? "block hero hero-slideshow canvas-slideshow" : cover ? "block hero hero-cover" : "block hero"}
>
  {#if slideshow}
    <NodeArrayProperty tag="ul" class="slides" path={[...path, "slides"]} />
  {/if}
  {#if cover}
    <div class="hero-image cover-photo"><ImageSlot {path} /></div>
  {/if}
  <div class="container hero-inner">
    <div class="hero-content">
      <TextProperty tag="h1" path={[...path, "heading"]} placeholder={i18n.t("editor.canvas.heading")} />
      <TextProperty tag="p" class="hero-text" path={[...path, "text"]} placeholder={i18n.t("editor.canvas.heroText")} />
      {#if hero.action.nodes.length > 0}
        <p class="hero-action"><Child path={[...path, "action", 0]} /></p>
      {/if}
    </div>
    {#if !cover && !slideshow}
      <ImageSlot {path} />
    {/if}
  </div>
</Node>

<style>
  /* While editing, the slides wrap in a row instead of scrolling. */
  :global(.canvas-slideshow .slides) {
    flex-wrap: wrap;
    gap: 0.5rem;
    overflow: visible;
  }

  :global(.canvas-slideshow .slide) {
    flex: 1 1 18rem;
    min-height: 12rem;
    aspect-ratio: 16 / 9;
  }

  :global(.canvas-slideshow .slide-title) {
    position: relative;
    z-index: 1;
    padding: 2rem 1rem 1rem;
    font-size: 1.4rem;
  }

  .cover-photo :global(:is(.image-node, div, img)) {
    height: 100%;
  }

  .cover-photo :global(img) {
    width: 100%;
    object-fit: cover;
  }
</style>
