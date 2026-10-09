<script lang="ts">
import { type CollectionName } from "@webmio/model";
import { type Command, Svedit } from "svedit";
import { onMount, type Snippet, tick } from "svelte";
import { getI18n } from "$lib/i18n";
import { projectPaths } from "$lib/project-paths";
import Badge from "$lib/ui/Badge.svelte";
import Button from "$lib/ui/Button.svelte";
import Dialog from "$lib/ui/Dialog.svelte";
import Notice from "$lib/ui/Notice.svelte";
import BusinessSettings from "./BusinessSettings.svelte";
import CropDialog from "./CropDialog.svelte";
import { deleteItem, pagesShowing } from "./collections";
import { setFormLists } from "./form/lists";
import LinkDialog from "./LinkDialog.svelte";
import {
  listFieldId,
  listTarget,
  listTargetOfFieldId,
  settingsFieldId,
  settingsTarget,
} from "./locate";
import MediaLibrary from "./MediaLibrary.svelte";
import SharedNote from "./SharedNote.svelte";
import SiteSettings from "./SiteSettings.svelte";
import { saveStatusText, useEditorKeys, useMediaLibrary, useUnsavedGuard } from "./screen.svelte";
import { type EditorLanguageInfo, EditorState, provideEditor, type SiteData } from "./state.svelte";
import type { EditorTranslations } from "./translations";

// One section of the panel that edits the saved document of one language: the business, the
// site's settings (control-panel design decision 2), or the lists of What you offer and About you,
// which are Svedit forms (offer-and-about decision 2). It is edited through the same session and
// operations as the editor's, and saved the same way: explicitly, as one new version.
let {
  section,
  children,
  projectId,
  site,
  translations,
  lang,
  primaryLang,
  languages,
  focus,
}: {
  projectId: string;
  site: SiteData;
  translations: EditorTranslations[];
  lang: string;
  primaryLang: string;
  languages: readonly EditorLanguageInfo[];
  /** The element ID of a field to focus once the section is shown (from a problem). */
  focus: string | null;
  /** Which section: Business, the Website section's site settings, What you offer, About you. */
  section: "business" | "site" | "offer" | "about";
  /**
   * More of the section beside the settings (the Website section's design and home page cards).
   * What it edits through the section's editor is part of what Save saves.
   */
  children?: Snippet;
} = $props();
const i18n = getI18n();

/** The lists each form section shows. */
const LISTS: Partial<Record<typeof section, readonly CollectionName[]>> = {
  offer: ["services", "projects", "faqs"],
  about: ["team", "testimonials"],
};
/* svelte-ignore state_referenced_locally */
const lists = LISTS[section];

/* svelte-ignore state_referenced_locally */
const editor = provideEditor(
  new EditorState(
    site,
    projectPaths(projectId, lang === primaryLang ? undefined : lang),
    { lang, primaryLang, languages },
    lists ? "form" : "canvas",
  ),
);
/* svelte-ignore state_referenced_locally */
if (lists) setFormLists({ section: section as "offer" | "about", lists, askDelete });
const keyMapper = useEditorKeys(editor);

// The form's formatting, from the session's commands as in the editor's toolbar (decision 4).
const commands = $derived(
  editor.session.commands as Record<string, Command & { active?: boolean }> | undefined,
);
const linkEnabled = $derived(
  Boolean(commands && (!commands.link?.disabled || !commands.internal_link?.disabled)),
);
let linkDialog: LinkDialog | undefined = $state();
let form: { focus_canvas: () => void } | undefined = $state();

/** Drops unsaved changes without the leaving question (the website is being deleted). */
export function discard(): void {
  editor.leaving = true;
}

// Deleting an item that pages show asks first, saying on how many (offer-and-about decision 3).
let deleteDialog: Dialog | undefined = $state();
let deleting = $state<{
  collection: CollectionName;
  itemId: string;
  name: string;
  pages: number;
}>();
function askDelete(collection: CollectionName, itemId: string, name: string) {
  const pages = pagesShowing(editor.session.doc as never, collection, itemId).length;
  if (pages === 0) {
    deleteItem(editor.session, editor.siteId, collection, itemId);
    return;
  }
  deleting = { collection, itemId, name, pages };
  deleteDialog?.open();
}
function confirmDelete() {
  if (deleting) deleteItem(editor.session, editor.siteId, deleting.collection, deleting.itemId);
  deleteDialog?.close();
}
/* svelte-ignore state_referenced_locally */
editor.translations = translations;

