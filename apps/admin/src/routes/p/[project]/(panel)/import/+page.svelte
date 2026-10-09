<script lang="ts">
import type { LeftOut } from "@webmio/import";
import { getI18n } from "$lib/i18n";
import type { MessageKey } from "$lib/i18n/types";
import { projectPaths } from "$lib/project-paths";
import Badge from "$lib/ui/Badge.svelte";
import Button from "$lib/ui/Button.svelte";
import Card from "$lib/ui/Card.svelte";
import TabPanel from "$lib/ui/TabPanel.svelte";
import type { PageProps } from "./$types";

// The import review (site-import spec, "Import review"): what came over from the old website,
// what didn't and why, and what is left to do before publishing.
let { data }: PageProps = $props();
const i18n = getI18n();
const paths = $derived(projectPaths(data.project.id));
const report = $derived(data.report);
const errors = $derived(data.problems.filter((p) => p.severity === "error"));

/** What was left out, page by page: the site-wide ones first. */
const leftOutByPage = $derived.by(() => {
  const groups = new Map<string, LeftOut[]>();
  for (const item of report.leftOut) {
    const key = item.page ?? "";
    groups.set(key, [...(groups.get(key) ?? []), item]);
  }
  return [...groups].sort(([a], [b]) => (a === "" ? -1 : b === "" ? 1 : 0));
});
const reason = (item: LeftOut) =>
  i18n.t(`imports.reason.${item.reason}` as MessageKey, { detail: item.detail ?? "" });
const found = $derived(
  (["name", "phone", "email", "address", "hours"] as const).map((key) => ({
    key,
    found: report.business[key],
  })),
);
</script>

<svelte:head>
  <title>{i18n.t("common.pageTitle", { page: i18n.t("imports.review") })}</title>
</svelte:head>

<TabPanel>
  <section class="intro">
    <h2>{i18n.t("imports.review")}</h2>
    <p>{i18n.t("imports.reviewIntro", { address: report.address })}</p>
    <div class="actions">
      {#if !data.dismissed}
        <form method="POST" action="?/dismiss">
          <Button type="submit" icon="check">{i18n.t("imports.dismiss")}</Button>
        </form>
      {/if}
    </div>
  </section>

  <Card title={i18n.t("imports.imported")} id="imported" level={3}>
    <ul class="counts">
      <li>{i18n.t("imports.countPages", { count: report.pages.length })}</li>
      <li>{i18n.t("imports.countImages", { count: report.images })}</li>
      <li>{i18n.t("imports.countQuestions", { count: report.questions })}</li>
      <li>{i18n.t("imports.countProfiles", { count: report.socialProfiles })}</li>
    </ul>
    <p class="business">
      {i18n.t("imports.business")}
      {#each found as item (item.key)}
        <Badge status={item.found ? "success" : "neutral"}>{i18n.t(`imports.detail.${item.key}`)}</Badge>
      {/each}
      <a href={paths.business}>{i18n.t("imports.checkBusiness")}</a>
    </p>
    <table>
      <caption>{i18n.t("imports.pagesCaption")}</caption>
      <thead>
        <tr><th scope="col">{i18n.t("imports.page")}</th><th scope="col">{i18n.t("imports.oldAddress")}</th><th scope="col">{i18n.t("imports.newAddress")}</th></tr>
      </thead>
      <tbody>
        {#each report.pages as page (page.oldPath)}
          <tr><td>{page.title}</td><td><code>{page.oldPath}</code></td><td><code>{page.slug ? `/${page.slug}/` : "/"}</code></td></tr>
        {/each}
      </tbody>
    </table>
  </Card>

  {#if report.leftOut.length > 0}
    <Card title={i18n.t("imports.leftOut")} id="left-out" level={3}>
      {#each leftOutByPage as [page, items] (page)}
        <h4>{page ? i18n.t("imports.onPage", { page }) : i18n.t("imports.wholeSite")}</h4>
        <ul class="left-out">
          {#each items as item, i (i)}
            <li>{reason(item)}</li>
          {/each}
        </ul>
      {/each}
    </Card>
  {/if}

  <Card title={i18n.t("imports.toDo")} id="to-do" level={3}>
    {#if data.problems.length === 0}
      <p>{i18n.t("imports.nothingToDo")}</p>
    {:else}
      <p>{i18n.t("imports.problems", { errors: errors.length, total: data.problems.length })}</p>
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
    {/if}
  </Card>
</TabPanel>

<style>
  .intro h2 {
    margin: 0 0 var(--ui-space-2);
  }

  .intro p {
    margin: 0 0 var(--ui-space-3);
    color: var(--ui-muted);
  }

  .actions {
    display: flex;
    flex-wrap: wrap;
    gap: var(--ui-space-2);
    margin-bottom: var(--ui-space-5);
  }

  .counts {
    display: flex;
    flex-wrap: wrap;
    gap: var(--ui-space-2) var(--ui-space-5);
    margin: 0 0 var(--ui-space-3);
    padding: 0;
    list-style: none;
    font-weight: 600;
  }

  .business {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: var(--ui-space-2);
    margin: 0 0 var(--ui-space-4);
  }

  table {
    width: 100%;
    border-collapse: collapse;
    font-size: var(--ui-text-sm);
  }

  caption {
    text-align: left;
    font-weight: 600;
    margin-bottom: var(--ui-space-2);
  }

  th,
  td {
    text-align: left;
    padding: var(--ui-space-1) var(--ui-space-2);
    border-bottom: 1px solid var(--ui-border);
    overflow-wrap: anywhere;
  }

  h4 {
    margin: var(--ui-space-3) 0 var(--ui-space-1);
    font-size: var(--ui-text-md);
  }

  .left-out,
  .problems {
    margin: 0;
    padding-left: var(--ui-space-5);
  }

  .problems {
    list-style: none;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: var(--ui-space-2);
  }
</style>
