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
</script>

<Node {path} tag="section" class="block hero">
  <div class="container hero-inner">
    <div class="hero-content">
      <TextProperty tag="h1" path={[...path, "heading"]} placeholder={i18n.t("editor.canvas.heading")} />
      <TextProperty tag="p" class="hero-text" path={[...path, "text"]} placeholder={i18n.t("editor.canvas.heroText")} />
      {#if hero.action.nodes.length > 0}
        <p class="hero-action"><Child path={[...path, "action", 0]} /></p>
      {/if}
    </div>
    <ImageSlot {path} />
  </div>
</Node>
