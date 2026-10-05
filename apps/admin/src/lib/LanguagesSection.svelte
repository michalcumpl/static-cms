<script lang="ts">
import { type TranslationPage } from "@webmio/model";
import { LANGUAGES } from "@webmio/render";
import { invalidateAll } from "$app/navigation";
import { getI18n } from "$lib/i18n";
import type { ProjectPaths } from "$lib/project-paths";
import { projectPaths } from "$lib/project-paths";
import Badge from "$lib/ui/Badge.svelte";
import Button from "$lib/ui/Button.svelte";
import Card from "$lib/ui/Card.svelte";
import Notice from "$lib/ui/Notice.svelte";

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

const i18n = getI18n();
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
      i18n.t("languages.failed", { status: response.status });
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

<Card title={i18n.t("languages.title")} id="languages">
  <ul class="languages">
    {#each languages as language (language.lang)}
      <li>
        <div class="row">
          <span class="name">{language.name}</span>
          {#if language.primary}
            <Badge status="neutral">{i18n.t("languages.primary")}</Badge>
          {:else if language.published}
            <Badge status="success">{i18n.t("languages.published")}</Badge>
          {:else}
            <Badge status="attention">{i18n.t("languages.hidden")}</Badge>
          {/if}
          <span class="actions">
            <Button
              size="sm"
              icon="pencil"
              href={projectPaths(projectId, language.primary ? undefined : language.lang).edit()}
              aria-label={i18n.t("languages.edit", { language: language.name })}
            >
              {i18n.t("common.edit")}
            </Button>
            {#if !language.primary}
              <Button
                size="sm"
                aria-label={language.published
                  ? i18n.t("languages.hide", { language: language.name })
                  : i18n.t("languages.publish", { language: language.name })}
                onclick={() =>
                  send(paths.language(language.lang), {
                    method: "PATCH",
                    body: JSON.stringify({ published: !language.published }),
                  })}
              >
                {language.published ? i18n.t("languages.hideButton") : i18n.t("publish.publish")}
              </Button>
              <Button
                size="sm"
                kind="danger"
                aria-label={i18n.t("languages.remove", { language: language.name })}
                onclick={() => askRemove(language)}
              >
                {i18n.t("common.remove")}
              </Button>
            {/if}
          </span>
        </div>
        {#if !language.primary}
          {@const left = todo(language.lang)}
          {#if left}
            <div class="todo">
              {#if left.untranslated.length === 0 && left.missing.length === 0}
                <span class="done">{i18n.t("languages.fullyTranslated")}</span>
              {:else}
                <span class="todo-title">{i18n.t("languages.toTranslate")}</span>
                <ul>
                  {#each left.untranslated as page (page.key)}
                    <li>
                      <a href={projectPaths(projectId, language.lang).edit(page.pageId)}>{page.title}</a>
                      <span class="why">{i18n.t("languages.notTranslated")}</span>
                    </li>
                  {/each}
                  {#each left.missing as page (page.key)}
                    <li>
                      <a href={projectPaths(projectId).edit(page.pageId)}>{page.title}</a>
                      <span class="why">{i18n.t("languages.missing", { language: primaryLanguage?.name ?? "" })}</span>
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
  <p class="hint">{i18n.t("languages.hint", { primary: primaryLanguage?.name ?? "" })}</p>
  {#if available.length > 0}
    <form onsubmit={add} class="add">
      <label for="add-language">{i18n.t("languages.add")}</label>
      <select id="add-language" bind:value={adding}>
        <option value="">{i18n.t("languages.choose")}</option>
        {#each available as [lang, name] (lang)}
          <option value={lang}>{name}</option>
        {/each}
      </select>
      <Button type="submit" size="sm" icon="plus" disabled={!adding}>{i18n.t("languages.addButton")}</Button>
    </form>
  {/if}
  {#if message}<Notice kind="problem"><p>{message}</p></Notice>{/if}
</Card>

<dialog bind:this={removeDialog} aria-labelledby="remove-language-title">
  <form onsubmit={confirmRemove}>
    <h2 id="remove-language-title">{i18n.t("languages.removeTitle", { language: removing?.name ?? "" })}</h2>
    <p>{i18n.t("languages.removeText")}</p>
    <div class="buttons">
      <Button onclick={() => removeDialog?.close()}>{i18n.t("common.cancel")}</Button>
      <Button type="submit" kind="danger">{i18n.t("languages.remove", { language: removing?.name ?? "" })}</Button>
    </div>
  </form>
</dialog>

<style>
  .languages {
    display: flex;
    flex-direction: column;
    gap: var(--ui-space-3);
    margin: 0;
    padding: 0;
    list-style: none;
  }

  .row {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: var(--ui-space-3);
  }

  .name {
    font-weight: 700;
    min-width: 6rem;
  }

  .actions {
    display: flex;
    gap: var(--ui-space-2);
    margin-left: auto;
  }

  .todo {
    margin-top: var(--ui-space-2);
    padding: var(--ui-space-2) var(--ui-space-3);
    border-radius: var(--ui-radius-field);
    background: var(--ui-soft);
    font-size: var(--ui-text-sm);
  }

  .todo ul {
    margin: var(--ui-space-1) 0 0;
    padding-left: 1.2rem;
  }

  .todo-title,
  .why {
    color: var(--ui-muted);
  }

  .done {
    color: var(--ui-success);
    font-weight: 600;
  }

  .hint {
    margin: 0;
    color: var(--ui-muted);
    font-size: var(--ui-text-sm);
  }

  .add {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: var(--ui-space-2);
  }

  .add label {
    font-size: var(--ui-text-sm);
    font-weight: 600;
  }

  select {
    min-height: var(--ui-control-sm);
    padding: 0 var(--ui-space-3);
    border: 1px solid var(--ui-border-strong);
    border-radius: var(--ui-radius-field);
    background: var(--ui-surface);
    font: var(--ui-text-sm) var(--ui-font);
  }

  a {
    color: var(--ui-link);
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
