<script lang="ts">
import { type DocumentPath, Node, type SveditContext, TextProperty } from "svedit";
import { getContext } from "svelte";
import { getI18n } from "$lib/i18n";
import Child from "./Child.svelte";
import ImageSlot from "./ImageSlot.svelte";

let { path }: { path: DocumentPath } = $props();
const svedit = getContext<SveditContext>("svedit");
const hero = $derived(svedit.session.get(path));
const i18n = getI18n();
// Like the page, a full-photo hero needs its photo; until then it shows beside the text.
const cover = $derived(hero.layout === "cover" && hero.image.nodes.length > 0);
</script>

<Node {path} tag="section" class={cover ? "block hero hero-cover" : "block hero"}>
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
    {#if !cover}
      <ImageSlot {path} />
    {/if}
  </div>
</Node>

<style>
  .cover-photo :global(:is(.image-node, div, img)) {
    height: 100%;
  }

  .cover-photo :global(img) {
    width: 100%;
    object-fit: cover;
  }
</style>
