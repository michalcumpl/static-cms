<script lang="ts">
import "@fontsource-variable/dm-sans";
import "$lib/ui/tokens.css";
import { untrack } from "svelte";
import { page } from "$app/state";
import { setI18n } from "$lib/i18n";
import AppBar from "$lib/ui/AppBar.svelte";
import type { LayoutProps } from "./$types";

// The shell around every page (admin-foundation design.md decision 4).
let { data, children }: LayoutProps = $props();

const i18n = setI18n(untrack(() => data.locale));
$effect.pre(() => {
  i18n.locale = data.locale;
});
// The switch changes the language without a new page from the server: keep `lang` in step.
$effect(() => {
  document.documentElement.lang = i18n.locale;
});

// The editor keeps the window for the canvas: a slimmer bar.
const compact = $derived(page.route.id?.startsWith("/p/[project]/edit") ?? false);
</script>

<AppBar
  user={data.user}
  workspaces={data.workspaces}
  currentWorkspaceId={data.currentWorkspaceId}
  {compact}
  onlanguage={(locale) => (i18n.locale = locale)}
/>
{@render children()}
