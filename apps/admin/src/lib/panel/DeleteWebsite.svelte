<script lang="ts">
import { goto } from "$app/navigation";
import { getI18n } from "$lib/i18n";
import Button from "$lib/ui/Button.svelte";
import Dialog from "$lib/ui/Dialog.svelte";
import TextField from "$lib/ui/TextField.svelte";

// The Website section's "Delete website" area, for owners (project-page spec, "Delete website";
// project-deletion decision 5). Confirmed by typing the website's name exactly.
let {
  projectId,
  name,
  address,
  domain,
  reachable,
  onNetlify = false,
  beforeDelete,
}: {
  projectId: string;
  name: string;
  /** The website's free address while it is published, else null. */
  address: string | null;
  domain: string | null;
  /** Whether its hosting can take it offline: Webmio hosting, or a connected Netlify team. */
  reachable: boolean;
  /** Whether it is published to Netlify, which keeps it when the workspace isn't connected. */
  onNetlify?: boolean;
  /** Called before leaving the section, so unsaved changes are dropped without asking. */
  beforeDelete: () => void;
} = $props();
const i18n = getI18n();

let dialog: Dialog | undefined = $state();
let typed = $state("");
let deleting = $state(false);
let problem = $state("");
const matches = $derived(typed.trim() === name.trim());

function open() {
  typed = "";
  problem = "";
  dialog?.open();
}

async function remove() {
  deleting = true;
  problem = "";
  const response = await fetch(`/api/projects/${projectId}`, {
    method: "DELETE",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ name: typed }),
  });
  deleting = false;
  if (response.status === 204) {
    beforeDelete();
    dialog?.close();
    await goto(`/?deleted=${encodeURIComponent(name)}`);
    return;
  }
  const body = (await response.json().catch(() => ({}))) as { message?: string };
  problem = body.message ?? i18n.t("panel.deletion.failed", { status: response.status });
}
</script>

<section class="delete" aria-labelledby="delete-website-area">
  <h2 id="delete-website-area">{i18n.t("panel.deletion.title")}</h2>
  <p>{i18n.t("panel.deletion.text")}</p>
  <Button kind="danger" icon="trash" onclick={open}>{i18n.t("panel.deletion.open")}</Button>
</section>

<Dialog id="delete-website" title={i18n.t("panel.deletion.dialogTitle", { name })} bind:this={dialog}>
  <p>{i18n.t("panel.deletion.restorable")}</p>
  {#if address && reachable}
    <p class="warning">
      {domain
        ? i18n.t("panel.deletion.offlineDomain", { address, domain })
        : i18n.t("panel.deletion.offline", { address })}
    </p>
  {:else if address && onNetlify}
    <p class="warning">{i18n.t("panel.deletion.staysOnNetlify")}</p>
  {/if}
  <TextField
    id="delete-website-name"
    label={i18n.t("panel.deletion.confirmLabel", { name })}
    bind:value={typed}
    autocomplete="off"
  />
  {#if problem}<p class="problem" role="alert">{problem}</p>{/if}
  {#snippet actions()}
    <Button onclick={() => dialog?.close()}>{i18n.t("common.cancel")}</Button>
    <Button kind="danger" icon="trash" onclick={remove} disabled={!matches || deleting}>
      {i18n.t("panel.deletion.confirm")}
    </Button>
  {/snippet}
</Dialog>

<style>
  .delete {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: var(--ui-space-2);
    padding: var(--ui-space-4);
    border: 1px solid var(--ui-problem-border);
    border-radius: var(--ui-radius-card);
    background: var(--ui-surface);
  }

  h2 {
    margin: 0;
    font-size: var(--ui-text-lg);
  }

  p {
    margin: 0;
  }

  .warning {
    margin-top: var(--ui-space-2);
    font-weight: 600;
  }

  .problem {
    margin-top: var(--ui-space-2);
    color: var(--ui-problem);
  }
</style>
