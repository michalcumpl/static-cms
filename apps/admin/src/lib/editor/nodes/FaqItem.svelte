<script lang="ts">
import { type DocumentPath, Node, TextProperty } from "svedit";
import { getI18n } from "$lib/i18n";

let { path }: { path: DocumentPath } = $props();
const i18n = getI18n();
</script>

<!-- Open while editing, so the answer can be edited; published questions start closed. -->
<Node {path} tag="div" class="faq-item">
  <details open>
    <TextProperty tag="summary" path={[...path, "question"]} placeholder={i18n.t("editor.canvas.question")} />
    <TextProperty tag="p" path={[...path, "answer"]} placeholder={i18n.t("editor.canvas.answer")} />
  </details>
</Node>
