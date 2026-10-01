<script lang="ts">
import { type DocumentPath, Node, type SveditContext, TextProperty } from "svedit";
import { getContext } from "svelte";
import Child from "./Child.svelte";

// The buttons' labels are edited here; where they point is set in the button panel.
let { path }: { path: DocumentPath } = $props();
const svedit = getContext<SveditContext>("svedit");
const block = $derived(svedit.session.get(path) as { actions: { nodes: string[] } });
</script>

<Node {path} tag="section" class="block cta">
  <div class="container">
    <TextProperty tag="h2" path={[...path, "heading"]} placeholder="Nadpis" />
    <TextProperty tag="p" class="cta-text" path={[...path, "text"]} placeholder="Krátký text (nepovinný)" />
    <p class="cta-actions">
      {#each block.actions.nodes as id, index (id)}
        <Child path={[...path, "actions", index]} />
      {/each}
    </p>
  </div>
</Node>
