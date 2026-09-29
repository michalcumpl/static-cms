<script lang="ts">
import { type DocumentPath, Node, TextProperty } from "svedit";

let { path }: { path: DocumentPath } = $props();
const isAction = $derived(path.at(-2) === "action");
</script>

<!-- A span, not <a>: links must not navigate while editing. -->
<Node {path} tag="span" class={isAction ? "button" : "link"}>
  <TextProperty tag="span" path={[...path, "label"]} placeholder="Odkaz" />
</Node>
