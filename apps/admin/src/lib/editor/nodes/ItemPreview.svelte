<script lang="ts">
import type { CollectionName } from "@static-cms/site";
import type { SveditContext } from "svedit";
import { getContext } from "svelte";
import { getEditor } from "../state.svelte";

// An item a block shows that an earlier block of the page already shows editable: drawn as the
// site draws it, read-only. Clicking it puts the caret into the editable copy.
let { siteId, collection, index }: { siteId: string; collection: CollectionName; index: number } =
  $props();
const svedit = getContext<SveditContext>("svedit");
const editor = getEditor();
type Text = { content: string };
const item = $derived.by(() => {
  const ids = (svedit.session.get([siteId, collection]) as { nodes: string[] }).nodes;
  const id = ids[index];
  return id === undefined ? undefined : (svedit.session.get(id) as Record<string, unknown>);
});
const textOf = (property: string) => (item?.[property] as Text | undefined)?.content ?? "";
const image = $derived.by(() => {
  const id = (item?.image as { nodes: string[] } | undefined)?.nodes[0];
  return id === undefined
    ? undefined
    : (svedit.session.get(id) as { src: string; width: number; alt: string });
});
const FIRST_TEXT: Record<CollectionName, string> = {
  services: "name",
  team: "name",
  testimonials: "quote",
  faqs: "question",
};

function focusEditable() {
  svedit.session.selection = {
    type: "text",
    path: [siteId, collection, index, FIRST_TEXT[collection]],
    anchor_offset: 0,
    focus_offset: 0,
  } as never;
}
</script>

{#if item}
  <!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_noninteractive_element_interactions -->
  <li class="item-preview" contenteditable="false" onclick={focusEditable}>
    {#if collection === "services"}
      <div class="service">
        <p class="service-name">{textOf("name")}</p>
        {#if textOf("description")}<p class="service-description">{textOf("description")}</p>{/if}
        {#if textOf("price")}<p class="service-price">{textOf("price")}</p>{/if}
      </div>
    {:else if collection === "team"}
      <div class="person">
        {#if image}<img class="portrait" src={editor.paths.image(image.src, image.width)} alt="" />{/if}
        <h3 class="person-name">{textOf("name")}</h3>
        {#if textOf("role")}<p class="person-role">{textOf("role")}</p>{/if}
      </div>
    {:else if collection === "testimonials"}
      <figure class="testimonial">
        <blockquote><p>{textOf("quote")}</p></blockquote>
        <figcaption><span class="testimonial-name">{textOf("name")}</span></figcaption>
      </figure>
    {:else}
      <details>
        <summary>{textOf("question")}</summary>
        <p>{textOf("answer")}</p>
      </details>
    {/if}
  </li>
{/if}

<style>
  .item-preview {
    list-style: none;
    cursor: text;
    opacity: 0.85;
  }
</style>
