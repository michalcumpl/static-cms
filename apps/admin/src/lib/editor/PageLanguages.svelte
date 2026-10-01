<script lang="ts">
import { projectPaths } from "$lib/project-paths";
import type { EditorState } from "./state.svelte";
import { counterpartIn, linkChoices, linkPage, unlinkPage } from "./translations";

// "In other languages" (language-tools design.md decision 2): the page's counterparts, and
// copying or linking where it has none. Only copying writes another language, on the server.
let { editor, pageId }: { editor: EditorState; pageId: string } = $props();

const page = $derived(
  editor.session.get(pageId) as { translation_key: string; title: string } | undefined,
);
const others = $derived(editor.translations.filter((l) => l.lang !== editor.lang));
const projectId = $derived(editor.paths.overview.split("/")[2] ?? "");
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
    message = `Save first: ${name} gets the page as it was last saved.`;
    return;
  }
  const response = await fetch(editor.paths.copyPage(lang), {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ from: editor.lang, pageId }),
  });
  const body = (await response.json().catch(() => ({}))) as { message?: string; title?: string };
  if (!response.ok) {
    message = body.message ?? `Copying failed (${response.status}).`;
    return;
  }
  await editor.reloadTranslations();
  message = `Copied to ${name}.`;
}
</script>

{#if page && others.length > 0}
  <section class="page-languages" aria-labelledby="page-languages-title">
    <h3 id="page-languages-title">In other languages</h3>
    <ul>
      {#each others as language (language.lang)}
        {@const counterpart = counterpartIn(language, page.translation_key)}
        <li>
          <span class="name">{language.name}:</span>
          {#if counterpart}
            <a href={editUrl(language.lang, language.primary, counterpart.pageId)} data-sveltekit-reload
              >{counterpart.title}<span class="visually-hidden"> (open in {language.name})</span></a
            >
          {:else}
            <span class="missing">Not translated</span>
            <div class="actions">
              <button type="button" onclick={() => copyTo(language.lang, language.name)}>
                Copy here<span class="visually-hidden"> ({language.name})</span>
              </button>
              {#if linkChoices(language, editor.session.doc).length > 0}
                <label class="visually-hidden" for="link-{language.lang}"
                  >Link to a page in {language.name}</label
                >
                <select id="link-{language.lang}" bind:value={linking[language.lang]}>
                  <option value="">Link to an existing page…</option>
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
                  Link<span class="visually-hidden"> to {language.name}</span>
                </button>
              {/if}
            </div>
          {/if}
        </li>
      {/each}
    </ul>
    {#if hasCounterparts}
      <button type="button" onclick={() => unlinkPage(editor.session, pageId)}>
        Unlink from other languages
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
    color: #8a5a00;
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
