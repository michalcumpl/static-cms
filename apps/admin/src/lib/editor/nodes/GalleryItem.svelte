<script lang="ts">
import { type DocumentPath, Node, type SveditContext, TextProperty } from "svedit";
import { getContext } from "svelte";
import Child from "./Child.svelte";

let { path }: { path: DocumentPath } = $props();
const svedit = getContext<SveditContext>("svedit");
const item = $derived(svedit.session.get(path) as { image: { nodes: string[] } });
</script>

<Node {path} tag="li" class="gallery-item">
  <figure>
    {#if item.image.nodes.length > 0}
      <Child path={[...path, "image", 0]} />
    {/if}
    <TextProperty tag="figcaption" path={[...path, "caption"]} placeholder="Popisek (nepovinný)" />
  </figure>
</Node>
