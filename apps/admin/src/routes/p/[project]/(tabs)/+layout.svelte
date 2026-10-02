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

// The project's page as tabs (project-tabs design.md decision 1): one header, one tab bar, and
// the tab under it. Pages, History and Settings show one language, chosen here.
let { data, children }: LayoutProps = $props();
const i18n = getI18n();

const TAB_ROUTES = {
  "": "overview",
  "/pages": "pages",
  "/languages": "languages",
  "/publishing": "publishing",
  "/history": "history",
  "/settings": "settings",
} as const;
type Tab = (typeof TAB_ROUTES)[keyof typeof TAB_ROUTES];

const paths = $derived(
  projectPaths(data.project.id, data.lang === data.primaryLang ? undefined : data.lang),
);
const current = $derived.by((): Tab | undefined => {
  const id = page.route.id ?? "";
  const rest = id.replace("/p/[project]/(tabs)", "");
  return Object.hasOwn(TAB_ROUTES, rest) ? TAB_ROUTES[rest as keyof typeof TAB_ROUTES] : undefined;
});
const items = $derived<{ href: string; label: string; tab: Tab }[]>([
  { tab: "overview", href: paths.overview, label: i18n.t("project.tabs.overview") },
  { tab: "pages", href: paths.pagesTab, label: i18n.t("project.tabs.pages") },
  { tab: "languages", href: paths.languagesTab, label: i18n.t("project.tabs.languages") },
  { tab: "publishing", href: paths.publishing, label: i18n.t("project.tabs.publishing") },
  { tab: "history", href: paths.history, label: i18n.t("project.tabs.history") },
  { tab: "settings", href: paths.settings, label: i18n.t("project.tabs.settings") },
]);
const showsLanguage = $derived(
  data.languages.length > 1 &&
    (current === "pages" || current === "history" || current === "settings"),
);

function chooseLanguage(lang: string) {
  const to = projectPaths(data.project.id, lang === data.primaryLang ? undefined : lang);
  const target = { pages: to.pagesTab, history: to.history, settings: to.settings }[
    current as "pages" | "history" | "settings"
  ];
  goto(target);
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
      items={items.map((item) => ({ href: item.href, label: item.label, current: item.tab === current }))}
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
