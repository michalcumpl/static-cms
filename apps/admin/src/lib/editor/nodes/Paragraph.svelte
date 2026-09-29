<script lang="ts">
import { type DocumentPath, Node, TextProperty } from "svedit";

let { path }: { path: DocumentPath } = $props();
</script>

<Node {path}>
  <TextProperty tag="p" path={[...path, "content"]} placeholder="Text odstavce" />
</Node>
