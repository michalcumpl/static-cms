<script lang="ts">
import { type DocumentPath, Node, TextProperty } from "svedit";
import { getI18n } from "$lib/i18n";

let { path }: { path: DocumentPath } = $props();
const i18n = getI18n();
</script>

<Node {path} tag="li" class="figure">
  <TextProperty tag="p" class="figure-value" path={[...path, "value"]} placeholder={i18n.t("editor.canvas.figureValue")} />
  <TextProperty tag="p" class="figure-label" path={[...path, "label"]} placeholder={i18n.t("editor.canvas.figureLabel")} />
</Node>
