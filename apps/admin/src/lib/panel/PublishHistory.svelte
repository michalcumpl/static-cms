<script lang="ts">
import { getI18n } from "$lib/i18n";
import type { PublishSummary, PublishWarning } from "$lib/publishing.svelte";
import Badge from "$lib/ui/Badge.svelte";
import Button from "$lib/ui/Button.svelte";

// The publishes of a project, newest first, each with its outcome; an earlier successful one
// can be made live again while its files are kept (own-hosting, "Publish history and rollback").
// A running publish shows its step, the newest failed one offers Try again, and a successful one
// lists its warnings (safe-publishing design.md decision 7).
let {
  publishes,
  busy,
  onMakeLive,
  onTryAgain,
}: {
  publishes: PublishSummary[];
  busy: boolean;
  onMakeLive: (id: string) => void;
  onTryAgain?: () => void;
} = $props();
const i18n = getI18n();
const when = (iso: string) => i18n.formatDate(iso);

const linkCount = (warnings: PublishWarning[]) =>
  warnings.filter((warning) => warning.kind === "outside-link").length;
const describe = (warning: PublishWarning) =>
  warning.kind === "outside-links-skipped"
    ? i18n.t("publishing.linksSkipped", { count: warning.count })
    : warning.status
      ? i18n.t("publishing.linkAnswered", {
          url: warning.url,
          page: warning.page,
          status: warning.status,
        })
      : i18n.t("publishing.linkDidntAnswer", { url: warning.url, page: warning.page });
</script>

<ul class="history">
  {#each publishes as publish, index (publish.id)}
    <li class={publish.state}>
      <span>{when(publish.startedAt)}</span>
      <span class="muted">{publish.publishedBy ?? "–"}</span>
      {#if publish.state === "running"}
        <Badge status="attention">{publish.step ? i18n.t(`publish.steps.${publish.step}`) : i18n.t("publishing.running")}</Badge>
      {:else if publish.state === "failed"}
        <span class="failed">
          <span class="error">{publish.error ?? i18n.t("publish.failedPlain")}</span>
          {#if index === 0 && onTryAgain}
            <Button size="sm" onclick={onTryAgain} disabled={busy}>{i18n.t("publish.tryAgain")}</Button>
          {/if}
        </span>
      {:else if publish.live}
        <Badge status="success">{i18n.t("publishing.live")}</Badge>
      {:else if !publish.restorable}
        <span class="muted">{i18n.t("publishing.notKept")}</span>
      {:else}
        <Button size="sm" onclick={() => onMakeLive(publish.id)} disabled={busy}>{i18n.t("publishing.makeLive")}</Button>
      {/if}
      {#if publish.state === "ready" && publish.warnings.length > 0}
        <details class="warnings">
          <summary>{i18n.t("publish.warnings", { count: linkCount(publish.warnings) })}</summary>
          <ul>
            {#each publish.warnings as warning, i (i)}<li>{describe(warning)}</li>{/each}
          </ul>
        </details>
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

  .failed {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: var(--ui-space-2);
  }

  .history {
    display: flex;
    flex-direction: column;
    gap: var(--ui-space-2);
    margin: 0;
    padding: 0;
    list-style: none;
  }

  .history > li {
    display: grid;
    grid-template-columns: 11rem 1fr auto;
    align-items: center;
    gap: var(--ui-space-3);
  }

  .warnings {
    grid-column: 1 / -1;
    font-size: var(--ui-text-sm);
    color: var(--ui-attention, var(--ui-muted));
  }

  .warnings ul {
    margin: var(--ui-space-1) 0 0;
    padding-left: 1.2rem;
  }
</style>
