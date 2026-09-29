<script lang="ts">
import { type DocumentPath, Node, type SveditContext, TextProperty } from "svedit";
import { getContext } from "svelte";
import { getEditor } from "../state.svelte";

let { path }: { path: DocumentPath } = $props();
const svedit = getContext<SveditContext>("svedit");
const editor = getEditor();
const link = $derived(svedit.session.get(path));
const isAction = $derived(path.at(-2) === "action");
const isCurrent = $derived(!isAction && link.page_id === editor.pages[editor.pageIndex]?.id);
</script>

<!-- A span, not <a>: links must not navigate while editing. -->
<Node
  {path}
  tag="span"
  class={isAction ? "button" : "link"}
  aria-current={isCurrent ? "page" : undefined}
>
  <TextProperty tag="span" path={[...path, "label"]} placeholder="Odkaz" />
</Node>
