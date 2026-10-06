<script lang="ts">
import { getI18n } from "$lib/i18n";
import type { EditorState } from "./state.svelte";

// Outside the primary language: says where the shared fields are edited, with a link there
// (languages spec, "Shared fields").
let { editor, tab }: { editor: EditorState; tab: "site" | "business" | "theme" } = $props();
const i18n = getI18n();

const href = $derived.by(() => {
  // The site's and the business's shared fields are edited in the primary language's Website
  // and Business sections; the theme's still in the primary language's editor.
  if (tab === "site") return `${editor.paths.dashboard}website`;
  if (tab === "business") return `${editor.paths.dashboard}business`;
  const page = editor.session.get(editor.currentPageId) as { translation_key?: string } | undefined;
  const key = page?.translation_key ? `&key=${encodeURIComponent(page.translation_key)}` : "";
  return `${editor.paths.dashboard}edit/?tab=design${key}`;
});
</script>

<p class="shared-note">
  {i18n.t("editor.shared.note", { language: editor.primaryName })}
  <a {href} data-sveltekit-reload>{i18n.t("editor.shared.link", { language: editor.primaryName })}</a>
</p>

<style>
  .shared-note {
    margin: 0 0 0.5rem;
    padding: 0.5rem 0.6rem;
    border-radius: 0.3rem;
    background: var(--ui-soft);
    font-size: 0.85rem;
  }
</style>
