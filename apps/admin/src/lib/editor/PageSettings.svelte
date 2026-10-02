<script lang="ts">
import { slugify } from "@static-cms/site";
import { goto } from "$app/navigation";
import { getI18n } from "$lib/i18n";
import ImageSetting from "./ImageSetting.svelte";
import { pageFieldElementId } from "./locate";
import PageLanguages from "./PageLanguages.svelte";
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
import { slotImage } from "./site";
import type { EditorState } from "./state.svelte";

let { editor }: { editor: EditorState } = $props();
const i18n = getI18n();

type PageNode = { id: string; title: string; slug: string; seo_description: string };

const page = $derived(editor.currentPage);
const node = $derived(page ? (editor.session.get(page.id) as PageNode | undefined) : undefined);
const deleteReason = $derived(page ? cannotDelete(editor.session.doc, page.id) : undefined);
const siteShareImage = $derived(slotImage(editor.session.doc, editor.siteId, "share_image"));

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
    <h2 id="page-panel-title">{i18n.t("editor.page.title")}</h2>
    {#if page.isHome}
      <p class="note">{i18n.t("editor.page.homeNote")}</p>
    {/if}

    <label for={pageFieldElementId("title")}>{i18n.t("editor.page.titleLabel")}</label>
    <input
      id={pageFieldElementId("title")}
      type="text"
      value={node.title}
      oninput={(e) => setPageTitle(editor.session, node.id, e.currentTarget.value)}
    />

    <label for={pageFieldElementId("slug")}>{i18n.t("editor.page.slug")}</label>
    <input
      id={pageFieldElementId("slug")}
      type="text"
      bind:value={slugDraft}
      onchange={commitSlug}
      onkeydown={(e) => e.key === "Enter" && commitSlug()}
      aria-describedby="page-slug-hint"
    />
    <p class="hint" id="page-slug-hint">
      {page.isHome
        ? i18n.t("editor.page.slugHomeHint", { slug: slugPreview })
        : i18n.t("editor.page.slugHint", { slug: slugPreview })}
    </p>

    <label for={pageFieldElementId("seo_description")}>{i18n.t("editor.page.seo")}</label>
    <textarea
      id={pageFieldElementId("seo_description")}
      rows="3"
      value={node.seo_description}
      oninput={(e) => setSeoDescription(editor.session, node.id, e.currentTarget.value)}
    ></textarea>

    <ImageSetting
      {editor}
      ownerId={node.id}
      slot="share_image"
      label={i18n.t("editor.page.shareImage")}
      fieldId={pageFieldElementId("share_image")}
      altFieldId={pageFieldElementId("share_image_alt")}
      emptyNote={siteShareImage ? i18n.t("editor.page.shareFromSite") : i18n.t("editor.page.shareNone")}
    />

    <PageLanguages {editor} pageId={node.id} />

    <label class="check">
      <input
        type="checkbox"
        checked={page.menuIndex !== undefined}
        onchange={(e) => showInMenu(editor.session, node.id, e.currentTarget.checked)}
      />
      {i18n.t("editor.page.showInMenu")}
    </label>

    <div class="actions">
      <button
        type="button"
        id={pageFieldElementId("home")}
        onclick={() => setHome(editor.session, node.id)}
        disabled={page.isHome}
      >
        {page.isHome ? i18n.t("editor.page.homePage") : i18n.t("editor.page.setHome")}
      </button>
      <button type="button" onclick={duplicate}>{i18n.t("editor.page.duplicate")}</button>
      <button
        type="button"
        class="danger"
        onclick={() => deleteDialog?.showModal()}
        disabled={deleteReason !== undefined}
        aria-describedby={deleteReason ? "page-delete-hint" : undefined}
      >
        {i18n.t("editor.page.delete")}
      </button>
    </div>
    {#if deleteReason}
      <p class="hint" id="page-delete-hint">{i18n.t(`editor.page.cannotDelete.${deleteReason}`)}</p>
    {/if}
  </section>

  <dialog bind:this={deleteDialog} aria-labelledby="delete-page-title" class="delete-dialog">
    <form onsubmit={confirmDelete}>
      <h2 id="delete-page-title">{i18n.t("editor.page.deleteTitle", { title: node.title })}</h2>
      <p>
        {linkCount === 0
          ? i18n.t("editor.page.noLinks")
          : i18n.t("editor.page.links", { count: linkCount })}
        {i18n.t("editor.page.undoNote")}
      </p>
      <div class="buttons">
        <button type="button" onclick={() => deleteDialog?.close()}>{i18n.t("common.cancel")}</button>
        <button type="submit" class="danger">{i18n.t("editor.page.deletePage")}</button>
      </div>
    </form>
  </dialog>
{/if}

<style>
  .panel {
    padding: 1rem;
    border-bottom: 1px solid var(--ui-border);
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
  }

  h2 {
    margin: 0 0 0.5rem;
    font-size: 0.8rem;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: var(--ui-muted);
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
    color: var(--ui-muted);
  }

  .actions {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
    margin-top: 0.75rem;
  }

  .danger {
    color: var(--ui-problem);
  }

  .delete-dialog {
    max-width: 26rem;
    font-family: var(--ui-font);
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
