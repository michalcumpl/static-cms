<script lang="ts">
import { type DocumentPath, Node, NodeArrayProperty } from "svedit";

let { path }: { path: DocumentPath } = $props();
</script>

<Node {path} tag="section" class="block rich-text">
  <NodeArrayProperty path={[...path, "body"]} class="container" />
</Node>
