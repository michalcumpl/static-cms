<script lang="ts">
import { browser } from "$app/environment";
import SectionScreen from "$lib/editor/SectionScreen.svelte";
import { getI18n } from "$lib/i18n";
import TabPanel from "$lib/ui/TabPanel.svelte";
import type { PageProps } from "./$types";

// The What you offer section (project-page spec): the services and the questions, as list forms.
// A language is a different document, so choosing another one starts the screen over.
let { data }: PageProps = $props();
const i18n = getI18n();
</script>

<svelte:head>
  <title>{i18n.t("common.pageTitle", { page: i18n.t("project.tabTitle", { tab: i18n.t("project.sections.offer"), project: data.project.name }) })}</title>
</svelte:head>

<TabPanel>
  <!-- The section edits through the editor's session, which only runs in the browser; the server
       renders the frame, so the project's access check answers first (control-panel decision 2). -->
  {#if browser}
  {#key data.lang}
    <SectionScreen
      section="offer"
      projectId={data.project.id}
      site={data.site}
      translations={data.translations}
      lang={data.lang}
      primaryLang={data.primaryLang}
      languages={data.languages}
      focus={data.focus}
    />
  {/key}
  {/if}
</TabPanel>
