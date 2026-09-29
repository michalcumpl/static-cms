<script lang="ts">
import { type DocumentPath, Node, NodeArrayProperty, TextProperty } from "svedit";

let { path }: { path: DocumentPath } = $props();
</script>

<Node {path} tag="section" class="block services">
  <div class="container">
    <TextProperty tag="h2" path={[...path, "heading"]} placeholder="Nadpis (nepovinný)" />
    <NodeArrayProperty tag="ul" class="services-list" path={[...path, "items"]} />
  </div>
</Node>
