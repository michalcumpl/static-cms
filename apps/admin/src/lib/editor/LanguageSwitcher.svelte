<script lang="ts">
import { untrack } from "svelte";
import { projectPaths } from "$lib/project-paths";
import type { EditorState } from "./state.svelte";

// Opens another language's document (languages design.md decision 6). Each language is its own
// editing session, so switching reloads the editor, on the page with the same translation key.
let { editor, projectId }: { editor: EditorState; projectId: string } = $props();

function switchTo(lang: string) {
  if (lang === editor.lang) return;
  if (editor.dirty && !confirm("You have unsaved changes. Switch language anyway?")) {
    // Put the select back on the language being edited.
    selected = editor.lang;
    return;
  }
  const page = editor.session.get(editor.currentPageId) as { translation_key?: string } | undefined;
  const target = projectPaths(projectId, lang === editor.primaryLang ? undefined : lang).edit();
  const key = page?.translation_key
    ? `${target.includes("?") ? "&" : "?"}key=${encodeURIComponent(page.translation_key)}`
    : "";
  editor.leaving = true;
  window.location.assign(target + key);
}

// The editor's language never changes in place (switching reloads), so its first value holds.
let selected = $state(untrack(() => editor.lang));
</script>

<p class="history-link"><a href={editor.paths.history}>History</a></p>

{#if editor.languages.length > 1}
  <div class="language-switcher">
    <label for="editor-language">Language</label>
    <select
      id="editor-language"
      bind:value={selected}
      onchange={() => switchTo(selected)}
    >
      {#each editor.languages as language (language.lang)}
        <option value={language.lang}>
          {language.name}{language.published ? "" : " (hidden)"}
        </option>
      {/each}
    </select>
  </div>
{/if}

<style>
  .history-link {
    margin: 0;
    padding: 1rem 1rem 0;
    font-size: 0.9rem;
  }

  .language-switcher {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
    padding: 1rem 1rem 0;
  }

  label {
    font-size: 0.8rem;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: #555;
  }

  select {
    font: inherit;
    padding: 0.3rem 0.4rem;
  }
</style>
