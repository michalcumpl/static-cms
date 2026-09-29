<script lang="ts">
import { projectPaths } from "$lib/project-paths";
import type { PageProps } from "./$types";

let { data }: PageProps = $props();
// A lone owner's workspace isn't mentioned until there is more than one.
const showWorkspaces = $derived(data.workspaces.length > 1);
</script>

<svelte:head>
  <title>Projects – Static CMS</title>
</svelte:head>

<header class="top">
  <strong>Static CMS</strong>
  <span class="account">
    {data.user.email}
    <form method="POST" action="/signout"><button type="submit">Sign out</button></form>
  </span>
</header>

<main>
  <h1>Projects</h1>
  {#if data.workspaces.length === 0}
    <p>You aren't a member of any workspace yet. Ask an owner to invite you.</p>
  {/if}
  {#each data.workspaces as workspace (workspace.id)}
    <section aria-labelledby={`ws-${workspace.id}`}>
      {#if showWorkspaces}
        <h2 id={`ws-${workspace.id}`}>{workspace.name}</h2>
      {:else}
        <h2 id={`ws-${workspace.id}`} class="visually-hidden">{workspace.name}</h2>
      {/if}
      {#if workspace.projects.length === 0}
        <p>No projects yet.</p>
      {:else}
        <ul class="projects">
          {#each workspace.projects as project (project.id)}
            <li>
              <a href={projectPaths(project.id).overview}>{project.name}</a>
              · <a href={projectPaths(project.id).edit()}>Edit</a>
            </li>
          {/each}
        </ul>
      {/if}
      {#if workspace.role === "owner"}
        <p class="actions">
          <a href={`/w/${workspace.id}/new`}>New project</a>
          · <a href={`/w/${workspace.id}/members`}>Members</a>
        </p>
      {/if}
    </section>
  {/each}
</main>

<style>
  .top {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 0.75rem 1rem;
    border-bottom: 1px solid #ddd;
    font-family: system-ui, sans-serif;
  }

  .account {
    display: flex;
    gap: 0.75rem;
    align-items: center;
  }

  .account form {
    margin: 0;
  }

  main {
    max-width: 48rem;
    margin: 0 auto;
    padding: 1rem;
    font-family: system-ui, sans-serif;
    line-height: 1.5;
  }

  .projects {
    padding-left: 1.25rem;
  }

  .actions {
    font-size: 0.95rem;
  }

  .visually-hidden {
    position: absolute;
    width: 1px;
    height: 1px;
    overflow: hidden;
    clip-path: inset(50%);
  }
</style>
