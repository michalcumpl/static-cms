<script lang="ts">
import {
  type DocumentPath,
  Node,
  NodeArrayProperty,
  type SveditContext,
  TextProperty,
} from "svedit";
import { getContext } from "svelte";
import AddItemsButton from "./AddItemsButton.svelte";

let { path }: { path: DocumentPath } = $props();
const svedit = getContext<SveditContext>("svedit");
const block = $derived(svedit.session.get(path) as { id: string });
</script>

<Node {path} tag="section" class="block team">
  <div class="container">
    <TextProperty tag="h2" path={[...path, "heading"]} placeholder="Nadpis (nepovinný)" />
    <NodeArrayProperty tag="ul" class="team-list" path={[...path, "people"]} />
    <AddItemsButton blockId={block.id} label="Add people…" />
  </div>
</Node>
