<script lang="ts">
import { goto } from "$app/navigation";
import { getI18n } from "$lib/i18n";
import Button from "$lib/ui/Button.svelte";
import {
  addExternalLink,
  addPage,
  moveMenuItem,
  removeMenuItem,
  setExternalLink,
  showInMenu,
} from "./pages";
import type { EditorPage, EditorState, MenuEntry } from "./state.svelte";
import { isUntranslated } from "./translations";

let { editor, projectName }: { editor: EditorState; projectName: string } = $props();
const i18n = getI18n();

// Adding a page.
let pageDialog: HTMLDialogElement | undefined = $state();
let newTitle = $state("");
let pageError = $state("");

function openPageDialog() {
  newTitle = "";
  pageError = "";
  pageDialog?.showModal();
}

async function submitPage(event: SubmitEvent) {
  event.preventDefault();
  const id = addPage(editor.session, newTitle);
  if (!id) {
    pageError = i18n.t("editor.left.pageTitleMissing");
    return;
  }
  pageDialog?.close();
  await goto(editor.paths.edit(id));
}

// Adding or editing an external menu link.
let linkDialog: HTMLDialogElement | undefined = $state();
let editingItem = $state<string | undefined>();
let linkLabel = $state("");
let linkAddress = $state("");
let linkError = $state("");

function openLinkDialog(entry?: Extract<MenuEntry, { kind: "external" }>) {
  editingItem = entry?.itemId;
  linkLabel = entry?.label ?? "";
  linkAddress = entry?.url ?? "";
  linkError = "";
  linkDialog?.showModal();
}

function submitLink(event: SubmitEvent) {
  event.preventDefault();
  const result = editingItem
    ? setExternalLink(editor.session, editingItem, linkLabel, linkAddress)
    : addExternalLink(editor.session, linkLabel, linkAddress);
  if (!result.ok) {
    linkError = i18n.t(`editor.links.${result.reason}`);
    return;
  }
  linkDialog?.close();
}

function removeLink() {
  const entry = editor.menu.find((e) => e.itemId === editingItem);
  if (entry) removeMenuItem(editor.session, entry.index);
  linkDialog?.close();
}

// Dragging: menu entries reorder within the menu, and pages move between the two sections.
type Dragged = { kind: "menu"; index: number } | { kind: "unlisted"; pageId: string };
let dragged: Dragged | undefined;

function dropOnMenu(event: DragEvent, index?: number) {
  event.preventDefault();
  event.stopPropagation();
  if (dragged?.kind === "menu" && index !== undefined) {
    moveMenuItem(editor.session, dragged.index, index);
  } else if (dragged?.kind === "unlisted") {
    showInMenu(editor.session, dragged.pageId, true);
  }
  dragged = undefined;
}

function dropOnUnlisted(event: DragEvent) {
  event.preventDefault();
  if (dragged?.kind === "menu") {
    const entry = editor.menu.find((e) => e.index === (dragged as { index: number }).index);
    if (entry?.kind === "page") showInMenu(editor.session, entry.page.id, false);
  }
  dragged = undefined;
}

const menuName = (entry: MenuEntry) => (entry.kind === "page" ? entry.page.title : entry.label);
const lastIndex = $derived(editor.menu.at(-1)?.index ?? 0);

// Outside the primary language: pages whose title (or slug) is still the primary's.
const primaryPages = $derived(
  editor.lang === editor.primaryLang ? undefined : editor.translations.find((l) => l.primary),
);
function untranslated(page: EditorPage): boolean {
  if (!primaryPages) return false;
  const node = editor.session.get(page.id) as
    | { id: string; title: string; slug: string; translation_key: string }
    | undefined;
  return node ? isUntranslated(primaryPages, node, page.isHome) : false;
}
</script>

