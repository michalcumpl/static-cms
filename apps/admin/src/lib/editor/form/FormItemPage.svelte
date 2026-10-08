<script lang="ts">
import { getI18n } from "$lib/i18n";
import { addressFromName, type ItemPageCollection, listingPage } from "../item-pages";
import { getEditor } from "../state.svelte";
import FormString from "./FormString.svelte";

// An item's own page in its form, while its collection has pages: its address under the listing
// page, and a link to the page in the preview (project-page, "Item pages in What you offer").
// A new item's address follows its name as it is typed, until the owner changes the address.
let { itemId, collection }: { itemId: string; collection: ItemPageCollection } = $props();
const i18n = getI18n();
const editor = getEditor();
const listing = $derived(listingPage(editor.session, editor.siteId, collection));
const listingSlug = $derived(
  listing === ""
    ? ""
    : String((editor.session.get(listing) as { slug?: string } | undefined)?.slug ?? ""),
);
const item = $derived(editor.session.get(itemId) as { slug: string; name: { content: string } });
const prefix = $derived(editor.lang === editor.primaryLang ? "/" : `/${editor.lang}/`);
const href = $derived(`${editor.paths.preview}${prefix.slice(1)}${listingSlug}/${item.slug}/`);

// The address this form made, while it follows the name; an item that already has one doesn't.
// svelte-ignore state_referenced_locally
let made = $state(item.slug === "" ? "" : undefined);
$effect(() => {
  const name = item.name.content;
  if (made === undefined || listing === "" || name.trim() === "") return;
  if (item.slug !== "" && item.slug !== made) {
    made = undefined;
    return;
  }
  made = addressFromName(editor.session, editor.siteId, collection, itemId, made) ?? made;
});
</script>

{#if listing !== ""}
  <FormString nodeId={itemId} property="slug" label={i18n.t("panel.lists.fields.slug")} prefix="{prefix}{listingSlug}/">
    {#if item.slug !== ""}
      <a class="open" {href} target="_blank" rel="noopener">{i18n.t("panel.lists.fields.openPage")}</a>
    {/if}
  </FormString>
{/if}

<style>
  .open {
    font-size: var(--ui-text-sm);
  }
</style>
