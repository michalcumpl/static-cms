<script lang="ts">
import { figureColumns } from "@webmio/render";
import {
  type DocumentPath,
  Node,
  NodeArrayProperty,
  type SveditContext,
  TextProperty,
} from "svedit";
import { getContext, setContext } from "svelte";
import { getI18n } from "$lib/i18n";

// Cards on the canvas, in their look and columns as on the page (cards design decision 4).
let { path }: { path: DocumentPath } = $props();
const svedit = getContext<SveditContext>("svedit");
const block = $derived(
  svedit.session.get(path) as {
    heading: { content: string };
    layout: string;
    items: { nodes: string[] };
  },
);
const i18n = getI18n();
// A card's title is an <h3> under a heading, as on the page, else an <h2>.
setContext("cards-titled", () => block.heading.content.trim() !== "");
</script>

<Node {path} tag="section" class="block cards cards-{block.layout}">
  <div class="container">
    <TextProperty tag="h2" path={[...path, "heading"]} placeholder={i18n.t("editor.canvas.headingOptional")} />
    <NodeArrayProperty tag="ul" class="card-list card-columns-{figureColumns(block.items.nodes.length)}" path={[...path, "items"]} />
  </div>
</Node>
