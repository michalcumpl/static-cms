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
  <FormImage ownerId={id} label={i18n.t("panel.lists.fields.portrait")} />
  <FormField path={[...path, "name"]} label={i18n.t("panel.lists.fields.name")} />
  <FormField path={[...path, "role"]} label={i18n.t("panel.lists.fields.role")} />
  <FormField path={[...path, "text"]} label={i18n.t("panel.lists.fields.text")} multiline />
</FormItem>
