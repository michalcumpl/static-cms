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

// Key figures on the canvas, with the published page's classes (figures-and-steps decision 4).
let { path }: { path: DocumentPath } = $props();
const i18n = getI18n();
const svedit = getContext<SveditContext>("svedit");
// As published: up to four figures in one row, five or six in rows of three.
const columns = $derived(
  figureColumns((svedit.session.get(path) as { items: { nodes: string[] } }).items.nodes.length),
);
</script>

<Node {path} tag="section" class="block figures">
  <div class="container">
    <TextProperty tag="h2" path={[...path, "heading"]} placeholder={i18n.t("editor.canvas.headingOptional")} />
    <NodeArrayProperty tag="ul" class="figure-list figure-columns-{columns}" path={[...path, "items"]} />
  </div>
</Node>
