<script lang="ts">
import { onDestroy, onMount } from "svelte";
import { getI18n } from "$lib/i18n";
import PublishButton from "$lib/PublishButton.svelte";
import { projectPaths } from "$lib/project-paths";
import { Publishing } from "$lib/publishing.svelte";
import Badge from "$lib/ui/Badge.svelte";
import Card from "$lib/ui/Card.svelte";
import Notice from "$lib/ui/Notice.svelte";
import TabPanel from "$lib/ui/TabPanel.svelte";
import type { PageProps } from "./$types";

// How the project stands (project-page spec, "Overview tab"): its address and last publish, the
// Publish button, whether the saved site is valid, its languages and when it was last saved.
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
const address = $derived(publishing.info?.address);
const when = (iso: string) => i18n.formatDate(iso);
</script>

<svelte:head>
  <title>{i18n.t("common.pageTitle", { page: i18n.t("project.tabTitle", { tab: i18n.t("project.tabs.overview"), project: data.project.name }) })}</title>
</svelte:head>

<TabPanel>
  <Card title={i18n.t("project.overview.site")} id="site">
    <dl class="facts">
      <div>
        <dt>{i18n.t("project.overview.address")}</dt>
        <dd>
          {#if address}
            <a href={address} target="_blank" rel="noopener">{address.replace(/^https:\/\//, "")}</a>
          {:else if publishing.info}
            {i18n.t("project.overview.notPublished")}
          {/if}
        </dd>
      </div>
      {#if latest}
        <div>
          <dt>{i18n.t("project.overview.lastPublish")}</dt>
          <dd>
            <Badge status={latest.state === "ready" ? "success" : latest.state === "failed" ? "problem" : "neutral"}>
              {i18n.t(`project.overview.state.${latest.state}`)}
            </Badge>
            {when(latest.finishedAt ?? latest.startedAt)}
            · <a href={paths.publishing}>{i18n.t("project.publishingLink")}</a>
          </dd>
        </div>
      {/if}
      {#if data.lastSaved}
        <div>
          <dd class="muted">
            {data.lastSaved.by
              ? i18n.t("project.overview.lastSavedBy", { date: when(data.lastSaved.at), person: data.lastSaved.by })
              : i18n.t("project.overview.lastSaved", { date: when(data.lastSaved.at) })}
          </dd>
        </div>
      {/if}
    </dl>
    <div>
      <PublishButton
        {paths}
        {publishing}
        blockedReason={data.valid ? undefined : i18n.t("publish.fixProblems")}
      />
    </div>
  </Card>

  <Card title={i18n.t("project.validation")} id="validation">
    {#if data.valid}
      <Notice kind="success">
        <p>
          {warnings.length > 0
            ? i18n.t("project.validWithWarnings", { count: warnings.length })
            : i18n.t("project.valid")}
        </p>
      </Notice>
    {:else}
      <Notice kind="problem"><p>{i18n.t("project.invalid", { count: errors.length })}</p></Notice>
    {/if}
    {#if data.problems.length > 0}
      <ul class="problems">
        {#each data.problems as problem, i (i)}
          <li>
            <Badge status={problem.severity === "error" ? "problem" : "attention"}>
              {i18n.t(`project.severity.${problem.severity}`)}
            </Badge>
            <span>{problem.message} <code>{problem.code}</code></span>
          </li>
        {/each}
      </ul>
    {/if}
  </Card>

  <Card title={i18n.t("languages.title")} id="languages">
    <ul class="languages">
      {#each data.languages as language (language.lang)}
        <li>
          <span>{language.name}</span>
          {#if language.primary}<Badge status="neutral">{i18n.t("languages.primary")}</Badge>{/if}
          <Badge status={language.published ? "success" : "attention"}>
            {language.published ? i18n.t("languages.published") : i18n.t("languages.hidden")}
          </Badge>
        </li>
      {/each}
    </ul>
  </Card>
</TabPanel>

<style>
  p {
    margin: 0;
  }

  .facts {
    display: flex;
    flex-direction: column;
    gap: var(--ui-space-3);
    margin: 0;
  }

  .facts div {
    display: flex;
    flex-wrap: wrap;
    gap: var(--ui-space-3);
    align-items: baseline;
  }

  dt {
    min-width: 9rem;
    font-weight: 600;
  }

  dd {
    margin: 0;
  }

  .muted {
    color: var(--ui-muted);
    font-size: var(--ui-text-sm);
  }

  .problems,
  .languages {
    display: flex;
    flex-direction: column;
    gap: var(--ui-space-2);
    margin: 0;
    padding: 0;
    list-style: none;
  }

  .problems li,
  .languages li {
    display: flex;
    gap: var(--ui-space-3);
    align-items: baseline;
  }

  code {
    font-size: var(--ui-text-xs);
    color: var(--ui-muted);
  }
</style>
