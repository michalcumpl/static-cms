<script lang="ts">
import { goto } from "$app/navigation";
import { page } from "$app/state";
import { getI18n } from "$lib/i18n";
import { projectPaths } from "$lib/project-paths";
import Button from "$lib/ui/Button.svelte";
import Page from "$lib/ui/Page.svelte";
import PageHeader from "$lib/ui/PageHeader.svelte";
import Tabs from "$lib/ui/Tabs.svelte";
import type { LayoutProps } from "./$types";

// The project's panel (control-panel design decision 1): one header, the section bar, a row of
// subpages in Website and Publish, and the page under them. The pages that show one language
// (Business, Website, Pages and menu, Versions) take it from `?lang=`, chosen here.
let { data, children }: LayoutProps = $props();
const i18n = getI18n();

type Section = "dashboard" | "business" | "website" | "publish";
type Subpage = "site" | "pages" | "languages" | "domain" | "publishing" | "versions";

/** Each page of the panel: its section, its subpage, and whether it shows one language. */
const ROUTES: Record<string, { section: Section; subpage?: Subpage; perLanguage?: boolean }> = {
  "": { section: "dashboard" },
  "/business": { section: "business", perLanguage: true },
  "/website": { section: "website", subpage: "site", perLanguage: true },
  "/website/pages": { section: "website", subpage: "pages", perLanguage: true },
  "/website/languages": { section: "website", subpage: "languages" },
  "/website/domain": { section: "website", subpage: "domain" },
  "/publish": { section: "publish", subpage: "publishing" },
  "/publish/versions": { section: "publish", subpage: "versions", perLanguage: true },
};

const paths = $derived(
  projectPaths(data.project.id, data.lang === data.primaryLang ? undefined : data.lang),
);
const current = $derived(
  ROUTES[(page.route.id ?? "").replace("/p/[project]/(panel)", "")] ?? undefined,
);
// Links carry the language, so it survives a page that doesn't show one (Publish, Domain).
const lang = $derived(data.lang === data.primaryLang ? undefined : data.lang);
const keep = (href: string) =>
  lang === undefined || href.includes("lang=")
    ? href
    : `${href}${href.includes("?") ? "&" : "?"}lang=${encodeURIComponent(lang)}`;
const sections = $derived<{ section: Section; href: string }[]>([
  { section: "dashboard", href: paths.dashboard },
  { section: "business", href: paths.business },
  { section: "website", href: paths.website },
  { section: "publish", href: paths.publishPage },
]);
const subpages = $derived<{ subpage: Subpage; href: string }[]>(
  current?.section === "website"
    ? [
        { subpage: "site", href: paths.website },
        { subpage: "pages", href: paths.websitePages },
        { subpage: "languages", href: paths.websiteLanguages },
        { subpage: "domain", href: paths.domainPage },
      ]
    : current?.section === "publish"
      ? [
          { subpage: "publishing", href: paths.publishPage },
          { subpage: "versions", href: paths.versionsPage },
        ]
      : [],
);
const showsLanguage = $derived(data.languages.length > 1 && current?.perLanguage === true);

/** The same page in another language. */
function chooseLanguage(lang: string) {
  const url = new URL(page.url);
  if (lang === data.primaryLang) url.searchParams.delete("lang");
  else url.searchParams.set("lang", lang);
  goto(`${url.pathname}${url.search}`);
}
</script>

<Page>
  <PageHeader
    title={data.project.name}
    breadcrumb={[{ href: "/", label: i18n.t("projects.title") }]}
    breadcrumbLabel={i18n.t("common.breadcrumb")}
  >
    {#snippet actions()}
      <Button href={paths.preview} icon="eye">{i18n.t("project.preview")}</Button>
      <Button href={paths.edit()} kind="primary" icon="pencil">{i18n.t("project.openEditor")}</Button>
    {/snippet}
  </PageHeader>

  <div class="bar">
    <Tabs
      label={i18n.t("project.tabsLabel")}
      items={sections.map((item) => ({
        href: keep(item.href),
        label: i18n.t(`project.sections.${item.section}`),
        current: item.section === current?.section,
      }))}
    />
    {#if showsLanguage}
      <div class="language">
        <label for="tab-language">{i18n.t("project.language")}</label>
        <select
          id="tab-language"
          value={data.lang}
          onchange={(e) => chooseLanguage(e.currentTarget.value)}
        >
          {#each data.languages as language (language.lang)}
            <option value={language.lang}>{language.name}</option>
          {/each}
        </select>
      </div>
    {/if}
  </div>
  {#if subpages.length > 0 && current}
    <div class="subpages">
      <Tabs
        label={i18n.t("project.subpagesLabel", { section: i18n.t(`project.sections.${current.section}`) })}
        items={subpages.map((item) => ({
          href: keep(item.href),
          label: i18n.t(`project.subpages.${item.subpage}`),
          current: item.subpage === current.subpage,
        }))}
      />
    </div>
  {/if}

  {@render children()}
</Page>

<style>
  .bar {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    justify-content: space-between;
    gap: var(--ui-space-3);
    padding-bottom: var(--ui-space-3);
    border-bottom: 1px solid var(--ui-border);
  }

  .subpages {
    padding: var(--ui-space-2) 0;
    font-size: var(--ui-text-sm);
  }

  .language {
    display: flex;
    align-items: center;
    gap: var(--ui-space-2);
    font-size: var(--ui-text-sm);
    color: var(--ui-muted);
  }

  select {
    min-height: var(--ui-control-sm);
    padding: 0 var(--ui-space-3);
    border: 1px solid var(--ui-border-strong);
    border-radius: var(--ui-radius-pill);
    background: var(--ui-surface);
    color: var(--ui-ink);
    font: inherit;
  }
</style>
