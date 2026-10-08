<script lang="ts">
import { figureColumns } from "@webmio/render";
import {
  type DocumentPath,
  Node,
  NodeArrayProperty,
  type SveditContext,
  TextProperty,
} from "svedit";
import { getContext } from "svelte";
import { getI18n } from "$lib/i18n";

// Videos on the canvas as the page shows them before play; no player loads here (video design
// decision 4).
let { path }: { path: DocumentPath } = $props();
const svedit = getContext<SveditContext>("svedit");
const block = $derived(svedit.session.get(path) as { items: { nodes: string[] } });
const i18n = getI18n();
</script>

<Node {path} tag="section" class="block videos">
  <div class="container">
    <TextProperty tag="h2" path={[...path, "heading"]} placeholder={i18n.t("editor.canvas.headingOptional")} />
    <NodeArrayProperty tag="ul" class="video-list card-columns-{figureColumns(block.items.nodes.length)}" path={[...path, "items"]} />
  </div>
</Node>
