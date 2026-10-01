<script lang="ts">
import { goto } from "$app/navigation";
import {
  addExternalLink,
  addPage,
  moveMenuItem,
  removeMenuItem,
  setExternalLink,
  showInMenu,
} from "./pages";
import type { EditorPage, EditorState, MenuEntry } from "./state.svelte";

let { editor, projectName }: { editor: EditorState; projectName: string } = $props();

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
    pageError = "Enter a title for the page.";
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
    linkError = result.message;
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
</script>

{#snippet pageLink(page: EditorPage)}
  <a href={page.href} aria-current={page.id === editor.currentPageId ? "page" : undefined}>
    {page.title}
  </a>
  {#if page.isHome}<span class="home">Home</span>{/if}
{/snippet}

<aside class="sidebar" aria-label="Pages" data-history-keys>
  <a class="back" href={editor.paths.overview}>← {projectName}</a>

  <section aria-labelledby="menu-heading">
    <h2 id="menu-heading">Menu</h2>
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
              aria-label="Move {menuName(entry)} up"
              title="Move up"
              disabled={entry.index === 0}
              onclick={() => moveMenuItem(editor.session, entry.index, entry.index - 1)}>↑</button
            >
            <button
              type="button"
              aria-label="Move {menuName(entry)} down"
              title="Move down"
              disabled={entry.index >= lastIndex}
              onclick={() => moveMenuItem(editor.session, entry.index, entry.index + 1)}>↓</button
            >
          </span>
        </li>
      {:else}
        <li class="empty">The menu is empty.</li>
      {/each}
    </ol>
  </section>

  <section
    aria-labelledby="unlisted-heading"
    ondragover={(e) => e.preventDefault()}
    ondrop={dropOnUnlisted}
  >
    <h2 id="unlisted-heading">Not in menu</h2>
    <ul class="entries">
      {#each editor.unlisted as page (page.id)}
        <li draggable="true" ondragstart={() => (dragged = { kind: "unlisted", pageId: page.id })}>
          <span class="name">{@render pageLink(page)}</span>
        </li>
      {:else}
        <li class="empty">Every page is in the menu.</li>
      {/each}
    </ul>
  </section>

  <div class="add">
    <button type="button" onclick={openPageDialog}>+ Page</button>
    <button type="button" onclick={() => openLinkDialog()}>+ Link</button>
  </div>
</aside>

<dialog bind:this={pageDialog} aria-labelledby="add-page-title" class="sidebar-dialog">
  <form onsubmit={submitPage}>
    <h2 id="add-page-title">Add a page</h2>
    <label for="add-page-name">Title</label>
    <input id="add-page-name" type="text" bind:value={newTitle} />
    {#if pageError}<p class="error" role="alert">{pageError}</p>{/if}
    <div class="buttons">
      <button type="button" onclick={() => pageDialog?.close()}>Cancel</button>
      <button type="submit">Add page</button>
    </div>
  </form>
</dialog>

<dialog bind:this={linkDialog} aria-labelledby="menu-link-title" class="sidebar-dialog">
  <form onsubmit={submitLink}>
    <h2 id="menu-link-title">{editingItem ? "Edit menu link" : "Add a link to the menu"}</h2>
    <label for="menu-link-label">Label</label>
    <input id="menu-link-label" type="text" bind:value={linkLabel} />
    <label for="menu-link-address">Address</label>
    <input id="menu-link-address" type="text" bind:value={linkAddress} placeholder="https://" />
    {#if linkError}<p class="error" role="alert">{linkError}</p>{/if}
    <div class="buttons">
      {#if editingItem}
        <button type="button" class="danger" onclick={removeLink}>Remove from menu</button>
      {/if}
      <button type="button" onclick={() => linkDialog?.close()}>Cancel</button>
      <button type="submit">{editingItem ? "Save" : "Add link"}</button>
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
    color: #555;
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

  .home {
    margin-left: 0.3rem;
    padding: 0 0.3rem;
    border-radius: 0.3rem;
    background: #dde7f0;
    font-size: 0.75rem;
  }

  .external {
    all: unset;
    cursor: pointer;
    text-decoration: underline;
  }

  .external:focus-visible {
    outline: 2px solid #1f5a8a;
  }

  .move button {
    padding: 0 0.3rem;
  }

  .empty {
    color: #777;
    font-size: 0.85rem;
  }

  .add {
    display: flex;
    gap: 0.5rem;
  }

  .sidebar-dialog {
    min-width: 22rem;
    font-family: system-ui, sans-serif;
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
    color: #a3161a;
    margin: 0;
  }

  .danger {
    color: #a3161a;
  }

  .buttons {
    display: flex;
    justify-content: flex-end;
    gap: 0.5rem;
    margin-top: 0.5rem;
  }
</style>
