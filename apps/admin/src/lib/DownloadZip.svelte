<script lang="ts">
import { exportSiteLanguages, type LanguageDocument, zipFiles } from "@static-cms/site";
import { getI18n } from "$lib/i18n";
import { fontPath, type ProjectPaths } from "$lib/project-paths";
import Button from "$lib/ui/Button.svelte";
import Card from "$lib/ui/Card.svelte";
import Notice from "$lib/ui/Notice.svelte";

// The published languages as a ZIP of the static site, built entirely in the browser from the
// saved documents, the project's images and the site fonts (project-page spec, "Publishing tab").
let { paths, blockedReason }: { paths: ProjectPaths; blockedReason?: string } = $props();
const i18n = getI18n();

let downloading = $state(false);
let downloadError = $state("");

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

<Card title={i18n.t("project.export")} id="export">
  <p class="muted">{i18n.t("project.exportText")}</p>
  <div>
    <Button
      icon="download"
      onclick={downloadZip}
      disabled={downloading || Boolean(blockedReason)}
      title={blockedReason}
    >
      {downloading ? i18n.t("project.building") : i18n.t("project.downloadZip")}
    </Button>
  </div>
  {#if blockedReason}
    <p class="muted">{blockedReason}</p>
  {/if}
  {#if downloadError}
    <Notice kind="problem"><p>{downloadError}</p></Notice>
  {/if}
</Card>

<style>
  p {
    margin: 0;
  }

  .muted {
    color: var(--ui-muted);
  }
</style>
