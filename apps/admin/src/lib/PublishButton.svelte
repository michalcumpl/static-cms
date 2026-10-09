<script lang="ts">
import { onDestroy, onMount, untrack } from "svelte";
import { getI18n } from "$lib/i18n";
import Button from "$lib/ui/Button.svelte";
import type { ProjectPaths } from "./project-paths";
import { Publishing } from "./publishing.svelte";

// Publish, with its status. `beforePublish` saves unsaved changes first (the editor); it
// returns false when saving failed, and nothing is published then.
let {
  paths,
  unsaved = false,
  beforePublish,
  publishing: shared,
  size = "md",
  blockedReason,
}: {
  paths: ProjectPaths;
  unsaved?: boolean;
  beforePublish?: () => Promise<boolean>;
  /** A page's own publishing state, so the page updates when this button publishes. */
  publishing?: Publishing;
  size?: "md" | "sm";
  /** Why publishing isn't possible right now (the saved site has errors): disables the button. */
  blockedReason?: string;
} = $props();

const i18n = getI18n();
// A project's paths don't change while the button is shown.
const publishing = untrack(() => shared ?? new Publishing(paths));
onMount(() => {
  if (!shared) void publishing.refresh();
});
onDestroy(() => publishing.stop());

async function onclick() {
  if (beforePublish && !(await beforePublish())) return;
  await publishing.publish();
}

const canPublish = $derived(publishing.info?.canPublish ?? true);
const onWebmio = $derived(publishing.info?.provider === "webmio");
const status = $derived(publishing.status);
const failure = $derived.by(() => {
  if (status.kind !== "failed") return "";
  if (status.message) return status.message;
  if (status.problems) return i18n.t("publish.fixProblems");
  return status.httpStatus
    ? i18n.t("publish.failed", { status: status.httpStatus })
    : i18n.t("publish.failedPlain");
});
</script>

<span class="publish">
  <Button
    kind="primary"
    icon="upload"
    {size}
    {onclick}
    disabled={status.kind === "publishing" || !canPublish || Boolean(blockedReason)}
    title={blockedReason ??
      (canPublish
        ? undefined
        : onWebmio
          ? i18n.t("publish.hostingNotSetUp")
          : i18n.t("publish.connectFirst"))}
  >
    {status.kind === "publishing"
      ? i18n.t("publish.publishing")
      : unsaved
        ? i18n.t("publish.saveAndPublish")
        : i18n.t("publish.publish")}
  </Button>
  <span class="publish-status" aria-live="polite">
    {#if !canPublish}
      <a href={paths.publishPage}>{onWebmio ? i18n.t("publish.hostingNotSetUp") : i18n.t("publish.notConnected")}</a>
    {:else if status.kind === "published"}
      {i18n.t("publish.published")} · <a href={status.url} target="_blank" rel="noopener">{status.url.replace(/^https:\/\//, "")}</a>
    {:else if status.kind === "failed"}
      <span class="problem">{failure}</span>
      {#if status.problems?.length}
        <ul class="problems">
          {#each status.problems as problem, i (i)}<li>{problem.message}</li>{/each}
        </ul>
      {/if}
    {/if}
  </span>
</span>

<style>
  .publish {
    display: inline-flex;
    align-items: center;
    flex-wrap: wrap;
    gap: var(--ui-space-2);
  }

  .publish-status {
    font-size: var(--ui-text-sm);
    color: var(--ui-muted);
  }

  .publish-status a {
    color: var(--ui-link);
  }

  .problem {
    color: var(--ui-problem);
  }

  .problems {
    margin: var(--ui-space-1) 0 0;
    padding-left: 1.2rem;
    color: var(--ui-problem);
  }
</style>
