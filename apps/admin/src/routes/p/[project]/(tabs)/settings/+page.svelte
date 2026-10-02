<script lang="ts">
import SettingsScreen from "$lib/editor/SettingsScreen.svelte";
import { getI18n } from "$lib/i18n";
import TabPanel from "$lib/ui/TabPanel.svelte";
import type { PageProps } from "./$types";

// The site and business settings (project-page spec). A language is a different document, so
// choosing another one starts the screen over.
let { data }: PageProps = $props();
const i18n = getI18n();
</script>

<svelte:head>
  <title>{i18n.t("common.pageTitle", { page: i18n.t("project.tabTitle", { tab: i18n.t("project.tabs.settings"), project: data.project.name }) })}</title>
</svelte:head>

<TabPanel>
  {#key data.lang}
    <SettingsScreen
      projectId={data.project.id}
      site={data.site}
      translations={data.translations}
      lang={data.lang}
      primaryLang={data.primaryLang}
      languages={data.languages}
      focus={data.focus}
    />
  {/key}
</TabPanel>
