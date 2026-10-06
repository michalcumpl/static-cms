<script lang="ts">
import { getI18n } from "$lib/i18n";
import { projectPaths } from "$lib/project-paths";
import Button from "$lib/ui/Button.svelte";
import Card from "$lib/ui/Card.svelte";
import EmptyState from "$lib/ui/EmptyState.svelte";
import Notice from "$lib/ui/Notice.svelte";
import Page from "$lib/ui/Page.svelte";
import PageHeader from "$lib/ui/PageHeader.svelte";
import type { PageProps } from "./$types";

let { data }: PageProps = $props();
const i18n = getI18n();
// A lone owner's workspace isn't named until there is more than one.
const showWorkspaces = $derived(data.workspaces.length > 1);
const total = $derived(data.workspaces.reduce((sum, w) => sum + w.projects.length, 0));
</script>

<svelte:head>
  <title>{i18n.t("common.pageTitle", { page: i18n.t("projects.title") })}</title>
</svelte:head>

<Page>
  <PageHeader title={i18n.t("projects.title")}>
    {#if data.workspaces.length > 0}{i18n.t("projects.count", { count: total })}{/if}
  </PageHeader>
  {#if data.workspaces.length === 0}
    <Notice kind="info"><p>{i18n.t("projects.noWorkspace")}</p></Notice>
  {/if}
  {#each data.workspaces as workspace (workspace.id)}
    <section class="workspace" aria-labelledby={`ws-${workspace.id}`}>
      <div class="workspace-head">
        <h2 id={`ws-${workspace.id}`} class:visually-hidden={!showWorkspaces}>{workspace.name}</h2>
        {#if workspace.role === "owner"}
          <div class="actions">
            <Button href={`/w/${workspace.id}/members`} icon="users" size="sm">{i18n.t("projects.members")}</Button>
            <Button href={`/w/${workspace.id}/hosting`} icon="globe" size="sm">{i18n.t("projects.netlify")}</Button>
            <Button href={`/w/${workspace.id}/new`} kind="primary" icon="plus" size="sm">{i18n.t("projects.newProject")}</Button>
          </div>
        {/if}
      </div>
      {#if workspace.projects.length === 0}
        <EmptyState title={i18n.t("projects.empty")} icon="globe">
          <p>{i18n.t("projects.emptyText")}</p>
        </EmptyState>
      {:else}
        <ul class="projects">
          {#each workspace.projects as project (project.id)}
            <li>
              <Card>
                <div class="project">
                  <a class="name" href={projectPaths(project.id).dashboard}>{project.name}</a>
                  <Button href={projectPaths(project.id).edit()} kind="primary" icon="pencil" size="sm">{i18n.t("common.edit")}</Button>
                </div>
              </Card>
            </li>
          {/each}
        </ul>
      {/if}
    </section>
  {/each}
</Page>

<style>
  .workspace {
    display: flex;
    flex-direction: column;
    gap: var(--ui-space-4);
  }

  .workspace-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--ui-space-3);
    flex-wrap: wrap;
  }

  h2 {
    margin: 0;
    font-size: var(--ui-text-lg);
  }

  .actions {
    display: flex;
    gap: var(--ui-space-2);
    flex-wrap: wrap;
    margin-left: auto;
  }

  .projects {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(20rem, 1fr));
    gap: var(--ui-space-4);
    margin: 0;
    padding: 0;
    list-style: none;
  }

  .project {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--ui-space-3);
  }

  .name {
    font-weight: 700;
    font-size: var(--ui-text-lg);
    color: var(--ui-ink) !important;
    text-decoration: none;
  }

  .name:hover {
    text-decoration: underline;
  }

  .visually-hidden {
    position: absolute;
    width: 1px;
    height: 1px;
    overflow: hidden;
    clip-path: inset(50%);
  }
</style>
