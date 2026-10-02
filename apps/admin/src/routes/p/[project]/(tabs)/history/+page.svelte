<script lang="ts">
import { goto, invalidateAll } from "$app/navigation";
import { getI18n } from "$lib/i18n";
import { projectPaths } from "$lib/project-paths";
import Badge from "$lib/ui/Badge.svelte";
import Button from "$lib/ui/Button.svelte";
import Card from "$lib/ui/Card.svelte";
import Notice from "$lib/ui/Notice.svelte";
import TabPanel from "$lib/ui/TabPanel.svelte";
import type { PageProps } from "./$types";

// A language's saved versions (version-history design.md decision 2): preview any of them, and
// restore one as a new version.
let { data }: PageProps = $props();
const i18n = getI18n();

interface Entry {
  id: string;
  savedAt: string | Date;
  savedBy: string | null;
  current: boolean;
  live: boolean;
  published: boolean;
  restoredFrom: { id: string; savedAt: string | Date } | null;
}

const paths = $derived(
  projectPaths(data.project.id, data.lang === data.primaryLang ? undefined : data.lang),
);
const languageName = $derived(data.languages.find((l) => l.lang === data.lang)?.name ?? data.lang);
const isPrimary = $derived(data.lang === data.primaryLang);

let older = $state<Entry[]>([]);
let more = $state(false);
$effect.pre(() => {
  // A new page of data (another language, or after a restore) starts the list over.
  void data.history;
  older = [];
  more = data.history.more;
});
const entries = $derived([...(data.history.versions as Entry[]), ...older]);

const when = (date: string | Date) => i18n.formatDate(date);

async function showOlder() {
  const last = entries.at(-1);
  if (!last) return;
  const separator = paths.versions.includes("?") ? "&" : "?";
  const response = await fetch(`${paths.versions}${separator}before=${last.id}`);
  if (!response.ok) return;
  const page = (await response.json()) as { versions: Entry[]; more: boolean };
  older = [...older, ...page.versions];
  more = page.more;
}

let restoring: Entry | undefined = $state();
let dialog: HTMLDialogElement | undefined = $state();
let message = $state("");
let restored = $state(false);

function askRestore(entry: Entry) {
  restoring = entry;
  message = "";
  dialog?.showModal();
}

async function confirmRestore(event: SubmitEvent) {
  event.preventDefault();
  if (!restoring) return;
  const response = await fetch(paths.restoreVersion(restoring.id), {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: "{}",
  });
  dialog?.close();
  if (!response.ok) {
    const body = (await response.json().catch(() => ({}))) as {
      message?: string;
      problems?: { message: string }[];
    };
    message =
      body.message ??
      body.problems?.map((p) => p.message).join(" ") ??
      i18n.t("history.restoreFailed", { status: response.status });
    restored = false;
    return;
  }
  message = i18n.t("history.restored", { date: when(restoring.savedAt) });
  restored = true;
  await invalidateAll();
}
</script>

<svelte:head>
  <title>{i18n.t("common.pageTitle", { page: i18n.t("history.pageTitle", { project: data.project.name }) })}</title>
</svelte:head>

<TabPanel width="narrow">
  <p class="hint">{i18n.t("history.hint", { language: languageName })}</p>

  {#if message}
    <Notice kind={restored ? "success" : "problem"}>
      <p role="status">
        {message}
        {#if restored}<a href={paths.edit()}>{i18n.t("project.openEditor")}</a>{/if}
      </p>
    </Notice>
  {/if}

  <Card>
    <ol class="versions" aria-label={i18n.t("history.versions")}>
      {#each entries as entry (entry.id)}
        <li>
          <span class="when">{when(entry.savedAt)}</span>
          <span class="who">{entry.savedBy ?? i18n.t("history.formerMember")}</span>
          <span class="marks">
            {#if entry.current}<Badge status="neutral">{i18n.t("history.current")}</Badge>{/if}
            {#if entry.live}<Badge status="success">{i18n.t("history.live")}</Badge>{/if}
            {#if entry.published}<Badge status="neutral">{i18n.t("history.published")}</Badge>{/if}
            {#if entry.restoredFrom}
              <Badge status="attention">{i18n.t("history.restoredFrom", { date: when(entry.restoredFrom.savedAt) })}</Badge>
            {/if}
          </span>
          <span class="actions">
            <Button
              size="sm"
              icon="eye"
              href={paths.version(entry.id)}
              target="_blank"
              rel="noopener"
              aria-label={i18n.t("history.previewVersion", { date: when(entry.savedAt) })}
            >
              {i18n.t("common.preview")}
            </Button>
            {#if !entry.current}
              <Button
                size="sm"
                icon="history"
                aria-label={i18n.t("history.restoreVersion", { date: when(entry.savedAt) })}
                onclick={() => askRestore(entry)}
              >
                {i18n.t("history.restore")}
              </Button>
            {/if}
          </span>
        </li>
      {/each}
    </ol>
    {#if more}
      <div><Button onclick={showOlder}>{i18n.t("history.showOlder")}</Button></div>
    {/if}
  </Card>
</TabPanel>

<dialog bind:this={dialog} aria-labelledby="restore-title">
  <form onsubmit={confirmRestore}>
    <h2 id="restore-title">{i18n.t("history.restoreTitle", { date: restoring ? when(restoring.savedAt) : "" })}</h2>
    <p>{i18n.t("history.restoreText", { language: languageName })}</p>
    {#if isPrimary && data.languages.length > 1}
      <p>{i18n.t("history.sharedText", { language: languageName })}</p>
    {/if}
    <div class="buttons">
      <Button onclick={() => dialog?.close()}>{i18n.t("common.cancel")}</Button>
      <Button type="submit" kind="primary">{i18n.t("history.restore")}</Button>
    </div>
  </form>
</dialog>

<style>
  .versions {
    display: flex;
    flex-direction: column;
    margin: 0;
    padding: 0;
    list-style: none;
  }

  .versions li {
    display: flex;
    flex-wrap: wrap;
    gap: var(--ui-space-3);
    align-items: center;
    padding: var(--ui-space-3) 0;
    border-bottom: 1px solid var(--ui-border);
  }

  .versions li:last-child {
    border-bottom: 0;
  }

  .when {
    font-weight: 600;
    min-width: 10rem;
  }

  .who {
    color: var(--ui-muted);
    min-width: 9rem;
  }

  .marks {
    display: flex;
    flex-wrap: wrap;
    gap: var(--ui-space-1);
    flex: 1;
  }

  .actions {
    display: flex;
    gap: var(--ui-space-2);
  }

  .hint {
    margin: 0;
    color: var(--ui-muted);
  }

  dialog {
    width: min(30rem, calc(100vw - 2rem));
    padding: var(--ui-space-5);
    border: 0;
    border-radius: var(--ui-radius-card);
    box-shadow: var(--ui-shadow-pop);
    font-family: var(--ui-font);
    color: var(--ui-ink);
  }

  dialog::backdrop {
    background: rgb(24 41 45 / 0.4);
  }

  dialog h2 {
    margin: 0 0 var(--ui-space-3);
    font-size: var(--ui-text-lg);
  }

  .buttons {
    display: flex;
    justify-content: flex-end;
    gap: var(--ui-space-2);
    margin-top: var(--ui-space-4);
  }
</style>
