<script lang="ts">
import { type DocumentPath, Node, TextProperty } from "svedit";
import { getI18n } from "$lib/i18n";

let { path }: { path: DocumentPath } = $props();
const i18n = getI18n();
</script>

<Node {path} tag="li" class="step">
  <TextProperty tag="h3" class="step-title" path={[...path, "title"]} placeholder={i18n.t("editor.canvas.stepTitle")} />
  <TextProperty tag="p" class="step-text" path={[...path, "text"]} placeholder={i18n.t("editor.canvas.stepTextOptional")} />
</Node>
