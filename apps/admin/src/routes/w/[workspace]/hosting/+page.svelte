<script lang="ts">
import { invalidateAll } from "$app/navigation";
import { getI18n } from "$lib/i18n";
import Button from "$lib/ui/Button.svelte";
import Card from "$lib/ui/Card.svelte";
import Notice from "$lib/ui/Notice.svelte";
import Page from "$lib/ui/Page.svelte";
import PageHeader from "$lib/ui/PageHeader.svelte";
import type { PageProps } from "./$types";

let { data }: PageProps = $props();
const i18n = getI18n();
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
    message = body.message ?? i18n.t("hosting.checkFailed", { status: response.status });
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
    message = body.message ?? i18n.t("hosting.connectFailed", { status: response.status });
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
  <title>{i18n.t("common.pageTitle", { page: i18n.t("hosting.pageTitle", { workspace: data.workspace.name }) })}</title>
</svelte:head>

<Page width="narrow">
  <PageHeader
    title={i18n.t("hosting.title")}
    breadcrumb={[{ href: "/", label: i18n.t("projects.title") }]}
    breadcrumbLabel={i18n.t("common.breadcrumb")}
  >
    {i18n.t("hosting.intro", { workspace: data.workspace.name })}
  </PageHeader>

  <Card title={i18n.t("hosting.connection")} id="connection">
    {#if data.connection}
      <Notice kind="success">
        <p role="status">
          {data.connection.connectedBy
            ? i18n.t("hosting.connectedBy", {
                team: data.connection.accountName,
                person: data.connection.connectedBy,
                date: i18n.formatDate(data.connection.connectedAt, "date"),
              })
            : i18n.t("hosting.connectedOn", {
                team: data.connection.accountName,
                date: i18n.formatDate(data.connection.connectedAt, "date"),
              })}
        </p>
      </Notice>
      {#if data.role === "owner"}
        <div><Button kind="danger" onclick={disconnect} disabled={busy}>{i18n.t("hosting.disconnect")}</Button></div>
        <p class="muted">{i18n.t("hosting.reconnectHint")}</p>
      {/if}
    {:else}
      <Notice kind="attention"><p role="status">{i18n.t("hosting.notConnected")}</p></Notice>
    {/if}
  </Card>

  {#if data.role === "owner"}
    <Card title={data.connection ? i18n.t("hosting.reconnect") : i18n.t("hosting.connect")} id="connect">
      {#if !data.setUp}
        <Notice kind="problem"><p>{i18n.t("hosting.notSetUp")}</p></Notice>
      {:else}
        <ol class="steps">
          <li>{i18n.t("hosting.step1")}</li>
          <li>{i18n.t("hosting.step2")}</li>
        </ol>
        <form onsubmit={checkToken} class="token">
          <label for="netlify-token">{i18n.t("hosting.token")}</label>
          <div class="row">
            <input id="netlify-token" type="password" autocomplete="off" bind:value={token} />
            <Button type="submit" disabled={busy || token.trim() === ""}>{i18n.t("hosting.checkToken")}</Button>
          </div>
        </form>
        {#if teams.length > 0}
          <fieldset>
            <legend>{i18n.t("hosting.team")}</legend>
            {#each teams as option (option.slug)}
              <label class="team"><input type="radio" name="team" value={option.slug} bind:group={team} /> {option.name}</label>
            {/each}
          </fieldset>
          <div><Button kind="primary" onclick={connect} disabled={busy || !team}>{i18n.t("hosting.connect")}</Button></div>
        {/if}
      {/if}
      {#if message}<Notice kind="problem"><p>{message}</p></Notice>{/if}
    </Card>
  {:else}
    <p class="muted">{i18n.t("hosting.ownersOnly")}</p>
  {/if}
</Page>

<style>
  .muted {
    margin: 0;
    color: var(--ui-muted);
  }

  .steps {
    margin: 0;
    padding-left: 1.25rem;
    display: flex;
    flex-direction: column;
    gap: var(--ui-space-1);
  }

  .token {
    display: flex;
    flex-direction: column;
    gap: var(--ui-space-1);
  }

  .token label {
    font-size: var(--ui-text-sm);
    font-weight: 600;
  }

  .row {
    display: flex;
    gap: var(--ui-space-2);
  }

  .row input {
    flex-grow: 1;
    min-height: var(--ui-control);
    padding: 0 var(--ui-space-3);
    border: 1px solid var(--ui-border-strong);
    border-radius: var(--ui-radius-field);
    font: var(--ui-text-md) var(--ui-font);
  }

  fieldset {
    display: flex;
    flex-direction: column;
    gap: var(--ui-space-2);
    margin: 0;
    padding: var(--ui-space-3) var(--ui-space-4);
    border: 1px solid var(--ui-border);
    border-radius: var(--ui-radius-field);
  }

  legend {
    font-size: var(--ui-text-sm);
    font-weight: 600;
  }

  .team {
    display: flex;
    gap: var(--ui-space-2);
    align-items: center;
  }
</style>
