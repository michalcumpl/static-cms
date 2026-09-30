<script lang="ts">
import { invalidateAll } from "$app/navigation";
import type { PageProps } from "./$types";

let { data }: PageProps = $props();
const api = $derived(`/api/workspaces/${data.workspace.id}/hosting`);

let token = $state("");
let teams = $state<{ slug: string; name: string }[]>([]);
let team = $state("");
let message = $state("");
let busy = $state(false);

async function request(url: string, init: RequestInit): Promise<Response> {
  busy = true;
  try {
    return await fetch(url, {
      ...init,
      headers: init.body ? { "content-type": "application/json" } : {},
    });
  } finally {
    busy = false;
  }
}

async function checkToken(event: SubmitEvent) {
  event.preventDefault();
  message = "";
  const response = await request(`${api}/teams`, {
    method: "POST",
    body: JSON.stringify({ token }),
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    message = body.message ?? `Checking the token failed (${response.status}).`;
    return;
  }
  teams = body.teams;
  team = teams[0]?.slug ?? "";
}

async function connect() {
  message = "";
  const response = await request(api, {
    method: "PUT",
    body: JSON.stringify({ token, account: team }),
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    message = body.message ?? `Connecting failed (${response.status}).`;
    return;
  }
  // The token is kept only on the server from now on.
  token = "";
  teams = [];
  await invalidateAll();
}

async function disconnect() {
  await request(api, { method: "DELETE" });
  await invalidateAll();
}
</script>

<svelte:head>
  <title>Netlify – {data.workspace.name} – Static CMS</title>
</svelte:head>

<main>
  <p class="crumbs"><a href="/">← All projects</a></p>
  <h1>Publishing to Netlify</h1>
  <p class="muted">
    {data.workspace.name}'s sites are published to its own Netlify team, on its own Netlify plan.
  </p>

  <section aria-labelledby="connection">
    <h2 id="connection">Connection</h2>
    {#if data.connection}
      <p role="status">
        Connected to the Netlify team <strong>{data.connection.accountName}</strong>
        {#if data.connection.connectedBy}by {data.connection.connectedBy}{/if}
        on {new Date(data.connection.connectedAt).toLocaleDateString()}.
      </p>
      {#if data.role === "owner"}
        <button type="button" onclick={disconnect} disabled={busy}>Disconnect</button>
        <p class="muted">Connect again below to use another token or team.</p>
      {/if}
    {:else}
      <p role="status">Not connected. Projects of this workspace can't be published yet.</p>
    {/if}
  </section>

  {#if data.role === "owner"}
    <section aria-labelledby="connect">
      <h2 id="connect">{data.connection ? "Reconnect" : "Connect"}</h2>
      {#if !data.setUp}
        <p class="error">Publishing isn't set up on this server (SECRET_KEY is missing).</p>
      {:else}
        <ol class="steps">
          <li>In Netlify, open <em>User settings → Applications → Personal access tokens</em> and create a token.</li>
          <li>Paste it here. It is stored encrypted and never shown again.</li>
        </ol>
        <form onsubmit={checkToken}>
          <label for="netlify-token">Netlify personal access token</label>
          <input id="netlify-token" type="password" autocomplete="off" bind:value={token} />
          <button type="submit" disabled={busy || token.trim() === ""}>Check token</button>
        </form>
        {#if teams.length > 0}
          <fieldset>
            <legend>Publish into the team</legend>
            {#each teams as option (option.slug)}
              <label><input type="radio" name="team" value={option.slug} bind:group={team} /> {option.name}</label>
            {/each}
          </fieldset>
          <button type="button" onclick={connect} disabled={busy || !team}>Connect</button>
        {/if}
      {/if}
      {#if message}<p class="error" role="alert">{message}</p>{/if}
    </section>
  {:else}
    <p class="muted">Only owners of this workspace can connect or disconnect Netlify.</p>
  {/if}
</main>

<style>
  main {
    max-width: 40rem;
    margin: 0 auto;
    padding: 1rem;
    font-family: system-ui, sans-serif;
  }

  .muted {
    color: #555;
  }

  .error {
    color: #a3161a;
  }

  form,
  fieldset {
    display: flex;
    flex-direction: column;
    gap: 0.4rem;
    margin: 0.5rem 0;
    border: 0;
    padding: 0;
  }
</style>
