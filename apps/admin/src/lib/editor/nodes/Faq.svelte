<script lang="ts">
import { type DocumentPath, Node, TextProperty } from "svedit";
import { getI18n } from "$lib/i18n";
import CollectionItems from "./CollectionItems.svelte";

let { path }: { path: DocumentPath } = $props();
const i18n = getI18n();
</script>

<Node {path} tag="section" class="block faq">
  <div class="container">
    <TextProperty tag="h2" path={[...path, "heading"]} placeholder={i18n.t("editor.canvas.headingOptional")} />
    <CollectionItems {path} tag="div" class="faq-list" />
  </div>
</Node>
