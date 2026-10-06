<script lang="ts">
import { onDestroy, onMount } from "svelte";
import DownloadZip from "$lib/DownloadZip.svelte";
import { getI18n } from "$lib/i18n";
import PublishButton from "$lib/PublishButton.svelte";
import { projectPaths } from "$lib/project-paths";
import { Publishing } from "$lib/publishing.svelte";
import Badge from "$lib/ui/Badge.svelte";
import Button from "$lib/ui/Button.svelte";
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

const when = (iso: string) => i18n.formatDate(iso);
</script>

<svelte:head>
  <title>{i18n.t("common.pageTitle", { page: i18n.t("publishing.pageTitle", { project: data.project.name }) })}</title>
</svelte:head>

<TabPanel>
  {#if info?.connected}
    <p class="team">{i18n.t("publishing.team", { team: info.team ?? "" })}</p>
  {/if}

  {#if info && !info.connected}
    <Notice kind="attention">
      <p role="status">{i18n.t("publishing.notConnected")}</p>
      <p><a href="/w/{data.workspace.id}/hosting">{i18n.t("publishing.hostingLink")}</a></p>
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
      <ul class="history">
        {#each info.publishes as publish (publish.id)}
          <li class={publish.state}>
            <span>{when(publish.startedAt)}</span>
            <span class="muted">{publish.publishedBy ?? "–"}</span>
            {#if publish.state === "running"}
              <Badge status="attention">{i18n.t("publishing.running")}</Badge>
            {:else if publish.state === "failed"}
              <span class="error">{i18n.t("publishing.failed", { error: publish.error ?? "" })}</span>
            {:else if publish.live}
              <Badge status="success">{i18n.t("publishing.live")}</Badge>
            {:else}
              <Button size="sm" onclick={() => makeLive(publish.id)} disabled={busy}>{i18n.t("publishing.makeLive")}</Button>
            {/if}
          </li>
        {/each}
      </ul>
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

  .error {
    color: var(--ui-problem);
  }








  .more {
    font-size: var(--ui-text-sm);
  }

  .history {
    display: flex;
    flex-direction: column;
    gap: var(--ui-space-2);
    margin: 0;
    padding: 0;
    list-style: none;
  }

  .history li {
    display: grid;
    grid-template-columns: 11rem 1fr auto;
    align-items: center;
    gap: var(--ui-space-3);
  }
</style>
