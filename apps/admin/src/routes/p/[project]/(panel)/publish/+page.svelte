<script lang="ts">
import { onDestroy, onMount } from "svelte";
import DownloadZip from "$lib/DownloadZip.svelte";
import { getI18n } from "$lib/i18n";
import PublishButton from "$lib/PublishButton.svelte";
import PublishHistory from "$lib/panel/PublishHistory.svelte";
import { projectPaths } from "$lib/project-paths";
import { Publishing } from "$lib/publishing.svelte";
import Card from "$lib/ui/Card.svelte";
import Notice from "$lib/ui/Notice.svelte";
import TabPanel from "$lib/ui/TabPanel.svelte";
import type { PageProps } from "./$types";

let { data }: PageProps = $props();
const i18n = getI18n();
const paths = $derived(projectPaths(data.project.id));
// svelte-ignore state_referenced_locally
const publishing = new Publishing(projectPaths(data.project.id));
const info = $derived(publishing.info);

let busy = $state(false);

onMount(() => publishing.refresh());
onDestroy(() => publishing.stop());

async function send(url: string, method: string): Promise<string | undefined> {
  busy = true;
  try {
    const response = await fetch(url, { method });
    if (!response.ok) {
      return (
        ((await response.json().catch(() => ({}))) as { message?: string }).message ??
        i18n.t("publishing.requestFailed", { status: response.status })
      );
    }
    await publishing.refresh();
    return undefined;
  } finally {
    busy = false;
  }
}

let restoreError = $state("");
async function makeLive(id: string) {
  restoreError = (await send(paths.restore(id), "POST")) ?? "";
}
</script>

<svelte:head>
  <title>{i18n.t("common.pageTitle", { page: i18n.t("publishing.pageTitle", { project: data.project.name }) })}</title>
</svelte:head>

<TabPanel>
  {#if info?.provider === "webmio"}
    <p class="team">{i18n.t("publishing.hostedByWebmio")}</p>
  {:else if info?.team}
    <p class="team">{i18n.t("publishing.team", { team: info.team })}</p>
  {/if}

  {#if info && !info.canPublish}
    <Notice kind="attention">
      {#if info.provider === "webmio"}
        <p role="status">{i18n.t("publishing.hostingNotSetUp")}</p>
      {:else}
        <p role="status">{i18n.t("publishing.notConnected")}</p>
        <p><a href="/w/{data.workspace.id}/hosting">{i18n.t("publishing.hostingLink")}</a></p>
      {/if}
    </Notice>
  {/if}

  <Card title={i18n.t("publishing.address")} id="address">
    {#if info?.address}
      <p><a href={info.address} target="_blank" rel="noopener">{info.address}</a></p>
    {:else}
      <p class="muted">{i18n.t("publishing.notPublished")}</p>
    {/if}
    <div><PublishButton {paths} {publishing} /></div>
  </Card>

  <nav class="more" aria-label={i18n.t("panel.publish.more")}>
    <a href={paths.domainPage}>{i18n.t("panel.publish.domainLink")}</a>
    ·
    <a href={paths.versionsPage}>{i18n.t("panel.publish.versionsLink")}</a>
  </nav>

  <Card title={i18n.t("publishing.history")} id="history">
    {#if !info || info.publishes.length === 0}
      <p class="muted">{i18n.t("publishing.nothing")}</p>
    {:else}
      <PublishHistory publishes={info.publishes} {busy} onMakeLive={makeLive} />
    {/if}
    {#if restoreError}<Notice kind="problem"><p>{restoreError}</p></Notice>{/if}
  </Card>

  <DownloadZip {paths} blockedReason={data.valid ? undefined : i18n.t("publish.fixProblems")} />
</TabPanel>

<style>
  p {
    margin: 0;
  }

  .team {
    color: var(--ui-muted);
  }

  .muted {
    color: var(--ui-muted);
  }

  .more {
    font-size: var(--ui-text-sm);
  }
</style>
