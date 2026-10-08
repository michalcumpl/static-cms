<script lang="ts">
import { getI18n } from "$lib/i18n";
import { handleTargets, selectionPath } from "./handles";
import { ITEM_PAGE_COLLECTIONS, type ItemPageCollection } from "./item-pages";
import type { EditorState } from "./state.svelte";
import { setItemLink } from "./transforms";

// The link of the card or slide that is selected or holds the caret (cards design decision 4;
// hero-slideshow decision 4): none, a page, a project or service with its own page, or an
// address applied once it is valid.
let { editor }: { editor: EditorState } = $props();
const i18n = getI18n();

type Linked = { id: string; type: "card" | "slide"; target_id: string; url: string };
const card = $derived.by(() => {
  const path = selectionPath(editor.session);
  const item = path ? handleTargets(editor.session, path).item : undefined;
  return item?.type === "card" || item?.type === "slide"
    ? (editor.session.get(item.id) as Linked)
    : undefined;
});

/** The services and projects that have their own page, named for the list. */
const items = $derived.by(() => {
  const site = editor.session.get(editor.siteId) as Record<string, unknown>;
  return (Object.keys(ITEM_PAGE_COLLECTIONS) as ItemPageCollection[]).flatMap((collection) => {
    if (!site[ITEM_PAGE_COLLECTIONS[collection]]) return [];
    return (site[collection] as { nodes: string[] }).nodes.map((id) => ({
      id,
      name: (editor.session.get(id) as { name: { content: string } }).name.content || id,
      collection,
    }));
  });
});
const pageIds = $derived(editor.pages.map((page) => page.id));

let kind = $state<"none" | "page" | "item" | "address">("none");
let page = $state("");
let item = $state("");
let address = $state("");
let error = $state("");
$effect.pre(() => {
  if (!card) return;
  const target = card.target_id;
  kind = card.url ? "address" : !target ? "none" : pageIds.includes(target) ? "page" : "item";
  page = kind === "page" ? target : editor.homeId;
  item = kind === "item" ? target : (items[0]?.id ?? "");
  address = card.url;
  error = "";
});
const broken = $derived(
  card !== undefined &&
    card.target_id !== "" &&
    !pageIds.includes(card.target_id) &&
    !items.some((i) => i.id === card.target_id),
);

function apply(next: typeof kind) {
  if (!card) return;
  const tr = editor.session.tr;
  const result = setItemLink(
    tr,
    card.id,
    next === "none" ? null : next === "page" ? { page } : next === "item" ? { item } : { address },
  );
  if (!result.ok) {
    error = i18n.t(`editor.links.${result.reason}`);
    return;
  }
  error = "";
  const unchanged =
    tr.get([card.id, "target_id"]) === card.target_id && tr.get([card.id, "url"]) === card.url;
  if (!unchanged) editor.session.apply(tr);
}
</script>

{#if card}
  <section class="panel" aria-labelledby="card-panel-title" data-history-keys>
    <h2 id="card-panel-title">{card.type === "slide" ? i18n.t("editor.cardPanel.slideTitle") : i18n.t("editor.cardPanel.title")}</h2>
    <fieldset>
      <legend>{i18n.t("editor.cardPanel.link")}</legend>
      <label class="check"><input type="radio" name="card-link" bind:group={kind} value="none" onchange={() => apply("none")} /> {i18n.t("editor.cardPanel.noLink")}</label>
      <label class="check"><input type="radio" name="card-link" bind:group={kind} value="page" onchange={() => apply("page")} /> {i18n.t("editor.cardPanel.page")}</label>
      {#if kind === "page"}
        <select aria-label={i18n.t("editor.imagePanel.pageLabel")} bind:value={page} onchange={() => apply("page")}>
          {#each editor.pages as p (p.id)}
            <option value={p.id}>{p.title}</option>
          {/each}
        </select>
      {/if}
      <label class="check"><input type="radio" name="card-link" bind:group={kind} value="item" disabled={items.length === 0} onchange={() => apply("item")} /> {i18n.t("editor.cardPanel.item")}</label>
      {#if items.length === 0}
        <p class="hint">{i18n.t("editor.cardPanel.noItems")}</p>
      {:else if kind === "item"}
        <select aria-label={i18n.t("editor.cardPanel.itemLabel")} bind:value={item} onchange={() => apply("item")}>
          {#each items as i (i.id)}
            <option value={i.id}>{i.name}</option>
          {/each}
        </select>
      {/if}
      <label class="check"><input type="radio" name="card-link" bind:group={kind} value="address" /> {i18n.t("editor.cardPanel.address")}</label>
      {#if kind === "address"}
        <input
          type="text"
          aria-label={i18n.t("editor.imagePanel.addressLabel")}
          data-i18n-ignore
          bind:value={address}
          onchange={() => apply("address")}
          onkeydown={(e) => e.key === "Enter" && apply("address")}
        />
        <p class="hint">{i18n.t("editor.links.hint")}</p>
      {/if}
      {#if error}<p class="error" role="alert">{error}</p>{/if}
      {#if broken}<p class="error" role="status">{i18n.t("editor.cardPanel.broken")}</p>{/if}
    </fieldset>
  </section>
{/if}

<style>
  .panel {
    padding: 1rem;
    border-bottom: 1px solid var(--ui-border);
  }

  h2 {
    margin: 0 0 0.5rem;
    font-size: 0.8rem;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: var(--ui-muted);
  }

  fieldset {
    margin: 0;
    padding: 0;
    border: 0;
    display: flex;
    flex-direction: column;
    gap: 0.35rem;
    font-size: 0.9rem;
  }

  legend {
    margin-bottom: 0.25rem;
  }

  .check {
    display: flex;
    gap: 0.4rem;
    align-items: center;
  }

  .hint {
    margin: 0;
    color: var(--ui-muted);
    font-size: 0.85rem;
  }

  .error {
    margin: 0;
    color: var(--ui-danger, #b42318);
    font-size: 0.85rem;
  }
</style>
