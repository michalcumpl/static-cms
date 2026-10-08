<script lang="ts">
import { type DocumentPath, Node, type SveditContext, TextProperty } from "svedit";
import { getContext } from "svelte";
import { getI18n } from "$lib/i18n";
import AddItemsButton from "./AddItemsButton.svelte";
import CollectionItems from "./CollectionItems.svelte";

let { path }: { path: DocumentPath } = $props();
const svedit = getContext<SveditContext>("svedit");
const block = $derived(svedit.session.get(path) as { id: string; layout: string });
const i18n = getI18n();
</script>

<Node {path} tag="section" class={block.layout === "list" ? "block team team-as-list" : "block team"}>
  <div class="container">
    <TextProperty tag="h2" path={[...path, "heading"]} placeholder={i18n.t("editor.canvas.headingOptional")} />
    <CollectionItems {path} class="team-list" />
    <AddItemsButton blockId={block.id} label={i18n.t("editor.canvas.addPeople")} />
  </div>
</Node>

<style>
  /* A list leaves out the portraits, as the page does. */
  :global(.team-as-list .person > :is(.image-node, .image-slot)) {
    display: none;
  }
</style>
