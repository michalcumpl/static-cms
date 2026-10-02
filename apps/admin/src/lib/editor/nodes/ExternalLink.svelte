<script lang="ts">
import { type DocumentPath, Node, TextProperty } from "svedit";
import { getI18n } from "$lib/i18n";

let { path }: { path: DocumentPath } = $props();
// Buttons: the hero's call to action, and a call to action block's (the second secondary).
const isAction = $derived(path.at(-2) === "action" || path.at(-2) === "actions");
const buttonClass = $derived(
  path.at(-2) === "actions" && path.at(-1) === 1 ? "button button-secondary" : "button",
);
const i18n = getI18n();
</script>

<!-- A span, not <a>: links must not navigate while editing. -->
<Node {path} tag="span" class={isAction ? buttonClass : "link"}>
  <TextProperty tag="span" path={[...path, "label"]} placeholder={i18n.t("editor.canvas.link")} />
</Node>
