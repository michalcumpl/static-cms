<script lang="ts">
import { type DocumentPath, NodeArrayProperty, type SveditContext } from "svedit";
import { type Component, getContext, setContext } from "svelte";
import { getEditor } from "../state.svelte";
import FaqItem from "./FaqItem.svelte";
import ItemPreview from "./ItemPreview.svelte";
import Person from "./Person.svelte";
import ServiceItem from "./ServiceItem.svelte";
import Testimonial from "./Testimonial.svelte";

// The items a collection block shows (business-collections design decision 4): the whole
// collection as one Svedit list when the block shows all of it and mounts every item; otherwise
// each item on its own, editable where this block is the first on the page to show it, and as a
// preview where an earlier block already does (Svedit mounts a path once per canvas).
let {
  path,
  tag = "ul",
  class: cls,
}: { path: DocumentPath; tag?: string; class: string } = $props();
const svedit = getContext<SveditContext>("svedit");
const editor = getEditor();
const block = $derived(svedit.session.get(path) as { id: string });
const view = $derived(editor.collections.find((v) => v.blockId === block.id));
const siteId = $derived(svedit.session.doc.document_id);
// Items mounted one by one are not children of a Svedit list: no list context for them.
setContext("node_array_meta", undefined);

// biome-ignore lint/suspicious/noExplicitAny: node components take Svedit's path props.
const ITEM_COMPONENTS: Record<string, Component<any>> = {
  services: ServiceItem,
  team: Person,
  testimonials: Testimonial,
  faqs: FaqItem,
};
</script>

{#if view?.wholeList}
  <NodeArrayProperty {tag} class={cls} path={[siteId, view.collection]} />
{:else if view}
  {@const ItemComponent = ITEM_COMPONENTS[view.collection]}
  <svelte:element this={tag} class={cls}>
    {#each view.items as item (item.position)}
      {#if item.editable && ItemComponent}
        <ItemComponent path={[siteId, view.collection, item.index]} />
      {:else}
        <ItemPreview {siteId} collection={view.collection} index={item.index} />
      {/if}
    {/each}
  </svelte:element>
{/if}
