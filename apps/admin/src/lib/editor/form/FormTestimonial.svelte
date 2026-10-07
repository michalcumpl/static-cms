<script lang="ts">
import type { DocumentPath, SveditContext } from "svedit";
import { getContext } from "svelte";
import { getI18n } from "$lib/i18n";
import FormField from "./FormField.svelte";
import FormImage from "./FormImage.svelte";
import FormItem from "./FormItem.svelte";

let { path }: { path: DocumentPath } = $props();
const i18n = getI18n();
const svedit = getContext<SveditContext>("svedit");
const id = $derived((svedit.session.get(path) as { id: string }).id);
</script>

<FormItem {path} nameProperty="name">
  <FormField path={[...path, "quote"]} label={i18n.t("panel.lists.fields.quote")} multiline />
  <FormField path={[...path, "name"]} label={i18n.t("panel.lists.fields.name")} />
  <FormField path={[...path, "detail"]} label={i18n.t("panel.lists.fields.detail")} />
  <FormImage ownerId={id} label={i18n.t("panel.lists.fields.photo")} />
</FormItem>
