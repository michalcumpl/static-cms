<script lang="ts">
import { type DocumentPath, Node, NodeArrayProperty, type SveditContext } from "svedit";
import { getContext } from "svelte";

let { path }: { path: DocumentPath } = $props();
const svedit = getContext<SveditContext>("svedit");
const page = $derived(svedit.session.get(path));
const firstBlock = $derived(page.blocks.nodes[0] ? svedit.session.get(page.blocks.nodes[0]) : null);
</script>

<Node {path} tag="main" class="page">
  {#if firstBlock?.type !== "hero"}
    <!-- As published: the page title is the h1 when there is no hero. Not editable in M2. -->
    <div class="container" contenteditable="false">
      <h1 class="page-title">{page.title}</h1>
    </div>
  {/if}
  <NodeArrayProperty path={[...path, "blocks"]} class="page-blocks" />
</Node>
