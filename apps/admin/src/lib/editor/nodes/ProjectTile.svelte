<script lang="ts">
import { type DocumentPath, Node, type SveditContext, TextProperty } from "svedit";
import { getContext } from "svelte";
import { getI18n } from "$lib/i18n";
import ImageSlot from "./ImageSlot.svelte";

// A project as its tile on the canvas: the cover in the usual image slot and the name over it.
let { path }: { path: DocumentPath } = $props();
const i18n = getI18n();
const svedit = getContext<SveditContext>("svedit");
const project = $derived(svedit.session.get(path) as { category_id: string });
const category = $derived(
  project.category_id === ""
    ? ""
    : ((svedit.session.get(project.category_id) as { name?: { content: string } } | undefined)?.name
        ?.content ?? ""),
);
</script>

<Node {path} tag="li" class="project-tile">
  <div class="project-link">
    <ImageSlot {path} />
    <TextProperty tag="span" class="project-name" path={[...path, "name"]} placeholder={i18n.t("editor.canvas.name")} />
  </div>
  {#if category}
    <p class="project-category" contenteditable="false">{category}</p>
  {/if}
</Node>

<style>
  .project-link > :global(*) {
    grid-area: 1 / 1;
  }

  .project-link :global(.image-slot) {
    aspect-ratio: 16 / 10;
    min-height: 0;
  }
</style>
