<script lang="ts">
import { type DocumentPath, Node, type SveditContext, TextProperty } from "svedit";
import { getContext } from "svelte";
import { chooseHeroImage } from "../hero-image";
import { getEditor } from "../state.svelte";
import Child from "./Child.svelte";

let { path }: { path: DocumentPath } = $props();
const svedit = getContext<SveditContext>("svedit");
const hero = $derived(svedit.session.get(path));
const editor = getEditor();
</script>

<Node {path} tag="section" class="block hero">
  <div class="container hero-inner">
    <div class="hero-content">
      <TextProperty tag="h1" path={[...path, "heading"]} placeholder="Nadpis" />
      <TextProperty tag="p" class="hero-text" path={[...path, "text"]} placeholder="Krátký úvodní text" />
      {#if hero.action.nodes.length > 0}
        <p class="hero-action"><Child path={[...path, "action", 0]} /></p>
      {/if}
    </div>
    {#if hero.image.nodes.length > 0}
      <Child path={[...path, "image", 0]} />
    {:else}
      <!-- Not part of the site: a way to add the hero's image while editing. -->
      <div class="hero-image-slot" contenteditable="false">
        <button type="button" onclick={() => chooseHeroImage(editor, hero.id)}>Add image…</button>
      </div>
    {/if}
  </div>
</Node>

<style>
  .hero-image-slot {
    display: grid;
    place-items: center;
    min-height: 8rem;
    border: 2px dashed currentColor;
    border-radius: var(--radius);
    opacity: 0.6;
  }

  .hero-image-slot:hover,
  .hero-image-slot:focus-within {
    opacity: 1;
  }
</style>
