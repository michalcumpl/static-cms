<script lang="ts">
import {
  type DocumentPath,
  Node,
  NodeArrayProperty,
  type SveditContext,
  TextProperty,
} from "svedit";
import { getContext } from "svelte";
import ImageSlot from "./ImageSlot.svelte";

let { path }: { path: DocumentPath } = $props();
const svedit = getContext<SveditContext>("svedit");
const block = $derived(svedit.session.get(path) as { image_side: "left" | "right" });
</script>

<Node {path} tag="section" class="block text-with-image image-{block.image_side}">
  <div class="container twi-inner">
    <div class="twi-text">
      <TextProperty tag="h2" path={[...path, "heading"]} placeholder="Nadpis (nepovinný)" />
      <NodeArrayProperty path={[...path, "body"]} />
    </div>
    <div class="twi-image"><ImageSlot {path} /></div>
  </div>
</Node>
