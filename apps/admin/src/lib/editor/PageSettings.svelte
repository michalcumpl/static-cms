<script lang="ts">
import { slugify } from "@static-cms/site";
import { goto } from "$app/navigation";
import { pageFieldElementId } from "./locate";
import {
  cannotDelete,
  countLinksTo,
  deletePage,
  duplicatePage,
  setHome,
  setPageSlug,
  setPageTitle,
  setSeoDescription,
  showInMenu,
} from "./pages";
import type { EditorState } from "./state.svelte";

let { editor }: { editor: EditorState } = $props();

type PageNode = { id: string; title: string; slug: string; seo_description: string };

const page = $derived(editor.currentPage);
const node = $derived(page ? (editor.session.get(page.id) as PageNode | undefined) : undefined);
const deleteReason = $derived(page ? cannotDelete(editor.session.doc, page.id) : undefined);

// The slug is typed into a draft and applied on change (design.md decision 8): applying every
// keystroke would slugify half-typed input. The draft follows the document whenever the
// document's slug changes (undo, the title follow-up, another page).
let slugDraft = $state("");
$effect.pre(() => {
  slugDraft = node?.slug ?? "";
});
const slugPreview = $derived(slugify(slugDraft));

function commitSlug() {
  if (node && slugDraft !== node.slug) setPageSlug(editor.session, node.id, slugDraft);
  // Normalised (or unchanged): show what the document holds.
  slugDraft = node?.slug ?? "";
}

$effect(() => editor.registerDraft(commitSlug));

let deleteDialog: HTMLDialogElement | undefined = $state();
const linkCount = $derived(page ? countLinksTo(editor.session.doc, page.id) : 0);

async function duplicate() {
  if (!page) return;
  const id = duplicatePage(editor.session, page.id);
  if (id) await goto(editor.paths.edit(id));
}

function confirmDelete(event: SubmitEvent) {
  event.preventDefault();
  if (page) deletePage(editor.session, page.id);
  deleteDialog?.close();
  // The layout switches to the home page once the current page is gone.
}
</script>

{#if page && node}
  <section class="panel" aria-labelledby="page-panel-title" data-history-keys>
    <h2 id="page-panel-title">Page</h2>
    {#if page.isHome}
      <p class="note">This is the home page. It is served at the site root.</p>
    {/if}

    <label for={pageFieldElementId("title")}>Title</label>
    <input
      id={pageFieldElementId("title")}
      type="text"
      value={node.title}
      oninput={(e) => setPageTitle(editor.session, node.id, e.currentTarget.value)}
    />

    <label for={pageFieldElementId("slug")}>Address (slug)</label>
    <input
      id={pageFieldElementId("slug")}
      type="text"
      bind:value={slugDraft}
      onchange={commitSlug}
      onkeydown={(e) => e.key === "Enter" && commitSlug()}
      aria-describedby="page-slug-hint"
    />
    <p class="hint" id="page-slug-hint">
      {#if page.isHome}
        Served at the site root. The address /{slugPreview}/ is used only if another page becomes
        home.
      {:else}
        Address: /{slugPreview}/
      {/if}
    </p>

    <label for={pageFieldElementId("seo_description")}>Description for search engines</label>
    <textarea
      id={pageFieldElementId("seo_description")}
      rows="3"
      value={node.seo_description}
      oninput={(e) => setSeoDescription(editor.session, node.id, e.currentTarget.value)}
    ></textarea>

    <label class="check">
      <input
        type="checkbox"
        checked={page.menuIndex !== undefined}
        onchange={(e) => showInMenu(editor.session, node.id, e.currentTarget.checked)}
      />
      Show in menu
    </label>

    <div class="actions">
      <button
        type="button"
        id={pageFieldElementId("home")}
        onclick={() => setHome(editor.session, node.id)}
        disabled={page.isHome}
      >
        {page.isHome ? "Home page" : "Set as home"}
      </button>
      <button type="button" onclick={duplicate}>Duplicate</button>
      <button
        type="button"
        class="danger"
        onclick={() => deleteDialog?.showModal()}
        disabled={deleteReason !== undefined}
        aria-describedby={deleteReason ? "page-delete-hint" : undefined}
      >
        Delete
      </button>
    </div>
    {#if deleteReason}
      <p class="hint" id="page-delete-hint">{deleteReason}</p>
    {/if}
  </section>

  <dialog bind:this={deleteDialog} aria-labelledby="delete-page-title" class="delete-dialog">
    <form onsubmit={confirmDelete}>
      <h2 id="delete-page-title">Delete “{node.title}”?</h2>
      <p>
        {#if linkCount === 0}
          No links on other pages point to it.
        {:else if linkCount === 1}
          1 link elsewhere in the site points to it. It will be listed as a problem to fix.
        {:else}
          {linkCount} links elsewhere in the site point to it. They will be listed as problems to
          fix.
        {/if}
        You can undo the deletion.
      </p>
      <div class="buttons">
        <button type="button" onclick={() => deleteDialog?.close()}>Cancel</button>
        <button type="submit" class="danger">Delete page</button>
      </div>
    </form>
  </dialog>
{/if}

<style>
  .panel {
    padding: 1rem;
    border-bottom: 1px solid #ddd;
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
  }

  h2 {
    margin: 0 0 0.5rem;
    font-size: 0.8rem;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: #555;
  }

  label {
    margin-top: 0.5rem;
    font-size: 0.9rem;
  }

  input[type="text"],
  textarea {
    font: inherit;
    padding: 0.3rem 0.4rem;
  }

  .check {
    display: flex;
    gap: 0.4rem;
    align-items: center;
  }

  .note,
  .hint {
    margin: 0;
    font-size: 0.85rem;
    color: #555;
  }

  .actions {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
    margin-top: 0.75rem;
  }

  .danger {
    color: #a3161a;
  }

  .delete-dialog {
    max-width: 26rem;
    font-family: system-ui, sans-serif;
  }

  .delete-dialog h2 {
    font-size: 1.1rem;
    text-transform: none;
    letter-spacing: 0;
    color: inherit;
  }

  .buttons {
    display: flex;
    justify-content: flex-end;
    gap: 0.5rem;
  }
</style>
