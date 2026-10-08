<script lang="ts">
import { type DocumentPath, Node, TextProperty } from "svedit";
import { getI18n } from "$lib/i18n";
import CollectionItems from "./CollectionItems.svelte";

// The projects block on the canvas: its tiles as on the page, names editable in place
// (collection-pages decision 6).
let { path }: { path: DocumentPath } = $props();
const i18n = getI18n();
</script>

<Node {path} tag="section" class="block projects">
  <div class="container">
    <TextProperty tag="h2" path={[...path, "heading"]} placeholder={i18n.t("editor.canvas.headingOptional")} />
    <CollectionItems {path} class="projects-grid" />
  </div>
</Node>
