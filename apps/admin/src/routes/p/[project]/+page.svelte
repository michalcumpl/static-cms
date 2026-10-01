<script lang="ts">
import { exportSiteLanguages, type LanguageDocument, zipFiles } from "@static-cms/site";
import LanguagesSection from "$lib/LanguagesSection.svelte";
import PublishButton from "$lib/PublishButton.svelte";
import { projectPaths } from "$lib/project-paths";
import type { PageProps } from "./$types";

let { data }: PageProps = $props();
const paths = $derived(projectPaths(data.project.id));
const errors = $derived(data.problems.filter((p) => p.severity === "error"));
const warnings = $derived(data.problems.filter((p) => p.severity === "warning"));

let downloading = $state(false);
let downloadError = $state("");

/**
 * Builds the ZIP entirely in the browser, from the published languages' saved documents and the
 * project's images.
 */
async function downloadZip() {
  downloading = true;
  downloadError = "";
  try {
    const input = (await (await fetch(paths.exportInput)).json()) as {
      languages: LanguageDocument[];
      mediaFiles: string[];
    };
    const media = new Map<string, Uint8Array>();
    for (const name of input.mediaFiles) {
      const response = await fetch(paths.media(name));
      media.set(name, new Uint8Array(await response.arrayBuffer()));
    }
    const result = exportSiteLanguages(input.languages, media);
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
  <title>{data.project.name} – Static CMS</title>
</svelte:head>

<main>
  <p class="crumbs"><a href="/">← All projects</a></p>
  <h1>{data.project.name}</h1>
  <p><a href={paths.edit()}>Open the editor</a> · <a href={paths.preview}>Preview</a></p>

  <section aria-labelledby="publishing">
    <h2 id="publishing">Publishing</h2>
    <PublishButton {paths} />
    <p><a href={paths.publishing}>Address, domain and history</a></p>
  </section>

  <LanguagesSection projectId={data.project.id} {paths} languages={data.languages} />

  <section aria-labelledby="validation">
    <h2 id="validation">Validation</h2>
    {#if data.valid}
      <p class="ok">Valid{#if warnings.length > 0}, with {warnings.length} warning(s){/if}.</p>
    {:else}
      <p class="bad">{errors.length} error(s) — the site can't be rendered.</p>
    {/if}
    {#if data.problems.length > 0}
      <ul>
        {#each data.problems as problem, i (i)}
          <li>
            <strong>{problem.severity}</strong>
            <code>{problem.code}</code>
            {problem.message}
          </li>
        {/each}
      </ul>
    {/if}
  </section>

  <section aria-labelledby="pages">
    <h2 id="pages">Pages</h2>
    <ul>
      {#each data.pages as page (page.id)}
        <li><a href={page.url} data-sveltekit-reload>{page.path}</a></li>
      {/each}
    </ul>
  </section>

  <section aria-labelledby="export">
    <h2 id="export">Export</h2>
    <p>The ZIP is built in your browser with the same code the server uses.</p>
    <button type="button" onclick={downloadZip} disabled={downloading || !data.valid}>
      {downloading ? "Building…" : "Download ZIP"}
    </button>
    {#if downloadError}
      <p class="bad" role="alert">{downloadError}</p>
    {/if}
  </section>
</main>

<style>
  main {
    max-width: 48rem;
    margin: 0 auto;
    padding: 1rem;
    font-family: system-ui, sans-serif;
    line-height: 1.5;
  }

  .ok {
    color: #1a6b2f;
  }

  .bad {
    color: #a3161a;
  }

  button {
    font: inherit;
    padding: 0.5rem 1rem;
  }
</style>
