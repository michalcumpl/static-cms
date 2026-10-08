<script lang="ts">
import type { DocumentPath, SveditContext } from "svedit";
import { getContext } from "svelte";
import { getI18n } from "$lib/i18n";
import { listingPage } from "../item-pages";
import { getEditor } from "../state.svelte";
import FormBody from "./FormBody.svelte";
import FormField from "./FormField.svelte";
import FormItem from "./FormItem.svelte";
import FormItemPage from "./FormItemPage.svelte";

let { path }: { path: DocumentPath } = $props();
const i18n = getI18n();
const svedit = getContext<SveditContext>("svedit");
const editor = getEditor();
const id = $derived((svedit.session.get(path) as { id: string }).id);
// The page text and the address belong to the service's own page (collection-pages).
const pages = $derived(listingPage(editor.session, editor.siteId, "services") !== "");
</script>

<FormItem {path} nameProperty="name">
  <FormField path={[...path, "name"]} label={i18n.t("panel.lists.fields.name")} />
  <FormField path={[...path, "description"]} label={i18n.t("panel.lists.fields.description")} multiline />
  <FormField path={[...path, "price"]} label={i18n.t("panel.lists.fields.price")} />
  {#if pages}
    <FormBody {path} label={i18n.t("panel.lists.fields.pageText")} />
    <FormItemPage itemId={id} collection="services" />
  {/if}
</FormItem>
