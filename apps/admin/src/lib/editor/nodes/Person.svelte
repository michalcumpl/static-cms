<script lang="ts">
import { type DocumentPath, Node, TextProperty } from "svedit";
import { getI18n } from "$lib/i18n";
import ImageSlot from "./ImageSlot.svelte";

let { path }: { path: DocumentPath } = $props();
const i18n = getI18n();
</script>

<Node {path} tag="li" class="person">
  <ImageSlot {path} label={i18n.t("editor.canvas.addPortrait")} />
  <TextProperty tag="h3" class="person-name" path={[...path, "name"]} placeholder={i18n.t("editor.canvas.name")} />
  <TextProperty tag="p" class="person-role" path={[...path, "role"]} placeholder={i18n.t("editor.canvas.roleOptional")} />
  <TextProperty tag="p" class="person-text" path={[...path, "text"]} placeholder={i18n.t("editor.canvas.shortTextOptional")} />
</Node>
