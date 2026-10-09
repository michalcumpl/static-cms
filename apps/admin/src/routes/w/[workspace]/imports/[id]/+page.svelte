<script lang="ts">
import { goto } from "$app/navigation";
import { getI18n } from "$lib/i18n";
import Button from "$lib/ui/Button.svelte";
import Card from "$lib/ui/Card.svelte";
import Notice from "$lib/ui/Notice.svelte";
import Page from "$lib/ui/Page.svelte";
import PageHeader from "$lib/ui/PageHeader.svelte";
import ProgressBar from "$lib/ui/ProgressBar.svelte";
import type { PageProps } from "./$types";

// What a running import is doing, updated every second; the review opens when it is done
// (site-import spec, "Import progress"). Leaving and coming back picks it up again.
let { data }: PageProps = $props();
const i18n = getI18n();
const POLL_MS = 1000;

type State = {
  state: "running" | "done" | "failed";
  progress: { phase: "pages" | "images" | "building"; done: number; total: number } | null;
  error: string | null;
  review: string | null;
};
let current = $state<State | undefined>();

$effect(() => {
  let timer: ReturnType<typeof setTimeout> | undefined;
  let stopped = false;
  const poll = async () => {
    const response = await fetch(`/api/imports/${data.importId}`).catch(() => undefined);
    if (stopped) return;
    if (response?.ok) current = await response.json();
    if (current?.state === "done" && current.review) {
      await goto(current.review);
      return;
    }
    if (current?.state !== "failed") timer = setTimeout(poll, POLL_MS);
  };
  void poll();
  return () => {
    stopped = true;
    clearTimeout(timer);
  };
});

/** How far the pages or images are; unknown while starting and building. */
const fraction = $derived.by(() => {
  const progress = current?.progress;
  if (!progress || progress.phase === "building" || progress.total === 0) return undefined;
  return progress.done / progress.total;
});
const step = $derived.by(() => {
  const progress = current?.progress;
  if (!progress) return i18n.t("imports.starting");
  if (progress.phase === "pages")
    return i18n.t("imports.pages", { done: progress.done, total: progress.total });
  if (progress.phase === "images")
    return i18n.t("imports.images", { done: progress.done, total: progress.total });
  return i18n.t("imports.building");
});
</script>

<svelte:head>
  <title>{i18n.t("common.pageTitle", { page: i18n.t("imports.title") })}</title>
</svelte:head>

<Page width="narrow">
  <PageHeader
    title={i18n.t("imports.title")}
    breadcrumb={[{ href: "/", label: i18n.t("projects.title") }]}
    breadcrumbLabel={i18n.t("common.breadcrumb")}
  />
  <Card>
    <p class="address">{data.address}</p>
    {#if current?.state === "failed"}
      <Notice kind="problem"><p>{current.error}</p></Notice>
      <div>
        <Button href={`/w/${data.workspaceId}/new`} icon="arrow-left">{i18n.t("imports.again")}</Button>
      </div>
    {:else}
      <p class="step" role="status">{step}</p>
      <div class="bar"><ProgressBar value={fraction} label={i18n.t("imports.title")} /></div>
      <p class="hint">{i18n.t("imports.leave")}</p>
    {/if}
  </Card>
</Page>

<style>
  .address {
    margin: 0 0 var(--ui-space-3);
    font-weight: 600;
    word-break: break-all;
  }

  .step {
    margin: 0 0 var(--ui-space-2);
  }

  .bar {
    margin-bottom: var(--ui-space-3);
  }

  .hint {
    margin: 0;
    color: var(--ui-muted);
    font-size: var(--ui-text-sm);
  }
</style>
