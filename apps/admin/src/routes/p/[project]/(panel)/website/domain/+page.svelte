<script lang="ts">
import { onDestroy } from "svelte";
import { getI18n } from "$lib/i18n";
import DomainPanel from "$lib/panel/DomainPanel.svelte";
import { projectPaths } from "$lib/project-paths";
import { Publishing } from "$lib/publishing.svelte";
import Card from "$lib/ui/Card.svelte";
import TabPanel from "$lib/ui/TabPanel.svelte";
import type { PageProps } from "./$types";

// The Domain page (project-page spec, "Domain page"): the site's address and its custom domain.
let { data }: PageProps = $props();
const i18n = getI18n();
const paths = $derived(projectPaths(data.project.id));
// svelte-ignore state_referenced_locally
const publishing = new Publishing(projectPaths(data.project.id));
const info = $derived(publishing.info);
onDestroy(() => publishing.stop());
</script>

<svelte:head>
  <title>{i18n.t("common.pageTitle", { page: i18n.t("project.tabTitle", { tab: i18n.t("project.subpages.domain"), project: data.project.name }) })}</title>
</svelte:head>

<TabPanel>
  <Card title={i18n.t("publishing.address")} id="address">
    {#if info?.address}
      <p><a href={info.address} target="_blank" rel="noopener">{info.address}</a></p>
    {:else}
      <p class="muted">{i18n.t("publishing.notPublished")}</p>
    {/if}
  </Card>
  <DomainPanel {paths} {publishing} />
</TabPanel>

<style>
  p {
    margin: 0;
  }

  .muted {
    color: var(--ui-muted);
  }
</style>
