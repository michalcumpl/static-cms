<script lang="ts">
import { onDestroy, onMount } from "svelte";
import PublishButton from "$lib/PublishButton.svelte";
import { projectPaths } from "$lib/project-paths";
import { Publishing } from "$lib/publishing.svelte";
import type { PageProps } from "./$types";

let { data }: PageProps = $props();
const paths = $derived(projectPaths(data.project.id));
// svelte-ignore state_referenced_locally
const publishing = new Publishing(projectPaths(data.project.id));
const info = $derived(publishing.info);

let domainInput = $state("");
let domainError = $state("");
let busy = $state(false);

const STATE_TEXT = {
  "waiting-for-dns": "Waiting for DNS: set the records below at your domain's registrar.",
  "issuing-certificate": "DNS is set; Netlify is issuing the certificate (HTTPS).",
  ready: "Ready: the site is served at this domain.",
} as const;

onMount(async () => {
  await publishing.refresh();
  // Pick up DNS and certificate changes since the last visit.
  if (publishing.info?.domain && publishing.info.domainState !== "ready") await checkDomain();
});
onDestroy(() => publishing.stop());

async function send(url: string, method: string, body?: unknown): Promise<string | undefined> {
  busy = true;
  try {
    const response = await fetch(url, {
      method,
      headers: body === undefined ? {} : { "content-type": "application/json" },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    if (!response.ok) {
      return (
        ((await response.json().catch(() => ({}))) as { message?: string }).message ??
        `Failed (${response.status}).`
      );
    }
    await publishing.refresh();
    return undefined;
  } finally {
    busy = false;
  }
}

async function connectDomain(event: SubmitEvent) {
  event.preventDefault();
  domainError = (await send(paths.domain, "PUT", { domain: domainInput })) ?? "";
  if (!domainError) domainInput = "";
}

async function checkDomain() {
  domainError = (await send(paths.domainCheck, "POST")) ?? "";
}

async function disconnectDomain() {
  domainError = (await send(paths.domain, "DELETE")) ?? "";
}

let restoreError = $state("");
async function makeLive(id: string) {
  restoreError = (await send(paths.restore(id), "POST")) ?? "";
}

const when = (iso: string) => new Date(iso).toLocaleString();
</script>

<svelte:head>
  <title>Publishing – {data.project.name} – Static CMS</title>
</svelte:head>

<main>
  <p class="crumbs"><a href={paths.overview}>← {data.project.name}</a></p>
  <h1>Publishing</h1>

  {#if info && !info.connected}
    <p class="note" role="status">
      This workspace isn't connected to Netlify yet. An owner can connect it in the
      <a href="/w/{data.workspace.id}/hosting">workspace's Netlify settings</a>.
    </p>
  {:else if info}
    <p class="team">Publishing to the Netlify team <strong>{info.team}</strong>.</p>
  {/if}

  <section aria-labelledby="address">
    <h2 id="address">Address</h2>
    {#if info?.address}
      <p><a href={info.address} target="_blank" rel="noopener">{info.address}</a></p>
    {:else}
      <p class="muted">Not published yet.</p>
    {/if}
    <PublishButton {paths} {publishing} />
  </section>

  <section aria-labelledby="domain">
    <h2 id="domain">Domain</h2>
    {#if info?.domain}
      <p><strong>{info.domain}</strong></p>
      {#if info.domainState}<p role="status">{STATE_TEXT[info.domainState]}</p>{/if}
      {#if info.domainState !== "ready"}
        <table>
          <caption>DNS records to set at your registrar</caption>
          <thead><tr><th>Name</th><th>Type</th><th>Value</th></tr></thead>
          <tbody>
            {#each info.dnsRecords as record (record.name)}
              <tr><td><code>{record.name}</code></td><td>{record.type}</td><td><code>{record.value}</code></td></tr>
            {/each}
          </tbody>
        </table>
      {/if}
      <p>
        <button type="button" onclick={checkDomain} disabled={busy}>Check again</button>
        <button type="button" onclick={disconnectDomain} disabled={busy}>Disconnect</button>
      </p>
    {:else if info?.address}
      <form onsubmit={connectDomain}>
        <label for="domain-input">Your domain</label>
        <input id="domain-input" type="text" bind:value={domainInput} placeholder="anideti.cz" />
        <button type="submit" disabled={busy || domainInput.trim() === ""}>Connect</button>
      </form>
    {:else}
      <p class="muted">Publish the site once, then connect your domain.</p>
    {/if}
    {#if domainError}<p class="error" role="alert">{domainError}</p>{/if}
  </section>

  <section aria-labelledby="history">
    <h2 id="history">History</h2>
    {#if !info || info.publishes.length === 0}
      <p class="muted">Nothing published yet.</p>
    {:else}
      <ul class="history">
        {#each info.publishes as publish (publish.id)}
          <li class={publish.state}>
            <span>{when(publish.startedAt)}</span>
            <span>{publish.publishedBy ?? "–"}</span>
            {#if publish.state === "running"}
              <span>Publishing…</span>
            {:else if publish.state === "failed"}
              <span class="error">Failed: {publish.error}</span>
            {:else if publish.live}
              <strong>Live</strong>
            {:else}
              <button type="button" onclick={() => makeLive(publish.id)} disabled={busy}>Make live again</button>
            {/if}
          </li>
        {/each}
      </ul>
    {/if}
    {#if restoreError}<p class="error" role="alert">{restoreError}</p>{/if}
  </section>
</main>

<style>
  main {
    max-width: 48rem;
    margin: 0 auto;
    padding: 1rem;
    font-family: system-ui, sans-serif;
  }

  .muted,
  .team {
    color: #555;
  }

  .note {
    padding: 0.75rem;
    border-radius: 0.4rem;
    background: #fff5e0;
  }

  .error {
    color: #a3161a;
  }

  table {
    border-collapse: collapse;
    margin: 0.5rem 0;
  }

  caption {
    text-align: left;
    font-weight: 600;
    margin-bottom: 0.25rem;
  }

  th,
  td {
    border: 1px solid #ddd;
    padding: 0.3rem 0.6rem;
    text-align: left;
  }

  .history {
    list-style: none;
    padding: 0;
  }

  .history li {
    display: grid;
    grid-template-columns: 12rem 12rem 1fr;
    gap: 0.5rem;
    padding: 0.4rem 0;
    border-bottom: 1px solid #eee;
    align-items: center;
  }
</style>
