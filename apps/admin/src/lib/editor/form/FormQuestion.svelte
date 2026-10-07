<script lang="ts">
import type { DocumentPath } from "svedit";
import { getI18n } from "$lib/i18n";
import FormField from "./FormField.svelte";
import FormItem from "./FormItem.svelte";

let { path }: { path: DocumentPath } = $props();
const i18n = getI18n();
</script>

<FormItem {path} nameProperty="question">
  <FormField path={[...path, "question"]} label={i18n.t("panel.lists.fields.question")} />
  <FormField path={[...path, "answer"]} label={i18n.t("panel.lists.fields.answer")} multiline />
</FormItem>
