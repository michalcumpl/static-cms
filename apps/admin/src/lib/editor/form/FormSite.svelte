<script lang="ts">
import type { CollectionName } from "@webmio/model";
import { type DocumentPath, Node, NodeArrayProperty, type SveditContext } from "svedit";
import { getContext } from "svelte";
import { getI18n } from "$lib/i18n";
import Button from "$lib/ui/Button.svelte";
import { addItem, collectionView, pagesShowing } from "../collections";
import {
  addCategory,
  ITEM_PAGE_COLLECTIONS,
  type ItemPageCollection,
  listingPage,
  listingPageChoices,
  setListingPage,
} from "../item-pages";
import { openAfterSaving } from "../screen.svelte";
import { getEditor } from "../state.svelte";
import { getFormLists, listFixedReason } from "./lists";

// The site, as a panel section's form shows it: only the section's lists, each with the pages
// that show it and its Add button (offer-and-about decisions 2, 3 and 5). Everything but the
// items' fields is outside the editable text.
let { path }: { path: DocumentPath } = $props();
const i18n = getI18n();
const svedit = getContext<SveditContext>("svedit");
const editor = getEditor();
const form = getFormLists();

const shownOn = (collection: CollectionName) => {
  const ids = pagesShowing(svedit.session.doc as never, collection);
  return editor.pages.filter((page) => ids.includes(page.id));
};

const hasPages = (collection: CollectionName): collection is ItemPageCollection =>
  Object.hasOwn(ITEM_PAGE_COLLECTIONS, collection);
// Item pages live under any page but the home page (collection-pages decision 2).
const listingChoices = $derived.by(() => {
  const ids = listingPageChoices(svedit.session.doc as never);
  return editor.pages.filter((page) => ids.includes(page.id));
});
const firstChoice = $derived(listingChoices[0]?.id ?? "");

function add(collection: CollectionName) {
  addItem(svedit.session, editor.siteId, collectionView(svedit.session.doc as never, collection));
  svedit.focus_canvas();
}
</script>

<Node {path} tag="div" class="list-forms">
  {#each form.lists as collection (collection)}
    {@const pages = shownOn(collection)}
    <section class="list" aria-labelledby="list-{collection}">
      <div class="list-head" contenteditable="false">
        <h2 id="list-{collection}">{i18n.t(`panel.lists.${collection}`)}</h2>
        <p class="shown">
          {#if pages.length > 0}
            {i18n.t("panel.lists.shownOn")}:
            {#each pages as page, i (page.id)}{#if i > 0}{", "}{/if}<a
                href={page.href}
                onclick={(event) => {
                  event.preventDefault();
                  void openAfterSaving(editor, i18n.t("panel.lists.saveFirst"), page.href, true);
                }}>{page.title}</a
              >{/each}
          {:else}
            {i18n.t("panel.lists.shownNowhere")}
          {/if}
        </p>
      </div>
      {#if hasPages(collection)}
        {@const listing = listingPage(svedit.session, editor.siteId, collection)}
        <div class="item-pages" contenteditable="false">
          <label class="check">
            <input
              type="checkbox"
              checked={listing !== ""}
              disabled={listingChoices.length === 0}
              onchange={(event) =>
                setListingPage(svedit.session, editor.siteId, collection, event.currentTarget.checked ? firstChoice : "")}
            />
            {i18n.t(`panel.lists.pages.${collection}`)}
          </label>
          {#if listing !== ""}
            <label class="listed-on">
              {i18n.t("panel.lists.pages.listedOn")}
              <select
                value={listing}
                onchange={(event) => setListingPage(svedit.session, editor.siteId, collection, event.currentTarget.value)}
              >
                {#each listingChoices as page (page.id)}
                  <option value={page.id}>{page.title}</option>
                {/each}
              </select>
            </label>
          {/if}
        </div>
      {/if}
      {#if collection === "projects"}
        <div class="categories" role="group" aria-labelledby="categories-title">
          <div contenteditable="false">
            <h3 id="categories-title">{i18n.t("panel.lists.categories.title")}</h3>
            <p class="shown">{i18n.t("panel.lists.categories.hint")}</p>
          </div>
          <NodeArrayProperty path={[...path, "project_categories"]} class="category-items" />
          <div contenteditable="false">
            <Button size="sm" icon="plus" disabled={editor.sharedReadOnly} onmousedown={(event: MouseEvent) => event.preventDefault()} onclick={() => { addCategory(svedit.session, editor.siteId); svedit.focus_canvas(); }}>
              {i18n.t("panel.lists.categories.add")}
            </Button>
          </div>
        </div>
      {/if}
      <NodeArrayProperty path={[...path, collection]} class="list-items" />
      <div class="list-foot" contenteditable="false">
        <Button icon="plus" onmousedown={(event: MouseEvent) => event.preventDefault()} onclick={() => add(collection)} disabled={editor.sharedReadOnly}>
          {i18n.t(`panel.lists.add.${collection}`)}
        </Button>
        {#if editor.sharedReadOnly}<p class="fixed">{listFixedReason(i18n.t, editor, collection)}</p>{/if}
      </div>
    </section>
  {/each}
</Node>

<style>
  :global(.list-forms) {
    display: flex;
    flex-direction: column;
    gap: var(--ui-space-6);
  }

  .list-head {
    margin-bottom: var(--ui-space-3);
    user-select: none;
  }

  .list-head h2 {
    margin: 0 0 var(--ui-space-1);
    font-size: var(--ui-text-lg);
  }

  .shown {
    margin: 0;
    color: var(--ui-muted);
    font-size: var(--ui-text-sm);
  }

  /* The containing block of Svedit's insertion gaps, whose edge gaps otherwise reach out over
     the list's head and foot. */
  .list :global(.list-items) {
    position: relative;
    display: flex;
    flex-direction: column;
    gap: var(--ui-space-3);
  }

  .item-pages {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: var(--ui-space-3);
    margin-bottom: var(--ui-space-3);
    font-size: var(--ui-text-sm);
    user-select: none;
  }

  .check,
  .listed-on {
    display: flex;
    align-items: center;
    gap: var(--ui-space-2);
  }

  .categories {
    display: flex;
    flex-direction: column;
    gap: var(--ui-space-2);
    margin-bottom: var(--ui-space-4);
    padding: var(--ui-space-3);
    border: 1px dashed var(--ui-border);
    border-radius: var(--ui-radius-card);
  }

  .categories h3 {
    margin: 0;
    font-size: var(--ui-text-md);
  }

  .categories :global(.category-items) {
    display: flex;
    flex-direction: column;
    gap: var(--ui-space-2);
  }

  .list-foot {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: var(--ui-space-3);
    margin-top: var(--ui-space-3);
    user-select: none;
  }

  .fixed {
    margin: 0;
    color: var(--ui-muted);
    font-size: var(--ui-text-sm);
  }
</style>
