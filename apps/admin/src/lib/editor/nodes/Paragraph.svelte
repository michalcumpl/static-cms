<script lang="ts">
import { type DocumentPath, Node, TextProperty } from "svedit";
import { getI18n } from "$lib/i18n";

let { path }: { path: DocumentPath } = $props();
const i18n = getI18n();
</script>

<Node {path}>
  <TextProperty tag="p" path={[...path, "content"]} placeholder={i18n.t("editor.canvas.paragraph")} />
</Node>
