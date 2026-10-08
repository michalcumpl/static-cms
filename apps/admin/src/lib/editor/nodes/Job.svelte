<script lang="ts">
import { formatPhone } from "@webmio/render";
import {
  type DocumentPath,
  Node,
  NodeArrayProperty,
  type SveditContext,
  TextProperty,
} from "svedit";
import { getContext } from "svelte";
import { getI18n } from "$lib/i18n";
import { addJobDescription } from "../transforms";

// A job on the canvas (jobs design decision 3): title, summary and description editable in
// place, the description always open; the contact is set in the Job panel and shown read-only.
let { path }: { path: DocumentPath } = $props();
const svedit = getContext<SveditContext>("svedit");
const job = $derived(
  svedit.session.get(path) as {
    body: { nodes: string[] };
    contact_name: { content: string };
    contact_email: string;
    contact_phone: string;
  },
);
const contact = $derived(
  [
    job.contact_name.content.trim(),
    job.contact_email,
    job.contact_phone && formatPhone(job.contact_phone),
  ]
    .filter(Boolean)
    .join(", "),
);
const i18n = getI18n();

function describe() {
  const tr = svedit.session.tr;
  addJobDescription(tr, path);
  svedit.session.apply(tr);
}
</script>

<Node {path} tag="li" class="job">
  <TextProperty tag="h3" class="job-title" path={[...path, "title"]} placeholder={i18n.t("editor.canvas.jobTitle")} />
  <TextProperty tag="p" class="job-summary" path={[...path, "summary"]} placeholder={i18n.t("editor.canvas.jobSummary")} />
  {#if job.body.nodes.length > 0}
    <NodeArrayProperty class="job-details" path={[...path, "body"]} />
  {:else}
    <button type="button" class="canvas-add-description" contenteditable="false" onclick={describe}>
      {i18n.t("editor.canvas.addJobDescription")}
    </button>
  {/if}
  {#if contact}
    <p class="job-contact" contenteditable="false">{i18n.t("editor.canvas.jobContact", { contact })}</p>
  {/if}
</Node>
