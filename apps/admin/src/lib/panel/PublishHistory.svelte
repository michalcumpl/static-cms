<script lang="ts">
import { getI18n } from "$lib/i18n";
import type { PublishSummary } from "$lib/publishing.svelte";
import Badge from "$lib/ui/Badge.svelte";
import Button from "$lib/ui/Button.svelte";

// The publishes of a project, newest first, each with its outcome; an earlier successful one
// can be made live again while its files are kept (own-hosting, "Publish history and rollback").
let {
  publishes,
  busy,
  onMakeLive,
}: {
  publishes: PublishSummary[];
  busy: boolean;
  onMakeLive: (id: string) => void;
} = $props();
const i18n = getI18n();
const when = (iso: string) => i18n.formatDate(iso);
</script>

<ul class="history">
  {#each publishes as publish (publish.id)}
    <li class={publish.state}>
      <span>{when(publish.startedAt)}</span>
      <span class="muted">{publish.publishedBy ?? "–"}</span>
      {#if publish.state === "running"}
        <Badge status="attention">{i18n.t("publishing.running")}</Badge>
      {:else if publish.state === "failed"}
        <span class="error">{i18n.t("publishing.failed", { error: publish.error ?? "" })}</span>
      {:else if publish.live}
        <Badge status="success">{i18n.t("publishing.live")}</Badge>
      {:else if !publish.restorable}
        <span class="muted">{i18n.t("publishing.notKept")}</span>
      {:else}
        <Button size="sm" onclick={() => onMakeLive(publish.id)} disabled={busy}>{i18n.t("publishing.makeLive")}</Button>
      {/if}
    </li>
  {/each}
</ul>

<style>
  .muted {
    color: var(--ui-muted);
  }

  .error {
    color: var(--ui-problem);
  }

  .history {
    display: flex;
    flex-direction: column;
    gap: var(--ui-space-2);
    margin: 0;
    padding: 0;
    list-style: none;
  }

  .history li {
    display: grid;
    grid-template-columns: 11rem 1fr auto;
    align-items: center;
    gap: var(--ui-space-3);
  }
</style>
