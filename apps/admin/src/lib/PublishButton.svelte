<script lang="ts">
import { onDestroy, onMount, untrack } from "svelte";
import type { ProjectPaths } from "./project-paths";
import { Publishing } from "./publishing.svelte";

// Publish, with its status. `beforePublish` saves unsaved changes first (the editor); it
// returns false when saving failed, and nothing is published then.
let {
  paths,
  unsaved = false,
  beforePublish,
  publishing: shared,
}: {
  paths: ProjectPaths;
  unsaved?: boolean;
  beforePublish?: () => Promise<boolean>;
  /** A page's own publishing state, so the page updates when this button publishes. */
  publishing?: Publishing;
} = $props();

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

const connected = $derived(publishing.info?.connected ?? true);
const status = $derived(publishing.status);
</script>

<span class="publish">
  <button
    type="button"
    {onclick}
    disabled={status.kind === "publishing" || !connected}
    title={connected ? undefined : "Connect Netlify in the workspace settings first"}
  >
    {status.kind === "publishing" ? "Publishing…" : unsaved ? "Save and publish" : "Publish"}
  </button>
  <span class="publish-status" aria-live="polite">
    {#if !connected}
      <a href={paths.publishing}>Not connected to Netlify</a>
    {:else if status.kind === "published"}
      Published · <a href={status.url} target="_blank" rel="noopener">{status.url.replace(/^https:\/\//, "")}</a>
    {:else if status.kind === "failed"}
      <span class="problem">{status.message}</span>
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
    gap: 0.5rem;
  }

  .publish-status {
    font-size: 0.9rem;
    color: #555;
  }

  .problem {
    color: #a3161a;
  }

  .problems {
    margin: 0.25rem 0 0;
    padding-left: 1.2rem;
    color: #a3161a;
  }
</style>
