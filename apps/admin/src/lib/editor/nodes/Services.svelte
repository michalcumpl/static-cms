<script lang="ts">
import { type DocumentPath, Node, NodeArrayProperty, TextProperty } from "svedit";
import { getI18n } from "$lib/i18n";

let { path }: { path: DocumentPath } = $props();
const i18n = getI18n();
</script>

<Node {path} tag="section" class="block services">
  <div class="container">
    <TextProperty tag="h2" path={[...path, "heading"]} placeholder={i18n.t("editor.canvas.headingOptional")} />
    <NodeArrayProperty tag="ul" class="services-list" path={[...path, "items"]} />
  </div>
</Node>
