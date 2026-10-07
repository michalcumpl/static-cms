<script lang="ts">
import type { DocumentPath } from "svedit";
import { getI18n } from "$lib/i18n";
import FormField from "./FormField.svelte";
import FormItem from "./FormItem.svelte";

let { path }: { path: DocumentPath } = $props();
const i18n = getI18n();
</script>

<FormItem {path} nameProperty="name">
  <FormField path={[...path, "name"]} label={i18n.t("panel.lists.fields.name")} />
  <FormField path={[...path, "description"]} label={i18n.t("panel.lists.fields.description")} multiline />
  <FormField path={[...path, "price"]} label={i18n.t("panel.lists.fields.price")} />
</FormItem>
