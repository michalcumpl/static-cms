<script lang="ts">
import { untrack } from "svelte";
import { getEditor } from "$lib/editor/state.svelte";
import type { PageProps } from "./$types";

let { data }: PageProps = $props();
const editor = getEditor();

// The canvas lives in the layout; the route only says which page it shows. Only the route's
// page ID is tracked: the editor may switch pages itself (to home, when the page is deleted).
$effect.pre(() => {
  const pageId = data.pageId;
  // `editor` can be missing for a moment while the dev server hot-reloads the layout.
  untrack(() => editor?.showPage(pageId));
});
</script>
