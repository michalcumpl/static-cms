<script lang="ts">
import { onMount } from "svelte";
import { getI18n } from "$lib/i18n";
import type { ProjectPaths } from "$lib/project-paths";
import type { Publishing } from "$lib/publishing.svelte";
import Button from "$lib/ui/Button.svelte";
import Card from "$lib/ui/Card.svelte";
import Notice from "$lib/ui/Notice.svelte";

// The custom domain: connecting it, its DNS records and state, checking and disconnecting it
// (control-panel design decision 6, moved out of the Publishing tab).
let { paths, publishing }: { paths: ProjectPaths; publishing: Publishing } = $props();
const i18n = getI18n();
const info = $derived(publishing.info);

let domainInput = $state("");
let domainError = $state("");
let busy = $state(false);

onMount(async () => {
  await publishing.refresh();
  // Pick up DNS and certificate changes since the last visit.
  if (publishing.info?.domain && publishing.info.domainState !== "ready") await checkDomain();
});

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
        i18n.t("publishing.requestFailed", { status: response.status })
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
</script>

  <Card title={i18n.t("publishing.domain")} id="domain">
    {#if info?.domain}
      <p><strong>{info.domain}</strong></p>
      {#if info.domainState}
        <Notice kind={info.domainState === "ready" ? "success" : "attention"}>
          <p role="status">{i18n.t(`publishing.state.${info.domainState}`)}</p>
        </Notice>
      {/if}
      {#if info.domainState !== "ready"}
        <table>
          <caption>{i18n.t("publishing.dnsRecords")}</caption>
          <thead>
            <tr>
              <th>{i18n.t("publishing.name")}</th>
              <th>{i18n.t("publishing.type")}</th>
              <th>{i18n.t("publishing.value")}</th>
            </tr>
          </thead>
          <tbody>
            {#each info.dnsRecords as record (record.name)}
              <tr><td><code>{record.name}</code></td><td>{record.type}</td><td><code>{record.value}</code></td></tr>
            {/each}
          </tbody>
        </table>
      {/if}
      <div class="buttons">
        <Button onclick={checkDomain} disabled={busy}>{i18n.t("publishing.checkAgain")}</Button>
        <Button kind="danger" onclick={disconnectDomain} disabled={busy}>{i18n.t("publishing.disconnect")}</Button>
      </div>
    {:else if info?.address}
      <form onsubmit={connectDomain} class="domain-form">
        <label for="domain-input">{i18n.t("publishing.yourDomain")}</label>
        <div class="row">
          <input id="domain-input" type="text" bind:value={domainInput} placeholder="anideti.cz" data-i18n-ignore />
          <Button type="submit" kind="primary" disabled={busy || domainInput.trim() === ""}>{i18n.t("publishing.connect")}</Button>
        </div>
      </form>
    {:else}
      <p class="muted">{i18n.t("publishing.publishFirst")}</p>
    {/if}
    {#if domainError}<Notice kind="problem"><p>{domainError}</p></Notice>{/if}
  </Card>


<style>
  p {
    margin: 0;
  }

  .muted {
    color: var(--ui-muted);
  }

  table {
    width: 100%;
    border-collapse: collapse;
    font-size: var(--ui-text-sm);
  }

  caption {
    text-align: left;
    font-weight: 600;
    padding-bottom: var(--ui-space-2);
  }

  th,
  td {
    padding: var(--ui-space-2);
    border-bottom: 1px solid var(--ui-border);
    text-align: left;
  }

  .buttons,
  .row {
    display: flex;
    gap: var(--ui-space-2);
    flex-wrap: wrap;
  }

  .domain-form {
    display: flex;
    flex-direction: column;
    gap: var(--ui-space-1);
  }

  .domain-form label {
    font-size: var(--ui-text-sm);
    font-weight: 600;
  }

  .row input {
    flex-grow: 1;
    min-height: var(--ui-control);
    padding: 0 var(--ui-space-3);
    border: 1px solid var(--ui-border-strong);
    border-radius: var(--ui-radius-field);
    font: var(--ui-text-md) var(--ui-font);
  }
</style>
