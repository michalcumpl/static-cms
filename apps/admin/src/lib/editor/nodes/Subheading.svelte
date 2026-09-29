<script lang="ts">
import { type DocumentPath, Node, type SveditContext, TextProperty } from "svedit";
import { getContext } from "svelte";

let { path }: { path: DocumentPath } = $props();
const svedit = getContext<SveditContext>("svedit");
const heading = $derived(svedit.session.get(path));
</script>

<Node {path}>
  <TextProperty tag={heading.level === 3 ? "h3" : "h2"} path={[...path, "content"]} placeholder="Nadpis" />
</Node>
