<script lang="ts">
import { type DocumentPath, Node, TextProperty } from "svedit";
import { getI18n } from "$lib/i18n";

let { path }: { path: DocumentPath } = $props();
const i18n = getI18n();
</script>

<Node {path} tag="li" class="service">
  <TextProperty tag="p" class="service-name" path={[...path, "name"]} placeholder={i18n.t("editor.canvas.serviceName")} />
  <TextProperty tag="p" class="service-description" path={[...path, "description"]} placeholder={i18n.t("editor.canvas.description")} />
  <TextProperty tag="p" class="service-price" path={[...path, "price"]} placeholder={i18n.t("editor.canvas.priceOptional")} />
</Node>
