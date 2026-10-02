<script lang="ts">
import { getI18n } from "$lib/i18n";
import LanguagesSection from "$lib/LanguagesSection.svelte";
import { projectPaths } from "$lib/project-paths";
import TabPanel from "$lib/ui/TabPanel.svelte";
import type { PageProps } from "./$types";

// Adding, publishing, hiding and removing languages, and what each still needs translated.
let { data }: PageProps = $props();
const i18n = getI18n();
</script>

<svelte:head>
  <title>{i18n.t("common.pageTitle", { page: i18n.t("project.tabTitle", { tab: i18n.t("project.tabs.languages"), project: data.project.name }) })}</title>
</svelte:head>

<TabPanel>
  <LanguagesSection
    projectId={data.project.id}
    paths={projectPaths(data.project.id)}
    languages={data.languages}
    translations={data.translations}
  />
</TabPanel>
