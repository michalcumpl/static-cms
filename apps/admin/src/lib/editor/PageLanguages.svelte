<script lang="ts">
import { getI18n } from "$lib/i18n";
import { projectPaths } from "$lib/project-paths";
import type { EditorState } from "./state.svelte";
import { counterpartIn, linkChoices, linkPage, unlinkPage } from "./translations";

// "In other languages" (language-tools design.md decision 2): the page's counterparts, and
// copying or linking where it has none. Only copying writes another language, on the server.
let { editor, pageId }: { editor: EditorState; pageId: string } = $props();
const i18n = getI18n();

const page = $derived(
  editor.session.get(pageId) as { translation_key: string; title: string } | undefined,
);
const others = $derived(editor.translations.filter((l) => l.lang !== editor.lang));
const projectId = $derived(editor.paths.dashboard.split("/")[2] ?? "");
const hasCounterparts = $derived(
  page !== undefined && others.some((l) => counterpartIn(l, page.translation_key)),
);

let message = $state("");
let linking = $state<Record<string, string>>({});

function editUrl(lang: string, primary: boolean, targetPageId: string) {
  return projectPaths(projectId, primary ? undefined : lang).edit(targetPageId);
}

async function copyTo(lang: string, name: string) {
  message = "";
  if (editor.dirty) {
    message = i18n.t("editor.pageLanguages.saveFirst", { language: name });
    return;
  }
  const response = await fetch(editor.paths.copyPage(lang), {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ from: editor.lang, pageId }),
  });
  const body = (await response.json().catch(() => ({}))) as { message?: string; title?: string };
  if (!response.ok) {
    message =
      body.message ?? i18n.t("editor.pageLanguages.copyFailed", { status: response.status });
    return;
  }
  await editor.reloadTranslations();
  message = i18n.t("editor.pageLanguages.copied", { language: name });
}
</script>

{#if page && others.length > 0}
  <section class="page-languages" aria-labelledby="page-languages-title">
    <h3 id="page-languages-title">{i18n.t("editor.pageLanguages.title")}</h3>
    <ul>
      {#each others as language (language.lang)}
        {@const counterpart = counterpartIn(language, page.translation_key)}
        <li>
          <span class="name">{language.name}:</span>
          {#if counterpart}
            <a href={editUrl(language.lang, language.primary, counterpart.pageId)} data-sveltekit-reload
              >{counterpart.title}<span class="visually-hidden"> {i18n.t("editor.pageLanguages.openIn", { language: language.name })}</span></a
            >
          {:else}
            <span class="missing">{i18n.t("editor.pageLanguages.notTranslated")}</span>
            <div class="actions">
              <button type="button" onclick={() => copyTo(language.lang, language.name)}>
                {i18n.t("editor.pageLanguages.copyHere")}<span class="visually-hidden"> {i18n.t("editor.pageLanguages.inLanguage", { language: language.name })}</span>
              </button>
              {#if linkChoices(language, editor.session.doc).length > 0}
                <label class="visually-hidden" for="link-{language.lang}"
                  >{i18n.t("editor.pageLanguages.linkLabel", { language: language.name })}</label
                >
                <select id="link-{language.lang}" bind:value={linking[language.lang]}>
                  <option value="">{i18n.t("editor.pageLanguages.linkChoose")}</option>
                  {#each linkChoices(language, editor.session.doc) as choice (choice.key)}
                    <option value={choice.key}>{choice.title}</option>
                  {/each}
                </select>
                <button
                  type="button"
                  disabled={!linking[language.lang]}
                  onclick={() => {
                    linkPage(editor.session, pageId, linking[language.lang] as string);
                    linking[language.lang] = "";
                  }}
                >
                  {i18n.t("editor.pageLanguages.link")}<span class="visually-hidden"> {i18n.t("editor.pageLanguages.linkTo", { language: language.name })}</span>
                </button>
              {/if}
            </div>
          {/if}
        </li>
      {/each}
    </ul>
    {#if hasCounterparts}
      <button type="button" onclick={() => unlinkPage(editor.session, pageId)}>
        {i18n.t("editor.pageLanguages.unlink")}
      </button>
    {/if}
    {#if message}<p class="message" role="status">{message}</p>{/if}
  </section>
{/if}

<style>
  .page-languages {
    margin-top: 0.75rem;
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: 0.4rem;
  }

  h3 {
    margin: 0;
    font-size: 0.9rem;
  }

  ul {
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: 0.4rem;
    font-size: 0.9rem;
  }

  .name {
    font-weight: 600;
  }

  .missing {
    color: var(--ui-attention);
  }

  .actions {
    display: flex;
    flex-wrap: wrap;
    gap: 0.3rem;
    margin-top: 0.25rem;
  }

  select,
  button {
    font: inherit;
    font-size: 0.85rem;
  }

  .message {
    margin: 0;
    font-size: 0.85rem;
  }

  .visually-hidden {
    position: absolute;
    width: 1px;
    height: 1px;
    overflow: hidden;
    clip-path: inset(50%);
  }
</style>
