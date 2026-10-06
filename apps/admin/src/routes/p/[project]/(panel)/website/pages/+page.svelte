<script lang="ts">
import { getI18n } from "$lib/i18n";
import { projectPaths } from "$lib/project-paths";
import Badge from "$lib/ui/Badge.svelte";
import Button from "$lib/ui/Button.svelte";
import Card from "$lib/ui/Card.svelte";
import TabPanel from "$lib/ui/TabPanel.svelte";
import type { PageProps } from "./$types";

// The pages of one language (project-page spec, "Pages tab"), each with its place in the menu,
// whether it still needs translating, and links to edit and preview it.
let { data }: PageProps = $props();
const i18n = getI18n();

const isPrimary = $derived(data.lang === data.primaryLang);
const paths = $derived(projectPaths(data.project.id, isPrimary ? undefined : data.lang));
const nameOf = (lang: string) => data.languages.find((l) => l.lang === lang)?.name ?? lang;
/** Where the page lives on the site: the primary language at the root, others under `/<lang>/`. */
const addressOf = (page: { slug: string; home: boolean }) =>
  `${isPrimary ? "/" : `/${data.lang}/`}${page.home ? "" : `${page.slug}/`}`;
const previewOf = (page: { slug: string; home: boolean }) =>
  `${paths.preview}${addressOf(page).replace(/^\//, "")}`;
</script>

<svelte:head>
  <title>{i18n.t("common.pageTitle", { page: i18n.t("project.tabTitle", { tab: i18n.t("project.subpages.pages"), project: data.project.name }) })}</title>
</svelte:head>

<TabPanel>
  <Card title={i18n.t("project.pagesTab.list", { language: nameOf(data.lang) })} id="pages">
    <ul class="pages">
      {#each data.pages as page (page.pageId)}
        <li>
          <div class="what">
            <a class="title" href={paths.edit(page.pageId)} data-sveltekit-reload>{page.title}</a>
            <code>{addressOf(page)}</code>
            <span class="marks">
              {#if page.home}<Badge status="neutral">{i18n.t("project.pagesTab.home")}</Badge>{/if}
              <Badge status="neutral">
                {page.inMenu ? i18n.t("project.pagesTab.inMenu") : i18n.t("project.pagesTab.notInMenu")}
              </Badge>
              {#if page.untranslated}
                <Badge status="attention">{i18n.t("languages.notTranslated")}</Badge>
              {/if}
            </span>
          </div>
          <div class="actions">
            <Button
              size="sm"
              href={paths.edit(page.pageId)}
              icon="pencil"
              aria-label={i18n.t("project.pagesTab.editPage", { title: page.title })}
              data-sveltekit-reload
            >
              {i18n.t("project.pagesTab.edit")}
            </Button>
            <Button
              size="sm"
              href={previewOf(page)}
              icon="eye"
              aria-label={i18n.t("project.pagesTab.previewPage", { title: page.title })}
            >
              {i18n.t("project.pagesTab.preview")}
            </Button>
          </div>
        </li>
      {/each}
    </ul>
  </Card>

  {#if data.missing.length > 0}
    <Card title={i18n.t("project.pagesTab.missingTitle", { language: nameOf(data.lang) })} id="missing">
      <p class="muted">{i18n.t("project.pagesTab.missingText", { primary: nameOf(data.primaryLang) })}</p>
      <ul class="pages">
        {#each data.missing as page (page.pageId)}
          <li>
            <a class="title" href={projectPaths(data.project.id).edit(page.pageId)} data-sveltekit-reload>
              {page.title}
            </a>
          </li>
        {/each}
      </ul>
    </Card>
  {/if}
</TabPanel>

<style>
  p {
    margin: 0;
  }

  .muted {
    color: var(--ui-muted);
  }

  .pages {
    display: flex;
    flex-direction: column;
    margin: 0;
    padding: 0;
    list-style: none;
  }

  .pages li {
    display: flex;
    flex-wrap: wrap;
    justify-content: space-between;
    align-items: center;
    gap: var(--ui-space-3);
    padding: var(--ui-space-3) 0;
    border-top: 1px solid var(--ui-border);
  }

  .pages li:first-child {
    border-top: 0;
  }

  .what {
    display: flex;
    flex-wrap: wrap;
    align-items: baseline;
    gap: var(--ui-space-3);
  }

  .title {
    font-weight: 600;
  }

  code {
    font-size: var(--ui-text-xs);
    color: var(--ui-muted);
  }

  .marks {
    display: inline-flex;
    flex-wrap: wrap;
    gap: var(--ui-space-2);
  }

  .actions {
    display: flex;
    gap: var(--ui-space-2);
  }
</style>
