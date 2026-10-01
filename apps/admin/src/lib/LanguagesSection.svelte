<script lang="ts">
import { LANGUAGES, type TranslationPage } from "@static-cms/site";
import { invalidateAll } from "$app/navigation";
import type { ProjectPaths } from "$lib/project-paths";
import { projectPaths } from "$lib/project-paths";

// A project's languages (languages spec): add one as a copy of the primary, publish or hide it,
// open it in the editor, or remove it after confirming.
interface Language {
  lang: string;
  name: string;
  primary: boolean;
  published: boolean;
}

interface Translations {
  lang: string;
  untranslated: TranslationPage[];
  missing: TranslationPage[];
}

let {
  projectId,
  paths,
  languages,
  translations = [],
}: {
  projectId: string;
  paths: ProjectPaths;
  languages: Language[];
  translations?: Translations[];
} = $props();

const primaryLanguage = $derived(languages.find((l) => l.primary));
const todo = (lang: string) => translations.find((t) => t.lang === lang);

const available = $derived(
  Object.entries(LANGUAGES).filter(([lang]) => !languages.some((l) => l.lang === lang)),
);
let adding = $state("");
let message = $state("");
let removing: Language | undefined = $state();
let removeDialog: HTMLDialogElement | undefined = $state();

async function send(url: string, init: RequestInit) {
  message = "";
  const response = await fetch(url, {
    ...init,
    headers: { "content-type": "application/json" },
  });
  if (!response.ok) {
    message =
      ((await response.json().catch(() => ({}))) as { message?: string }).message ??
      `That didn't work (${response.status}).`;
    return;
  }
  await invalidateAll();
}

async function add(event: SubmitEvent) {
  event.preventDefault();
  if (!adding) return;
  await send(paths.languages, { method: "POST", body: JSON.stringify({ lang: adding }) });
  adding = "";
}

function askRemove(language: Language) {
  removing = language;
  removeDialog?.showModal();
}

async function confirmRemove(event: SubmitEvent) {
  event.preventDefault();
  if (removing) await send(paths.language(removing.lang), { method: "DELETE" });
  removeDialog?.close();
}
</script>

<section aria-labelledby="languages-title">
  <h2 id="languages-title">Languages</h2>
  <ul class="languages">
    {#each languages as language (language.lang)}
      <li>
        <span class="name">{language.name}</span>
        <span class="state">
          {language.primary ? "Primary" : language.published ? "Published" : "Hidden"}
        </span>
        <a href={projectPaths(projectId, language.primary ? undefined : language.lang).edit()}
          >Edit<span class="visually-hidden"> {language.name}</span></a
        >
        {#if !language.primary}
          <button
            type="button"
            onclick={() =>
              send(paths.language(language.lang), {
                method: "PATCH",
                body: JSON.stringify({ published: !language.published }),
              })}
          >
            {language.published ? "Hide" : "Publish"}<span class="visually-hidden">
              {language.name}</span
            >
          </button>
          <button type="button" class="danger" onclick={() => askRemove(language)}>
            Remove<span class="visually-hidden"> {language.name}</span>
          </button>
          {@const left = todo(language.lang)}
          {#if left}
            <div class="todo">
              {#if left.untranslated.length === 0 && left.missing.length === 0}
                <span class="done">Fully translated</span>
              {:else}
                <span class="todo-title">To translate:</span>
                <ul>
                  {#each left.untranslated as page (page.key)}
                    <li>
                      <a href={projectPaths(projectId, language.lang).edit(page.pageId)}>{page.title}</a>
                      <span class="why">not translated yet</span>
                    </li>
                  {/each}
                  {#each left.missing as page (page.key)}
                    <li>
                      <a href={projectPaths(projectId).edit(page.pageId)}>{page.title}</a>
                      <span class="why">missing: copy it from {primaryLanguage?.name}</span>
                    </li>
                  {/each}
                </ul>
              {/if}
            </div>
          {/if}
        {/if}
      </li>
    {/each}
  </ul>
  <p class="hint">
    A new language starts as a copy of {languages.find((l) => l.primary)?.name}, hidden until you
    publish it. Business details, the theme and the favicon are shared and edited in
    {languages.find((l) => l.primary)?.name}.
  </p>
  {#if available.length > 0}
    <form onsubmit={add}>
      <label for="add-language">Add a language</label>
      <select id="add-language" bind:value={adding}>
        <option value="">Choose…</option>
        {#each available as [lang, name] (lang)}
          <option value={lang}>{name}</option>
        {/each}
      </select>
      <button type="submit" disabled={!adding}>Add</button>
    </form>
  {/if}
  {#if message}<p class="bad" role="alert">{message}</p>{/if}
</section>

<dialog bind:this={removeDialog} aria-labelledby="remove-language-title">
  <form onsubmit={confirmRemove}>
    <h2 id="remove-language-title">Remove {removing?.name}?</h2>
    <p>
      Its pages and all their saved versions are deleted, and its addresses stop working after the
      next publish. To take it offline but keep it, hide it instead.
    </p>
    <div class="buttons">
      <button type="button" onclick={() => removeDialog?.close()}>Cancel</button>
      <button type="submit" class="danger">Remove {removing?.name}</button>
    </div>
  </form>
</dialog>

<style>
  .languages {
    list-style: none;
    padding: 0;
    margin: 0 0 0.5rem;
    display: flex;
    flex-direction: column;
    gap: 0.4rem;
  }

  .languages li {
    display: flex;
    flex-wrap: wrap;
    gap: 0.75rem;
    align-items: center;
  }

  .todo {
    flex-basis: 100%;
    padding-left: 1rem;
    font-size: 0.9rem;
  }

  .todo ul {
    margin: 0.2rem 0 0;
    padding-left: 1.2rem;
  }

  .todo-title,
  .why {
    color: #555;
  }

  .done {
    color: #1a6b2f;
  }

  .name {
    font-weight: 600;
    min-width: 7rem;
  }

  .state {
    color: #555;
    min-width: 5rem;
  }

  form {
    display: flex;
    gap: 0.5rem;
    align-items: center;
  }

  .hint {
    color: #555;
    font-size: 0.9rem;
  }

  .bad,
  .danger {
    color: #a3161a;
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