// Other pages, and this one in another language, are other places: they ask first.
/* svelte-ignore state_referenced_locally */
const here = {
  business: projectPaths(projectId).business,
  site: projectPaths(projectId).website,
  offer: projectPaths(projectId).offer,
  about: projectPaths(projectId).about,
}[section];
useUnsavedGuard(
  editor,
  (to) => to.pathname === here && (to.searchParams.get("lang") ?? primaryLang) === lang,
);
const media = useMediaLibrary(editor);

const statusText = $derived(saveStatusText(editor, i18n.t));
// The saved document's problems that are fixed in this section, each leading to its field.
type Doc = Parameters<typeof settingsTarget>[0];
const problems = $derived(
  editor.savedProblems.flatMap((problem) => {
    const doc = editor.session.doc as unknown as Doc;
    if (lists) {
      const item = listTarget(doc, problem.nodeId, problem.property);
      return item?.section === section
        ? [{ problem, id: listFieldId(item.section, item.itemId, item.field) }]
        : [];
    }
    const target = settingsTarget(doc, problem.nodeId, problem.property);
    const id = target?.tab === section ? settingsFieldId(target) : undefined;
    return id ? [{ problem, id }] : [];
  }),
);

async function show(id: string) {
  await tick();
  const field = document.getElementById(id);
  field?.scrollIntoView({ block: "center" });
  const item = lists
    ? listTargetOfFieldId(editor.session.doc as unknown as Doc, section, id)
    : undefined;
  if (item && item.field !== "image" && item.field !== "image-alt") {
    // An item's text is Svedit's, not an input: the caret goes to its start (decision 7).
    editor.session.selection = {
      type: "text",
      path: [editor.siteId, item.collection, item.index, item.field],
      anchor_offset: 0,
      focus_offset: 0,
    };
    form?.focus_canvas();
  } else {
    field?.focus();
  }
}

onMount(() => {
  if (focus?.startsWith(`${section}-${lists ? "" : "settings-"}`)) void show(focus);
});
</script>

<svelte:window onkeydown={(event) => keyMapper.handle_keydown(event)} />

