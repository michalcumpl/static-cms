<script lang="ts">
import { invalidateAll } from "$app/navigation";
import { getI18n } from "$lib/i18n";
import { projectPaths } from "$lib/project-paths";
import Button from "$lib/ui/Button.svelte";
import Card from "$lib/ui/Card.svelte";
import Dialog from "$lib/ui/Dialog.svelte";
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

// Deleted websites: Restore, or Delete now after a confirmation (project-deletion decision 5).
let purgeDialog: Dialog | undefined = $state();
let purging = $state<{ workspaceId: string; id: string; name: string }>();
let problem = $state("");
async function act(workspaceId: string, projectId: string, action: "restore" | "purge") {
  problem = "";
  const base = `/api/workspaces/${workspaceId}/deleted/${projectId}`;
  const response = await fetch(action === "restore" ? `${base}/restore` : base, {
    method: action === "restore" ? "POST" : "DELETE",
  });
  if (!response.ok) problem = i18n.t("projects.deleted.failed", { status: response.status });
  await invalidateAll();
}
async function purgeNow() {
  const target = purging;
  purgeDialog?.close();
  if (target) await act(target.workspaceId, target.id, "purge");
}
</script>

<svelte:head>
  <title>{i18n.t("common.pageTitle", { page: i18n.t("projects.title") })}</title>
</svelte:head>

<Page>
  <PageHeader title={i18n.t("projects.title")}>
    {#if data.workspaces.length > 0}{i18n.t("projects.count", { count: total })}{/if}
  </PageHeader>
  {#if data.deletedName}
    <Notice kind="info"><p>{i18n.t("projects.deletedNote", { name: data.deletedName })}</p></Notice>
  {/if}
  {#if problem}<Notice kind="attention"><p role="alert">{problem}</p></Notice>{/if}
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
      {#if workspace.deleted.length > 0}
        <section class="deleted" aria-labelledby={`deleted-${workspace.id}`}>
          <h3 id={`deleted-${workspace.id}`}>{i18n.t("projects.deleted.title")}</h3>
          <ul>
            {#each workspace.deleted as project (project.id)}
              <li>
                <div>
                  <span class="deleted-name">{project.name}</span>
                  <span class="muted">
                    {project.deletedBy
                      ? i18n.t("projects.deleted.when", { date: i18n.formatDate(project.deletedAt, "date"), person: project.deletedBy })
                      : i18n.t("projects.deleted.whenNoPerson", { date: i18n.formatDate(project.deletedAt, "date") })}
                  </span>
                </div>
                <div class="deleted-actions" role="group" aria-label={project.name}>
                  <Button size="sm" icon="undo" onclick={() => act(workspace.id, project.id, "restore")}>{i18n.t("projects.deleted.restore")}</Button>
                  <Button size="sm" kind="danger" icon="trash" onclick={() => { purging = { workspaceId: workspace.id, id: project.id, name: project.name }; purgeDialog?.open(); }}>{i18n.t("projects.deleted.deleteNow")}</Button>
                </div>
              </li>
            {/each}
          </ul>
        </section>
      {/if}
    </section>
  {/each}
</Page>

<Dialog id="purge-website" title={i18n.t("projects.deleted.dialogTitle", { name: purging?.name ?? "" })} bind:this={purgeDialog}>
  <p>{i18n.t("projects.deleted.dialogText")}</p>
  {#snippet actions()}
    <Button onclick={() => purgeDialog?.close()}>{i18n.t("common.cancel")}</Button>
    <Button kind="danger" icon="trash" onclick={purgeNow}>{i18n.t("projects.deleted.deleteNow")}</Button>
  {/snippet}
</Dialog>

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

  .deleted h3 {
    margin: 0 0 var(--ui-space-2);
    font-size: var(--ui-text-md);
  }

  .deleted ul {
    display: flex;
    flex-direction: column;
    gap: var(--ui-space-2);
    margin: 0;
    padding: 0;
    list-style: none;
  }

  .deleted li {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    justify-content: space-between;
    gap: var(--ui-space-2) var(--ui-space-4);
    padding: var(--ui-space-3) var(--ui-space-4);
    border: 1px dashed var(--ui-border-strong);
    border-radius: var(--ui-radius-card);
  }

  .deleted li > div:first-child {
    display: flex;
    flex-direction: column;
  }

  .deleted-name {
    font-weight: 600;
  }

  .muted {
    color: var(--ui-muted);
    font-size: var(--ui-text-sm);
  }

  .deleted-actions {
    display: flex;
    gap: var(--ui-space-2);
  }

  .visually-hidden {
    position: absolute;
    width: 1px;
    height: 1px;
    overflow: hidden;
    clip-path: inset(50%);
  }
</style>
