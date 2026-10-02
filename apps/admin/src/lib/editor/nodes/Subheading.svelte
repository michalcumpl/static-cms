<script lang="ts">
import { type DocumentPath, Node, type SveditContext, TextProperty } from "svedit";
import { getContext } from "svelte";
import { getI18n } from "$lib/i18n";

let { path }: { path: DocumentPath } = $props();
const svedit = getContext<SveditContext>("svedit");
const heading = $derived(svedit.session.get(path));
const i18n = getI18n();
</script>

<Node {path}>
  <TextProperty tag={heading.level === 3 ? "h3" : "h2"} path={[...path, "content"]} placeholder={i18n.t("editor.canvas.heading")} />
</Node>