<div class="settings">
  <div class="bar">
    <div class="actions">
      <Button
        kind="primary"
        onclick={() => editor.save()}
        disabled={editor.status.kind === "saving" || !editor.dirty}
      >
        {i18n.t("editor.toolbar.save")}
      </Button>
      <Button icon="undo" onclick={() => editor.undo()} disabled={!editor.session.can_undo}>
        {i18n.t("editor.toolbar.undo")}
      </Button>
      <Button icon="redo" onclick={() => editor.redo()} disabled={!editor.session.can_redo}>
        {i18n.t("editor.toolbar.redo")}
      </Button>
      {#if lists}
        <span class="separator"></span>
        <button type="button" class="mark" aria-label={i18n.t("editor.toolbar.bold")} title={i18n.t("editor.toolbar.boldTitle")} aria-pressed={commands?.bold?.active ?? false} onmousedown={(e) => e.preventDefault()} onclick={() => commands?.bold?.execute()} disabled={commands?.bold?.disabled ?? true}><strong>B</strong></button>
        <button type="button" class="mark" aria-label={i18n.t("editor.toolbar.italic")} title={i18n.t("editor.toolbar.italicTitle")} aria-pressed={commands?.italic?.active ?? false} onmousedown={(e) => e.preventDefault()} onclick={() => commands?.italic?.execute()} disabled={commands?.italic?.disabled ?? true}><em>I</em></button>
        <Button size="sm" kind="quiet" onclick={() => linkDialog?.open()} disabled={!linkEnabled} title={i18n.t("editor.toolbar.linkTitle")}>{i18n.t("editor.toolbar.link")}</Button>
        <Button size="sm" kind="quiet" onmousedown={(e: MouseEvent) => e.preventDefault()} onclick={() => commands?.unlink?.execute()} disabled={commands?.unlink?.disabled ?? true} title={i18n.t("editor.toolbar.unlinkTitle")}>{i18n.t("editor.toolbar.unlink")}</Button>
      {/if}
    </div>
    <p
      class="status"
      class:problem={editor.status.kind === "conflict" || editor.status.kind === "error"}
      role="status"
    >
      {statusText}
    </p>
  </div>

  {#if problems.length > 0}
    <Notice kind="attention">
      <p class="problems-title">{i18n.t("project.settingsTab.problems")}</p>
      <ul class="problems">
        {#each problems as { problem, id } (problem.nodeId + problem.code + (problem.property ?? ""))}
          <li>
            <Badge status={problem.severity === "error" ? "problem" : "attention"}>
              {i18n.t(`project.severity.${problem.severity}`)}
            </Badge>
            <button type="button" onclick={() => show(id)}>{problem.message}</button>
          </li>
        {/each}
      </ul>
    </Notice>
  {/if}

  {#if lists}
    {#if editor.sharedReadOnly}<SharedNote {editor} tab={section} />{/if}
    <div class="form" data-history-keys>
      <Svedit bind:this={form} session={editor.session} path={[editor.siteId]} editable={true} />
    </div>
  {:else}
    <div class="cards">
      <div class="card">
        {#if section === "business"}<BusinessSettings {editor} />{:else}<SiteSettings {editor} />{/if}
      </div>
      {@render children?.()}
    </div>
  {/if}
</div>

<MediaLibrary {editor} bind:this={media.ref} />
<CropDialog {editor} bind:this={media.cropRef} />
<!-- Focus left the form for the dialog; give it back, or Svedit restores a stale selection. -->
{#if lists}<LinkDialog {editor} bind:this={linkDialog} onclose={() => form?.focus_canvas()} />{/if}
<Dialog
  id="delete-item"
  title={i18n.t("panel.lists.deleteTitle", { name: deleting?.name ?? "" })}
  bind:this={deleteDialog}
  onclose={() => (deleting = undefined)}
>
  <p>{i18n.t("panel.lists.deleteShown", { count: deleting?.pages ?? 0 })}</p>
  {#snippet actions()}
    <Button onclick={() => deleteDialog?.close()}>{i18n.t("common.cancel")}</Button>
    <Button kind="danger" icon="trash" onclick={confirmDelete}>{i18n.t("common.delete")}</Button>
  {/snippet}
</Dialog>

<style>
  .settings {
    display: flex;
    flex-direction: column;
    gap: var(--ui-space-4);
  }

  .bar {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: var(--ui-space-4);
  }

  .actions {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: var(--ui-space-2);
  }

  .separator {
    width: 1px;
    height: 1.5rem;
    background: var(--ui-border);
  }

  .mark {
    width: var(--ui-control-sm);
    height: var(--ui-control-sm);
    border: 0;
    border-radius: var(--ui-radius-pill);
    background: none;
    color: var(--ui-ink);
    font: inherit;
    cursor: pointer;
  }

  .mark:hover:not(:disabled),
  .mark[aria-pressed="true"] {
    background: var(--ui-soft);
  }

  .mark:disabled {
    color: var(--ui-muted);
    cursor: default;
  }

  .status {
    margin: 0;
    color: var(--ui-muted);
    font-size: var(--ui-text-sm);
  }

  .status.problem {
    color: var(--ui-problem);
  }

  .problems-title {
    margin: 0 0 var(--ui-space-2);
    font-weight: 600;
  }

  .problems {
    display: flex;
    flex-direction: column;
    gap: var(--ui-space-2);
    margin: 0;
    padding: 0;
    list-style: none;
  }

  .problems li {
    display: flex;
    gap: var(--ui-space-3);
    align-items: baseline;
  }

  .problems button {
    padding: 0;
    border: 0;
    background: none;
    color: var(--ui-link);
    font: inherit;
    text-align: left;
    text-decoration: underline;
    cursor: pointer;
  }

  .form {
    max-width: 48rem;
  }

  .cards {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(20rem, 1fr));
    gap: var(--ui-space-5);
    align-items: start;
  }

  .card {
    border: 1px solid var(--ui-border);
    border-radius: var(--ui-radius-card);
    background: var(--ui-surface);
    box-shadow: var(--ui-shadow);
  }

  /* The panels are the editor's: drop their column dividers inside a card. */
  .card :global(.panel) {
    border-bottom: 0;
  }
</style>
