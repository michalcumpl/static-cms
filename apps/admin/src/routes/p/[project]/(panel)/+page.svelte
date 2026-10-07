<script lang="ts">
import { onDestroy, onMount } from "svelte";
import { getI18n } from "$lib/i18n";
import PublishButton from "$lib/PublishButton.svelte";
import DesignCard from "$lib/panel/DesignCard.svelte";
import { projectPaths } from "$lib/project-paths";
import { Publishing } from "$lib/publishing.svelte";
import Badge from "$lib/ui/Badge.svelte";
import Card from "$lib/ui/Card.svelte";
import Notice from "$lib/ui/Notice.svelte";
import TabPanel from "$lib/ui/TabPanel.svelte";
import type { PageProps } from "./$types";

// "Overview" (project-page spec, "Dashboard"): the site's state and the Publish button, the
// saved site's problems, each leading to where it's fixed, and one card per section.
let { data }: PageProps = $props();
const i18n = getI18n();
const paths = $derived(projectPaths(data.project.id));
// svelte-ignore state_referenced_locally
const publishing = new Publishing(projectPaths(data.project.id));
onMount(() => void publishing.refresh());
onDestroy(() => publishing.stop());

const errors = $derived(data.problems.filter((p) => p.severity === "error"));
const warnings = $derived(data.problems.filter((p) => p.severity === "warning"));
const latest = $derived(publishing.latest);
const info = $derived(publishing.info);
const summary = $derived(data.summary);
const when = (iso: string) => i18n.formatDate(iso);
const logoUrl = $derived(
  data.design.logo
    ? paths.image(data.design.logo.src, data.design.logo.width, "thumbnail")
    : undefined,
);
const editDesign = $derived(`${paths.edit()}?tab=theme`);
// Until the What you offer and About you sections exist, their cards open the editor where
// those items are (control-panel design decision 1).
const offerHref = $derived(paths.edit(summary.offerPageId));
const aboutHref = $derived(paths.edit(summary.aboutPageId));
</script>

<svelte:head>
  <title>{i18n.t("common.pageTitle", { page: i18n.t("project.tabTitle", { tab: i18n.t("project.sections.dashboard"), project: data.project.name }) })}</title>
</svelte:head>

<TabPanel>
  <section class="hero" aria-label={i18n.t("project.sections.dashboard")}>
    <div>
      <h2>{summary.siteName}</h2>
      <p class="state">
        {#if info?.address}
          <Badge status="success">{i18n.t("dashboard.live")}</Badge>
          <a href={info.address} target="_blank" rel="noopener">{info.address.replace(/^https:\/\//, "")}</a>
        {:else if info}
          <Badge status="neutral">{i18n.t("dashboard.notPublished")}</Badge>
        {/if}
      </p>
    </div>
    <PublishButton {paths} {publishing} blockedReason={data.valid ? undefined : i18n.t("publish.fixProblems")} />
  </section>

  {#if info && !info.connected}
    <Notice kind="attention">
      <p role="status">{i18n.t("publishing.notConnected")}</p>
      <p><a href="/w/{data.workspace.id}/hosting">{i18n.t("publishing.hostingLink")}</a></p>
    </Notice>
  {/if}

  {#if data.problems.length > 0}
    <Card title={i18n.t("dashboard.problems")} id="problems">
      {#if data.valid}
        <p>{i18n.t("project.validWithWarnings", { count: warnings.length })}</p>
      {:else}
        <Notice kind="problem"><p>{i18n.t("project.invalid", { count: errors.length })}</p></Notice>
      {/if}
      <ul class="problems">
        {#each data.problems as problem, i (i)}
          <li>
            <Badge status={problem.severity === "error" ? "problem" : "attention"}>
              {i18n.t(`project.severity.${problem.severity}`)}
            </Badge>
            <a href={problem.href}>{problem.message}</a>
          </li>
        {/each}
      </ul>
    </Card>
  {/if}

  <div class="cards">
    <div class="column">
      <Card title={i18n.t("project.sections.business")} id="business-card">
        <p>{summary.businessName}{summary.mainCity ? ` · ${summary.mainCity}` : ""}</p>
        {#if summary.locations > 1}<p class="muted">{i18n.t("dashboard.locations", { count: summary.locations })}</p>{/if}
        <a href={paths.business}>{i18n.t("dashboard.open", { section: i18n.t("project.sections.business") })}</a>
      </Card>
      <Card title={i18n.t("dashboard.offer")} id="offer-card">
        <p>{i18n.t("dashboard.services", { count: summary.services })} · {i18n.t("dashboard.questions", { count: summary.questions })}</p>
        <a href={offerHref}>{i18n.t("dashboard.editOnPage")}</a>
      </Card>
      <Card title={i18n.t("dashboard.about")} id="about-card">
        <p>{i18n.t("dashboard.people", { count: summary.people })} · {i18n.t("dashboard.testimonials", { count: summary.testimonials })}</p>
        <a href={aboutHref}>{i18n.t("dashboard.editOnPage")}</a>
      </Card>
    </div>
    <div class="column">
      <Card title={i18n.t("project.sections.website")} id="website-card">
        <p>
          {i18n.t("panel.website.pages", { count: summary.pages })} · {data.languages.map((l) => l.name).join(", ")}
        </p>
        <p class="muted">{info?.domain ?? info?.address ?? i18n.t("dashboard.notPublished")}</p>
        <DesignCard design={data.design} {logoUrl} editHref={editDesign} />
        <a href={paths.website}>{i18n.t("dashboard.open", { section: i18n.t("project.sections.website") })}</a>
      </Card>
      <Card title={i18n.t("project.sections.publish")} id="publish-card">
        {#if latest}
          <p>
            <Badge status={latest.state === "ready" ? "success" : latest.state === "failed" ? "problem" : "neutral"}>
              {i18n.t(`project.overview.state.${latest.state}`)}
            </Badge>
            {when(latest.finishedAt ?? latest.startedAt)}
          </p>
        {:else if info}
          <p class="muted">{i18n.t("dashboard.notPublished")}</p>
        {/if}
        <a href={paths.publishPage}>{i18n.t("dashboard.open", { section: i18n.t("project.sections.publish") })}</a>
      </Card>
    </div>
  </div>
</TabPanel>

<style>
  p {
    margin: 0;
  }

  .hero {
    display: flex;
    flex-wrap: wrap;
    justify-content: space-between;
    align-items: center;
    gap: var(--ui-space-4);
    padding: var(--ui-space-5);
    border-radius: var(--ui-radius-card);
    background: var(--ui-soft);
  }

  .hero h2 {
    margin: 0 0 var(--ui-space-2);
  }

  .state {
    display: flex;
    gap: var(--ui-space-2);
    align-items: center;
  }

  .muted {
    color: var(--ui-muted);
  }

  .problems {
    display: flex;
    flex-direction: column;
    gap: var(--ui-space-2);
    margin: 0;
    padding: 0;
    list-style: none;
  }

  .problems li {
    display: flex;
    gap: var(--ui-space-3);
    align-items: baseline;
  }

  /* Two stacks instead of grid rows, so the tall Website card leaves no gaps: the business's
     facts on the left, the site and its publishing on the right. */
  .cards {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(20rem, 1fr));
    gap: var(--ui-space-4);
    align-items: start;
  }

  .column {
    display: flex;
    flex-direction: column;
    gap: var(--ui-space-4);
  }
</style>
