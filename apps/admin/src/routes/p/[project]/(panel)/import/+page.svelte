<script lang="ts">
import type { LeftOut } from "@webmio/import";
import { invalidateAll } from "$app/navigation";
import { getI18n } from "$lib/i18n";
import type { MessageKey } from "$lib/i18n/types";
import { projectPaths } from "$lib/project-paths";
import Badge from "$lib/ui/Badge.svelte";
import Button from "$lib/ui/Button.svelte";
import Card from "$lib/ui/Card.svelte";
import Notice from "$lib/ui/Notice.svelte";
import ProgressBar from "$lib/ui/ProgressBar.svelte";
import TabPanel from "$lib/ui/TabPanel.svelte";
import type { PageProps } from "./$types";

// The import review (site-import spec, "Import review"): what came over from the old website,
// what didn't and why, and what is left to do before publishing.
let { data, form }: PageProps = $props();
const i18n = getI18n();
const POLL_MS = 1000;
const paths = $derived(projectPaths(data.project.id));
const report = $derived(data.report);
const allProblems = $derived(data.problems.flatMap((g) => g.problems));
const errors = $derived(allProblems.filter((p) => p.severity === "error"));

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
// A running retry's progress, polled every second; the page's data reloads when it ends
// (import-review-actions design decision 5).
let live = $state<(typeof data)["retry"] | undefined>();
const retry = $derived(live ?? data.retry);
const running = $derived(retry?.state === "running");
$effect(() => {
  if (data.retry?.state !== "running") return;
  let stopped = false;
  let timer: ReturnType<typeof setTimeout> | undefined;
  const poll = async () => {
    const response = await fetch(`/api/projects/${data.project.id}/import-retry`).catch(
      () => undefined,
    );
    if (stopped) return;
    const body = response?.ok ? await response.json() : undefined;
    if (body?.retry) live = body.retry;
    if (body?.retry && body.retry.state !== "running") {
      await invalidateAll();
      live = undefined;
      return;
    }
    timer = setTimeout(poll, POLL_MS);
  };
  timer = setTimeout(poll, POLL_MS);
  return () => {
    stopped = true;
    clearTimeout(timer);
  };
});
const fraction = $derived.by(() => {
  const progress = retry?.progress;
  if (!progress || progress.phase === "building" || progress.total === 0) return undefined;
  return progress.done / progress.total;
});
const step = $derived.by(() => {
  const progress = retry?.progress;
  if (!progress) return i18n.t("imports.retrying");
  if (progress.phase === "pages")
    return i18n.t("imports.pages", { done: progress.done, total: progress.total });
  if (progress.phase === "images")
    return i18n.t("imports.images", { done: progress.done, total: progress.total });
  return i18n.t("imports.building");
});
/** What the last retry added, as sentences. */
const added = $derived.by(() => {
  const result = retry?.state === "done" ? retry.added : null;
  if (!result) return [];
  const said = [
    result.pages ? i18n.t("imports.retryPages", { count: result.pages }) : "",
    result.placed ? i18n.t("imports.retryPlaced", { count: result.placed }) : "",
    result.library ? i18n.t("imports.retryLibrary", { count: result.library }) : "",
  ].filter(Boolean);
  return said.length ? said : [i18n.t("imports.retryNothingNew")];
});
const formMessage = $derived(form && "message" in form ? form.message : undefined);

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

  {#if formMessage}
    <Notice kind="problem">{formMessage}</Notice>
  {/if}
  {#if running}
    <Notice kind="info">
      <span role="status">{i18n.t("imports.retrying")} {step}</span>
      <div class="retry-bar"><ProgressBar value={fraction} label={i18n.t("imports.retrying")} /></div>
    </Notice>
  {:else if retry?.state === "failed"}
    <Notice kind="problem">{retry.error}</Notice>
  {:else if added.length > 0}
    <Notice kind="success">{added.join(" ")}</Notice>
  {/if}

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
      {#if data.offers.again || data.offers.next > 0}
        <div class="actions">
          {#if data.offers.again}
            <form method="POST" action="?/retry">
              <input type="hidden" name="kind" value="again" />
              <Button type="submit" icon="history" disabled={running}>{i18n.t("imports.tryAgain")}</Button>
            </form>
          {/if}
          {#if data.offers.next > 0}
            <form method="POST" action="?/retry">
              <input type="hidden" name="kind" value="next" />
              <Button type="submit" icon="download" disabled={running}>
                {i18n.t("imports.nextPages", { count: data.offers.next })}
              </Button>
            </form>
          {/if}
        </div>
        {#if data.offers.again}<p class="hint">{i18n.t("imports.tryAgainHint")}</p>{/if}
      {/if}
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
    {#if allProblems.length === 0}
      <p>{i18n.t("imports.nothingToDo")}</p>
    {:else}
      <p>
        {errors.length === 0
          ? i18n.t("imports.suggestionsOnly", { count: allProblems.length })
          : i18n.t("imports.problems", { errors: errors.length, total: allProblems.length })}
      </p>
      {#if data.headingLevels > 0}
        <form method="POST" action="?/headings" class="fix">
          <Button type="submit" icon="check">{i18n.t("imports.headingLevels", { count: data.headingLevels })}</Button>
          <p class="hint">{i18n.t("imports.headingLevelsNote")}</p>
        </form>
      {/if}
      {#if data.decorative > 0}
        <form method="POST" action="?/decorative" class="fix">
          <Button type="submit" icon="image">{i18n.t("imports.decorative", { count: data.decorative })}</Button>
          <p class="hint">{i18n.t("imports.decorativeNote")}</p>
        </form>
      {/if}
      <ul class="problems">
        {#each data.problems as group, i (i)}
          <li>
            <Badge status={group.severity === "error" ? "problem" : "attention"}>
              {i18n.t(`project.severity.${group.severity}`)}
            </Badge>
            {#if group.problems.length === 1}
              <a href={group.href}>{group.problems[0]?.message}</a>
            {:else}
              {#if group.code === "no-description"}
                <a href={group.href}>{i18n.t("imports.noDescriptionGroup", { count: group.problems.length })}</a>
              {/if}
              <details>
                <summary>
                  {group.code === "no-description"
                    ? i18n.t("imports.showEach", { count: group.problems.length })
                    : i18n.t("imports.similarProblems", {
                        count: group.problems.length,
                        message: group.problems[0]?.message ?? "",
                      })}
                </summary>
                <ul>
                  {#each group.problems as problem, j (j)}
                    <li><a href={problem.href}>{problem.message}</a></li>
                  {/each}
                </ul>
              </details>
            {/if}
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

  .retry-bar {
    margin-top: var(--ui-space-2);
  }

  .hint {
    margin: 0 0 var(--ui-space-3);
    color: var(--ui-muted);
    font-size: var(--ui-text-sm);
  }

  .fix {
    margin-bottom: var(--ui-space-4);
  }

  .fix .hint {
    margin-top: var(--ui-space-2);
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

  .problems details {
    margin-top: var(--ui-space-1);
    font-size: var(--ui-text-sm);
  }

  .problems details ul {
    margin: var(--ui-space-1) 0 0;
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
