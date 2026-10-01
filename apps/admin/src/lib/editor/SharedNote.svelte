<script lang="ts">
import type { EditorState } from "./state.svelte";

// Outside the primary language: says where the shared fields are edited, with a link there
// (languages spec, "Shared fields").
let { editor, tab }: { editor: EditorState; tab: "site" | "business" | "theme" } = $props();

const href = $derived.by(() => {
  const page = editor.session.get(editor.currentPageId) as { translation_key?: string } | undefined;
  const key = page?.translation_key ? `&key=${encodeURIComponent(page.translation_key)}` : "";
  return `${editor.paths.overview}edit/?tab=${tab}${key}`;
});
</script>

<p class="shared-note">
  Edited in {editor.primaryName}: the fields greyed out here are shared by every language.
  <a {href} data-sveltekit-reload>Edit in {editor.primaryName}</a>
</p>

<style>
  .shared-note {
    margin: 0 0 0.5rem;
    padding: 0.5rem 0.6rem;
    border-radius: 0.3rem;
    background: #eef4f9;
    font-size: 0.85rem;
  }
</style>
