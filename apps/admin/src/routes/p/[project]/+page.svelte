<script lang="ts">
import { exportSiteLanguages, type LanguageDocument, zipFiles } from "@static-cms/site";
import { getI18n } from "$lib/i18n";
import LanguagesSection from "$lib/LanguagesSection.svelte";
import PublishButton from "$lib/PublishButton.svelte";
import { fontPath, projectPaths } from "$lib/project-paths";
import Badge from "$lib/ui/Badge.svelte";
import Button from "$lib/ui/Button.svelte";
import Card from "$lib/ui/Card.svelte";
import Notice from "$lib/ui/Notice.svelte";
import Page from "$lib/ui/Page.svelte";
import PageHeader from "$lib/ui/PageHeader.svelte";
import type { PageProps } from "./$types";

let { data }: PageProps = $props();
const i18n = getI18n();
const paths = $derived(projectPaths(data.project.id));
const errors = $derived(data.problems.filter((p) => p.severity === "error"));
const warnings = $derived(data.problems.filter((p) => p.severity === "warning"));

let downloading = $state(false);
let downloadError = $state("");

/**
 * Builds the ZIP entirely in the browser, from the published languages' saved documents, the
 * project's images and the site fonts.
 */
async function downloadZip() {
  downloading = true;
  downloadError = "";
  try {
    const input = (await (await fetch(paths.exportInput)).json()) as {
      languages: LanguageDocument[];
      mediaFiles: string[];
      fontFiles: string[];
    };
    const media = new Map<string, Uint8Array>();
    for (const name of input.mediaFiles) {
      const response = await fetch(paths.media(name));
      media.set(name, new Uint8Array(await response.arrayBuffer()));
    }
    const fonts = new Map<string, Uint8Array>();
    for (const name of input.fontFiles) {
      const response = await fetch(fontPath(name));
      fonts.set(name, new Uint8Array(await response.arrayBuffer()));
    }
    const result = exportSiteLanguages(input.languages, media, { fonts });
    if (!result.ok) {
      downloadError = result.problems.map((p) => p.message).join(" ");
      return;
    }
    const zip = zipFiles(result.files);
    const url = URL.createObjectURL(new Blob([zip], { type: "application/zip" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = "website.zip";
    link.click();
    URL.revokeObjectURL(url);
  } catch (err) {
    downloadError = err instanceof Error ? err.message : String(err);
  } finally {
    downloading = false;
  }
}
</script>

<svelte:head>
  <title>{i18n.t("common.pageTitle", { page: data.project.name })}</title>
</svelte:head>

<Page>
  <PageHeader
    title={data.project.name}
    breadcrumb={[{ href: "/", label: i18n.t("projects.title") }]}
    breadcrumbLabel={i18n.t("common.breadcrumb")}
  >
    {#snippet actions()}
      <Button href={paths.history} icon="history">{i18n.t("project.history")}</Button>
      <Button href={paths.preview} icon="eye">{i18n.t("project.preview")}</Button>
      <Button href={paths.edit()} kind="primary" icon="pencil">{i18n.t("project.openEditor")}</Button>
    {/snippet}
  </PageHeader>

  <Card title={i18n.t("project.publishing")} id="publishing">
    <div><PublishButton {paths} /></div>
    <p><a href={paths.publishing}>{i18n.t("project.publishingLink")}</a></p>
  </Card>

  <LanguagesSection
    projectId={data.project.id}
    {paths}
    languages={data.languages}
    translations={data.translations}
  />

  <Card title={i18n.t("project.validation")} id="validation">
    {#if data.valid}
      <Notice kind="success">
        <p class="ok">
          {warnings.length > 0
            ? i18n.t("project.validWithWarnings", { count: warnings.length })
            : i18n.t("project.valid")}
        </p>
      </Notice>
    {:else}
      <Notice kind="problem"><p class="bad">{i18n.t("project.invalid", { count: errors.length })}</p></Notice>
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

  <Card title={i18n.t("project.pages")} id="pages">
    <ul class="pages">
      {#each data.pages as page (page.id)}
        <li><a href={page.url} data-sveltekit-reload>{page.path}</a></li>
      {/each}
    </ul>
  </Card>

  <Card title={i18n.t("project.export")} id="export">
    <p class="muted">{i18n.t("project.exportText")}</p>
    <div>
      <Button icon="download" onclick={downloadZip} disabled={downloading || !data.valid}>
        {downloading ? i18n.t("project.building") : i18n.t("project.downloadZip")}
      </Button>
    </div>
    {#if downloadError}
      <Notice kind="problem"><p class="bad">{downloadError}</p></Notice>
    {/if}
  </Card>
</Page>

<style>
  p {
    margin: 0;
  }

  .muted {
    color: var(--ui-muted);
  }

  .problems,
  .pages {
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

  code {
    font-size: var(--ui-text-xs);
    color: var(--ui-muted);
  }
</style>
