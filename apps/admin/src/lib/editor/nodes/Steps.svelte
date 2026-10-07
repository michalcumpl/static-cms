<script lang="ts">
import { type DocumentPath, Node, NodeArrayProperty, TextProperty } from "svedit";
import { getI18n } from "$lib/i18n";

// Steps on the canvas, numbered by the stylesheet as on the published page (decision 4).
let { path }: { path: DocumentPath } = $props();
const i18n = getI18n();
</script>

<Node {path} tag="section" class="block steps">
  <div class="container">
    <TextProperty tag="h2" path={[...path, "heading"]} placeholder={i18n.t("editor.canvas.heading")} />
    <NodeArrayProperty tag="ol" class="step-list" path={[...path, "items"]} />
  </div>
</Node>
