<script lang="ts">
import { goto, invalidateAll } from "$app/navigation";
import { projectPaths } from "$lib/project-paths";
import type { PageProps } from "./$types";

// A language's saved versions (version-history design.md decision 2): preview any of them, and
// restore one as a new version.
let { data }: PageProps = $props();

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

const format = new Intl.DateTimeFormat("en-GB", { dateStyle: "medium", timeStyle: "short" });
const when = (date: string | Date) => format.format(new Date(date));

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
      `Restoring failed (${response.status}).`;
    restored = false;
    return;
  }
  message = `Restored the version of ${when(restoring.savedAt)}.`;
  restored = true;
  await invalidateAll();
}
</script>

<svelte:head>
  <title>History – {data.project.name} – Static CMS</title>
</svelte:head>

<main>
  <p class="crumbs">
    <a href={projectPaths(data.project.id).overview}>← {data.project.name}</a> ·
    <a href={paths.edit()}>Open the editor</a>
  </p>
  <h1>History</h1>

  {#if data.languages.length > 1}
    <label class="language">
      Language
      <select
        value={data.lang}
        onchange={(e) => {
          const lang = e.currentTarget.value;
          goto(projectPaths(data.project.id, lang === data.primaryLang ? undefined : lang).history);
        }}
      >
        {#each data.languages as language (language.lang)}
          <option value={language.lang}>{language.name}</option>
        {/each}
      </select>
    </label>
  {/if}

  <p class="hint">
    Every save of {languageName} is kept. Restoring a version saves it again as the newest one, so you
    can always go back.
  </p>

  {#if message}
    <p class:ok={restored} class:bad={!restored} role="status">
      {message}
      {#if restored}<a href={paths.edit()}>Open the editor</a>{/if}
    </p>
  {/if}

  <ol class="versions">
    {#each entries as entry (entry.id)}
      <li>
        <span class="when">{when(entry.savedAt)}</span>
        <span class="who">{entry.savedBy ?? "a former member"}</span>
        <span class="marks">
          {#if entry.current}<span class="mark current">Current</span>{/if}
          {#if entry.live}<span class="mark live">Live</span>{/if}
          {#if entry.published}<span class="mark">Published</span>{/if}
          {#if entry.restoredFrom}
            <span class="mark">Restored from {when(entry.restoredFrom.savedAt)}</span>
          {/if}
        </span>
        <span class="actions">
          <a href={paths.version(entry.id)} target="_blank" rel="noopener"
            >Preview<span class="visually-hidden"> the version of {when(entry.savedAt)}</span></a
          >
          {#if !entry.current}
            <button type="button" onclick={() => askRestore(entry)}>
              Restore<span class="visually-hidden"> the version of {when(entry.savedAt)}</span>
            </button>
          {/if}
        </span>
      </li>
    {/each}
  </ol>
  {#if more}
    <button type="button" onclick={showOlder}>Show older</button>
  {/if}
</main>

<dialog bind:this={dialog} aria-labelledby="restore-title">
  <form onsubmit={confirmRestore}>
    <h2 id="restore-title">Restore the version of {restoring ? when(restoring.savedAt) : ""}?</h2>
    <p>
      {languageName} goes back to this version. It's saved as a new version, so you can undo this from
      the history. The live site changes at the next publish.
    </p>
    {#if isPrimary && data.languages.length > 1}
      <p>
        Shared fields (the theme, favicon and business details) come from {languageName}, so they
        change for every language.
      </p>
    {/if}
    <div class="buttons">
      <button type="button" onclick={() => dialog?.close()}>Cancel</button>
      <button type="submit">Restore</button>
    </div>
  </form>
</dialog>

<style>
  main {
    max-width: 48rem;
    margin: 0 auto;
    padding: 1rem;
    font-family: system-ui, sans-serif;
    line-height: 1.5;
  }

  .versions {
    list-style: none;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: 0.4rem;
  }

  .versions li {
    display: flex;
    flex-wrap: wrap;
    gap: 0.75rem;
    align-items: center;
    padding: 0.4rem 0;
    border-bottom: 1px solid #eee;
  }

  .when {
    font-weight: 600;
    min-width: 10rem;
  }

  .who {
    color: #555;
    min-width: 10rem;
  }

  .marks {
    display: flex;
    gap: 0.3rem;
    flex: 1;
  }

  .mark {
    padding: 0 0.4rem;
    border-radius: 0.3rem;
    background: #eee;
    font-size: 0.8rem;
  }

  .mark.current {
    background: #dde7f0;
  }

  .mark.live {
    background: #d8f0dd;
  }

  .actions {
    display: flex;
    gap: 0.5rem;
  }

  .hint {
    color: #555;
  }

  .ok {
    color: #1a6b2f;
  }

  .bad {
    color: #a3161a;
  }

  .language {
    display: flex;
    gap: 0.5rem;
    align-items: center;
  }

  .buttons {
    display: flex;
    justify-content: flex-end;
    gap: 0.5rem;
  }

  .visually-hidden {
    position: absolute;
    width: 1px;
    height: 1px;
    overflow: hidden;
    clip-path: inset(50%);
  }
</style>
