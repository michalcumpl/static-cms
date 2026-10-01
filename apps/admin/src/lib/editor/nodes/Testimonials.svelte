<script lang="ts">
import { type DocumentPath, Node, NodeArrayProperty, TextProperty } from "svedit";

let { path }: { path: DocumentPath } = $props();
</script>

<Node {path} tag="section" class="block testimonials">
  <div class="container">
    <TextProperty tag="h2" path={[...path, "heading"]} placeholder="Nadpis (nepovinný)" />
    <NodeArrayProperty tag="ul" class="testimonial-list" path={[...path, "items"]} />
  </div>
</Node>
