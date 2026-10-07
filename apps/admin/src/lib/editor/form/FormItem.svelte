<script lang="ts">
import type { CollectionName } from "@webmio/model";
import { type DocumentPath, Node, type SveditContext } from "svedit";
import { getContext, type Snippet } from "svelte";
import { getI18n } from "$lib/i18n";
import Button from "$lib/ui/Button.svelte";
import { collectionView, duplicateItem, moveItem } from "../collections";
import { getEditor } from "../state.svelte";
import { getFormLists, listFixedReason } from "./lists";

// One item of a list form: a group named after the item ("Service 2: Rohlíky") holding its
// fields, with its actions (offer-and-about, "List forms"; decision 3).
let {
  path,
  nameProperty,
  children,
}: { path: DocumentPath; nameProperty: string; children: Snippet } = $props();
const i18n = getI18n();
const svedit = getContext<SveditContext>("svedit");
const editor = getEditor();
const form = getFormLists();
const item = $derived(svedit.session.get(path) as Record<string, unknown> & { id: string });
const collection = $derived(path[1] as CollectionName);
const index = $derived(Number(path[2]));
const view = $derived(collectionView(svedit.session.doc as never, collection));
const name = $derived((item[nameProperty] as { content: string } | undefined)?.content.trim());
const numbered = $derived(i18n.t(`panel.lists.item.${collection}`, { n: index + 1 }));
const label = $derived(name ? i18n.t("panel.lists.named", { item: numbered, name }) : numbered);
// In another language, which items exist and their order come from the primary (decision 8).
const fixedReason = $derived(
  editor.sharedReadOnly ? listFixedReason(i18n.t, editor, collection) : undefined,
);

function move(direction: -1 | 1) {
  const shown = view.items[index];
  if (shown) moveItem(svedit.session, editor.siteId, view, shown, direction);
}

function duplicate() {
  const shown = view.items[index];
  if (shown) duplicateItem(svedit.session, editor.siteId, view, shown);
}
</script>

<Node {path} tag="div" class="list-item" role="group" aria-labelledby="item-{item.id}">
  <div class="item-head" contenteditable="false">
    <p class="item-title" id="item-{item.id}">{label}</p>
    <div class="item-actions">
      <button type="button" class="arrow" aria-label={i18n.t("panel.lists.moveUp")} title={fixedReason ?? i18n.t("panel.lists.moveUp")} onclick={() => move(-1)} disabled={Boolean(fixedReason) || index === 0}>↑</button>
      <button type="button" class="arrow" aria-label={i18n.t("panel.lists.moveDown")} title={fixedReason ?? i18n.t("panel.lists.moveDown")} onclick={() => move(1)} disabled={Boolean(fixedReason) || index === view.items.length - 1}>↓</button>
      <Button size="sm" kind="quiet" onclick={duplicate} disabled={Boolean(fixedReason)} title={fixedReason}>{i18n.t("panel.lists.duplicate")}</Button>
      <Button size="sm" kind="quiet" icon="trash" onclick={() => form.askDelete(collection, item.id, name || numbered)} disabled={Boolean(fixedReason)} title={fixedReason}>{i18n.t("common.delete")}</Button>
    </div>
  </div>
  {@render children()}
</Node>

<style>
  :global(.list-item) {
    display: flex;
    flex-direction: column;
    gap: var(--ui-space-2);
    padding: var(--ui-space-4);
    border: 1px solid var(--ui-border);
    border-radius: var(--ui-radius-card);
    background: var(--ui-ground);
  }

  .item-head {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    justify-content: space-between;
    gap: var(--ui-space-2);
    user-select: none;
  }

  .item-title {
    margin: 0;
    font-weight: 600;
  }

  .item-actions {
    display: flex;
    align-items: center;
    gap: var(--ui-space-1);
  }

  .arrow {
    width: var(--ui-control-sm);
    height: var(--ui-control-sm);
    border: 0;
    border-radius: var(--ui-radius-pill);
    background: none;
    color: var(--ui-ink);
    font: inherit;
    cursor: pointer;
  }

  .arrow:hover:not(:disabled) {
    background: var(--ui-soft);
  }

  .arrow:disabled {
    color: var(--ui-muted);
    cursor: default;
  }
</style>