{#snippet pageLink(page: EditorPage)}
  <a href={page.href} aria-current={page.id === editor.currentPageId ? "page" : undefined}>
    {page.title}
  </a>
  {#if page.isHome}<span class="home">{i18n.t("editor.left.home")}</span>{/if}
  {#if untranslated(page)}<span class="untranslated">{i18n.t("editor.left.notTranslated")}</span>{/if}
{/snippet}

<aside class="sidebar" aria-label={i18n.t("editor.left.pages")} data-history-keys>
  <a class="back" href={editor.paths.overview}>← {projectName}</a>

  <section aria-labelledby="menu-heading">
    <h2 id="menu-heading">{i18n.t("editor.left.menu")}</h2>
    <ol
      class="entries"
      ondragover={(e) => e.preventDefault()}
      ondrop={(e) => dropOnMenu(e)}
    >
      {#each editor.menu as entry (entry.itemId)}
        <li
          draggable="true"
          ondragstart={() => (dragged = { kind: "menu", index: entry.index })}
          ondragover={(e) => e.preventDefault()}
          ondrop={(e) => dropOnMenu(e, entry.index)}
        >
          <span class="name">
            {#if entry.kind === "page"}
              {@render pageLink(entry.page)}
            {:else}
              <button type="button" class="external" onclick={() => openLinkDialog(entry)}>
                {entry.label} <span aria-hidden="true">↗</span>
              </button>
            {/if}
          </span>
          <span class="move">
            <button
              type="button"
              aria-label={i18n.t("editor.left.moveUp", { name: menuName(entry) })}
              title={i18n.t("editor.toolbar.moveUp")}
              disabled={entry.index === 0}
              onclick={() => moveMenuItem(editor.session, entry.index, entry.index - 1)}>↑</button
            >
            <button
              type="button"
              aria-label={i18n.t("editor.left.moveDown", { name: menuName(entry) })}
              title={i18n.t("editor.toolbar.moveDown")}
              disabled={entry.index >= lastIndex}
              onclick={() => moveMenuItem(editor.session, entry.index, entry.index + 1)}>↓</button
            >
          </span>
        </li>
      {:else}
        <li class="empty">{i18n.t("editor.left.menuEmpty")}</li>
      {/each}
    </ol>
  </section>

  <section
    aria-labelledby="unlisted-heading"
    ondragover={(e) => e.preventDefault()}
    ondrop={dropOnUnlisted}
  >
    <h2 id="unlisted-heading">{i18n.t("editor.left.notInMenu")}</h2>
    <ul class="entries">
      {#each editor.unlisted as page (page.id)}
        <li draggable="true" ondragstart={() => (dragged = { kind: "unlisted", pageId: page.id })}>
          <span class="name">{@render pageLink(page)}</span>
        </li>
      {:else}
        <li class="empty">{i18n.t("editor.left.allInMenu")}</li>
      {/each}
    </ul>
  </section>

  <div class="add">
    <Button size="sm" onclick={openPageDialog}>{i18n.t("editor.left.addPage")}</Button>
    <Button size="sm" onclick={() => openLinkDialog()}>{i18n.t("editor.left.addLink")}</Button>
  </div>
</aside>

<dialog bind:this={pageDialog} aria-labelledby="add-page-title" class="sidebar-dialog">
  <form onsubmit={submitPage}>
    <h2 id="add-page-title">{i18n.t("editor.left.addPageTitle")}</h2>
    <label for="add-page-name">{i18n.t("editor.left.title")}</label>
    <input id="add-page-name" type="text" bind:value={newTitle} />
    {#if pageError}<p class="error" role="alert">{pageError}</p>{/if}
    <div class="buttons">
      <Button onclick={() => pageDialog?.close()}>{i18n.t("common.cancel")}</Button>
      <Button type="submit" kind="primary">{i18n.t("editor.left.addPageButton")}</Button>
    </div>
  </form>
</dialog>

<dialog bind:this={linkDialog} aria-labelledby="menu-link-title" class="sidebar-dialog">
  <form onsubmit={submitLink}>
    <h2 id="menu-link-title">{editingItem ? i18n.t("editor.left.editLink") : i18n.t("editor.left.addLinkTitle")}</h2>
    <label for="menu-link-label">{i18n.t("editor.left.label")}</label>
    <input id="menu-link-label" type="text" bind:value={linkLabel} />
    <label for="menu-link-address">{i18n.t("editor.left.address")}</label>
    <input id="menu-link-address" type="text" bind:value={linkAddress} placeholder="https://" data-i18n-ignore />
    {#if linkError}<p class="error" role="alert">{linkError}</p>{/if}
    <div class="buttons">
      {#if editingItem}
        <Button kind="danger" onclick={removeLink}>{i18n.t("editor.left.removeFromMenu")}</Button>
      {/if}
      <Button onclick={() => linkDialog?.close()}>{i18n.t("common.cancel")}</Button>
      <Button type="submit" kind="primary">{editingItem ? i18n.t("common.save") : i18n.t("editor.left.addLinkButton")}</Button>
    </div>
  </form>
</dialog>

<style>
  .sidebar {
    padding: 1rem;
  }

  h2 {
    font-size: 0.8rem;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: var(--ui-muted);
  }

  .entries {
    list-style: none;
    padding: 0;
    margin: 0 0 1rem;
  }

  .entries li {
    display: flex;
    align-items: center;
    gap: 0.25rem;
    padding: 0.2rem 0;
  }

  .entries li[draggable="true"] {
    cursor: grab;
  }

  .name {
    flex: 1;
    min-width: 0;
  }

  .name a[aria-current="page"] {
    font-weight: 700;
  }

  .untranslated {
    margin-left: 0.3rem;
    padding: 0 0.3rem;
    border-radius: 0.3rem;
    background: var(--ui-attention-soft);
    color: var(--ui-attention);
    font-size: 0.75rem;
  }

  .home {
    margin-left: 0.3rem;
    padding: 0 0.3rem;
    border-radius: 0.3rem;
    background: var(--ui-soft);
    font-size: 0.75rem;
  }

  .external {
    all: unset;
    cursor: pointer;
    text-decoration: underline;
  }

  .external:focus-visible {
    outline: 2px solid var(--ui-focus);
  }

  .move button {
    min-width: 1.75rem;
    min-height: 1.75rem;
    padding: 0;
    border: 0;
    border-radius: var(--ui-radius-pill);
    background: transparent;
    color: var(--ui-ink);
    font: inherit;
    cursor: pointer;
  }

  .move button:hover:not(:disabled) {
    background: var(--ui-soft);
  }

  .move button:disabled {
    opacity: 0.35;
    cursor: default;
  }

  .empty {
    color: var(--ui-muted);
    font-size: 0.85rem;
  }

  .add {
    display: flex;
    gap: 0.5rem;
  }

  .sidebar-dialog {
    min-width: 22rem;
    font-family: var(--ui-font);
  }

  .sidebar-dialog form {
    display: flex;
    flex-direction: column;
    gap: 0.4rem;
  }

  .sidebar-dialog h2 {
    font-size: 1.1rem;
    text-transform: none;
    letter-spacing: 0;
    color: inherit;
  }

  .error {
    color: var(--ui-problem);
    margin: 0;
  }

  .buttons {
    display: flex;
    justify-content: flex-end;
    gap: 0.5rem;
    margin-top: 0.5rem;
  }
</style>
