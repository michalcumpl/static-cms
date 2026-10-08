<script lang="ts">
import {
  type DocumentPath,
  Node,
  NodeArrayProperty,
  type SveditContext,
  TextProperty,
} from "svedit";
import { getContext } from "svelte";
import { getI18n } from "$lib/i18n";

// Job openings on the canvas (jobs design decision 3): the jobs, then the note for when there
// are none, editable in place (it may hold bold and links). With no jobs the note takes the
// list's place, as on the published page.
let { path }: { path: DocumentPath } = $props();
const svedit = getContext<SveditContext>("svedit");
const block = $derived(svedit.session.get(path) as { items: { nodes: string[] } });
const hasJobs = $derived(block.items.nodes.length > 0);
const i18n = getI18n();
</script>

<Node {path} tag="section" class="block jobs">
  <div class="container">
    <TextProperty tag="h2" path={[...path, "heading"]} placeholder={i18n.t("editor.canvas.headingOptional")} />
    {#if hasJobs}
      <NodeArrayProperty tag="ul" class="job-list" path={[...path, "items"]} />
      <p class="canvas-jobs-note-label" contenteditable="false">{i18n.t("editor.canvas.jobsNoteLabel")}</p>
    {/if}
    <TextProperty
      tag="p"
      class={hasJobs ? "jobs-note canvas-jobs-note-idle" : "jobs-note"}
      path={[...path, "empty_note"]}
      placeholder={i18n.t("editor.canvas.jobsNote")}
    />
  </div>
</Node>

<style>
  .canvas-jobs-note-label {
    margin: 1.5rem 0 0;
    font-size: 0.8rem;
    opacity: 0.6;
  }

  :global(.canvas-jobs-note-idle) {
    margin-top: 0.25rem;
    opacity: 0.6;
  }
</style>
