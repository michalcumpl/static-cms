<script lang="ts">
import { onMount, tick } from "svelte";
import { getI18n } from "$lib/i18n";
import { projectPaths } from "$lib/project-paths";
import Badge from "$lib/ui/Badge.svelte";
import Button from "$lib/ui/Button.svelte";
import Notice from "$lib/ui/Notice.svelte";
import BusinessSettings from "./BusinessSettings.svelte";
import { settingsFieldId, settingsTarget } from "./locate";
import MediaLibrary from "./MediaLibrary.svelte";
import SiteSettings from "./SiteSettings.svelte";
import { saveStatusText, useMediaLibrary, useUnsavedGuard } from "./screen.svelte";
import { type EditorLanguageInfo, EditorState, type SiteData } from "./state.svelte";
import type { EditorTranslations } from "./translations";

// The site and business settings of one language (project-page spec, "Settings tab"), edited
// through the same session and operations as the editor's, saved the same way: explicitly, as
// one new version (project-tabs design.md decision 3).
let {
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
  /** The element ID of a field to focus once the tab is shown (from a problem in the editor). */
  focus: string | null;
} = $props();
const i18n = getI18n();

/* svelte-ignore state_referenced_locally */
const editor = new EditorState(
  site,
  projectPaths(projectId, lang === primaryLang ? undefined : lang),
  { lang, primaryLang, languages },
);
/* svelte-ignore state_referenced_locally */
editor.translations = translations;

// Other tabs, and this one in another language, are other places: they ask first.
useUnsavedGuard(
  editor,
  (to) =>
    to.pathname === projectPaths(projectId).settings &&
    (to.searchParams.get("lang") ?? primaryLang) === lang,
);
const media = useMediaLibrary(editor);

const statusText = $derived(saveStatusText(editor, i18n.t));
// The saved settings' problems that are fixed here, each leading to its field.
const problems = $derived(
  editor.savedProblems.flatMap((problem) => {
    const id = settingsFieldId(
      settingsTarget(
        editor.session.doc as unknown as Parameters<typeof settingsTarget>[0],
        problem.nodeId,
        problem.property,
      ),
    );
    return id ? [{ problem, id }] : [];
  }),
);

async function show(id: string) {
  await tick();
  const field = document.getElementById(id);
  field?.scrollIntoView({ block: "center" });
  field?.focus();
}

onMount(() => {
  if (focus && /^(site|business)-settings-/.test(focus)) void show(focus);
});
</script>

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

  <div class="cards">
    <div class="card"><SiteSettings {editor} /></div>
    <div class="card"><BusinessSettings {editor} /></div>
  </div>
</div>

<MediaLibrary {editor} bind:this={media.ref} />

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
    gap: var(--ui-space-2);
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
