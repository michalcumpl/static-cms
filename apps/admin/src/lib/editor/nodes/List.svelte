<script lang="ts">
import { type DocumentPath, Node, NodeArrayProperty } from "svedit";

let { path }: { path: DocumentPath } = $props();
</script>

<Node {path}>
  <NodeArrayProperty tag="ul" path={[...path, "items"]} />
</Node>
