<script lang="ts">
import { browser } from "$app/environment";
import SectionScreen from "$lib/editor/SectionScreen.svelte";
import { getI18n } from "$lib/i18n";
import DesignCard from "$lib/panel/DesignCard.svelte";
import { designSummary, siteSummary } from "$lib/panel/summary";
import { projectPaths } from "$lib/project-paths";
import TabPanel from "$lib/ui/TabPanel.svelte";
import type { PageProps } from "./$types";

// The Website section (project-page spec, "Website section"): the site's settings, saved like
// the Business section; the design at a glance; and its subpages, each with a summary.
let { data }: PageProps = $props();
const i18n = getI18n();

const paths = $derived(
  projectPaths(data.project.id, data.lang === data.primaryLang ? undefined : data.lang),
);
// biome-ignore lint/suspicious/noExplicitAny: the saved document, read loosely for the summaries.
const doc = $derived(data.site.document as any);
const design = $derived(designSummary(doc));
const summary = $derived(siteSummary(doc));
const logoUrl = $derived(
  design.logo ? paths.image(design.logo.src, design.logo.width, "thumbnail") : undefined,
);
const editDesign = $derived(`${paths.edit()}${paths.edit().includes("?") ? "&" : "?"}tab=theme`);
</script>

<svelte:head>
  <title>{i18n.t("common.pageTitle", { page: i18n.t("project.tabTitle", { tab: i18n.t("project.sections.website"), project: data.project.name }) })}</title>
</svelte:head>

<TabPanel>
  <!-- The section edits through the editor's session, which only runs in the browser; the server
       renders the frame, so the project's access check answers first (control-panel decision 2). -->
  {#if browser}
  {#key data.lang}
    <SectionScreen
      section="site"
      projectId={data.project.id}
      site={data.site}
      translations={data.translations}
      lang={data.lang}
      primaryLang={data.primaryLang}
      languages={data.languages}
      focus={data.focus}
    >
      <div class="side">
        <div class="card"><DesignCard {design} {logoUrl} editHref={editDesign} /></div>
        <nav class="card subpages" aria-label={i18n.t("panel.website.more")}>
          <ul>
            <li>
              <a href={paths.websitePages}>{i18n.t("project.subpages.pages")}</a>
              <span>{i18n.t("panel.website.pages", { count: summary.pages })}</span>
            </li>
            <li>
              <a href={paths.websiteLanguages}>{i18n.t("project.subpages.languages")}</a>
              <span>{data.languages.map((l) => l.name).join(", ")}</span>
            </li>
            <li>
              <a href={paths.domainPage}>{i18n.t("project.subpages.domain")}</a>
              <span>{data.domain ?? data.address ?? i18n.t("panel.website.noDomain")}</span>
            </li>
          </ul>
        </nav>
      </div>
    </SectionScreen>
  {/key}
  {/if}
</TabPanel>

<style>
  .side {
    display: flex;
    flex-direction: column;
    gap: var(--ui-space-5);
  }

  .card {
    padding: var(--ui-space-4);
    border: 1px solid var(--ui-border);
    border-radius: var(--ui-radius-card);
    background: var(--ui-surface);
    box-shadow: var(--ui-shadow);
  }

  .subpages ul {
    display: flex;
    flex-direction: column;
    gap: var(--ui-space-3);
    margin: 0;
    padding: 0;
    list-style: none;
  }

  .subpages li {
    display: flex;
    flex-direction: column;
  }

  .subpages span {
    color: var(--ui-muted);
    font-size: var(--ui-text-sm);
  }
</style>
