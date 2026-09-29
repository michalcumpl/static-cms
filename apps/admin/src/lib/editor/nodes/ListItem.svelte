<script lang="ts">
import { type DocumentPath, Node, TextProperty } from "svedit";

let { path }: { path: DocumentPath } = $props();
</script>

<Node {path} tag="li">
  <TextProperty tag="span" path={[...path, "content"]} placeholder="Položka" />
</Node>
