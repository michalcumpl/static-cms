<script lang="ts">
import { getEditor } from "$lib/editor/state.svelte";
import type { PageProps } from "./$types";

let { data }: PageProps = $props();
const editor = getEditor();

// The canvas lives in the layout; the route only says which page it shows.
$effect.pre(() => {
  // `editor` can be missing for a moment while the dev server hot-reloads the layout.
  editor?.showPage(data.pageIndex);
});
</script>
