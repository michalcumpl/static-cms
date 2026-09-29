<script lang="ts">
import type { PageProps } from "./$types";

let { data, form }: PageProps = $props();
</script>

<svelte:head>
  <title>New project – Static CMS</title>
</svelte:head>

<main>
  <p><a href="/">← Projects</a></p>
  <h1>New project in {data.workspace.name}</h1>
  <form method="POST">
    <label for="name">Name</label>
    <input
      id="name"
      name="name"
      required
      defaultValue={form?.name ?? ""}
      aria-invalid={form?.missing ? "true" : undefined}
      aria-describedby={form?.missing ? "name-error" : "name-hint"}
    />
    <p id="name-hint" class="hint">The website starts as a simple one-page site you can edit.</p>
    {#if form?.missing}
      <p id="name-error" class="error" role="alert">Enter a name.</p>
    {/if}
    <button type="submit">Create project</button>
  </form>
</main>

<style>
  main {
    max-width: 32rem;
    margin: 0 auto;
    padding: 1rem;
    font-family: system-ui, sans-serif;
    line-height: 1.5;
  }

  label,
  input {
    display: block;
    width: 100%;
  }

  input {
    margin-top: 0.25rem;
    padding: 0.5rem;
    font: inherit;
  }

  .hint {
    color: #555;
    font-size: 0.9rem;
  }

  .error {
    color: #a3161a;
  }

  button {
    font: inherit;
    padding: 0.5rem 1rem;
  }
</style>
