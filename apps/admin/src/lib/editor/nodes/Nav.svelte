<script lang="ts">
import { type DocumentPath, Node, type SveditContext } from "svedit";
import { getContext } from "svelte";
import Child from "./Child.svelte";

let { path }: { path: DocumentPath } = $props();
const svedit = getContext<SveditContext>("svedit");
const nav = $derived(svedit.session.get(path));
</script>

<!-- Items are placed without a NodeArrayProperty: labels are editable, the list itself is not. -->
<Node {path} tag="nav" class="site-nav">
  <ul>
    {#each nav.items.nodes as id, index (id)}
      <li><Child path={[...path, "items", index]} /></li>
    {/each}
  </ul>
</Node>
