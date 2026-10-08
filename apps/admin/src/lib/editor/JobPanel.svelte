<script lang="ts">
import { getI18n } from "$lib/i18n";
import { handleTargets, selectionPath } from "./handles";
import { type JobContactField, setJobContact } from "./jobs";
import type { EditorState } from "./state.svelte";

// The contact of the job that is selected or holds the caret (jobs design decision 3): whom to
// write to or call. A value that isn't an email or a phone is refused, keeping the last one.
let { editor }: { editor: EditorState } = $props();
const i18n = getI18n();

type Job = {
  id: string;
  contact_name: { content: string };
  contact_email: string;
  contact_phone: string;
};
const job = $derived.by(() => {
  const path = selectionPath(editor.session);
  const item = path ? handleTargets(editor.session, path).item : undefined;
  return item?.type === "job" ? (editor.session.get(item.id) as Job) : undefined;
});

const FIELDS: { field: JobContactField; type: string; label: "name" | "email" | "phone" }[] = [
  { field: "contact_name", type: "text", label: "name" },
  { field: "contact_email", type: "email", label: "email" },
  { field: "contact_phone", type: "tel", label: "phone" },
];
const stored = (field: JobContactField) =>
  job ? (field === "contact_name" ? job.contact_name.content : job[field]) : "";

let drafts = $state<Record<JobContactField, string>>({
  contact_name: "",
  contact_email: "",
  contact_phone: "",
});
let error = $state("");
let shownJob = "";
$effect.pre(() => {
  // A new job selected: its stored values. Edits of the same job keep the drafts.
  if (job?.id === shownJob) return;
  shownJob = job?.id ?? "";
  for (const { field } of FIELDS) drafts[field] = stored(field);
  error = "";
});

function apply(field: JobContactField) {
  if (!job) return;
  const result = setJobContact(editor.session, job.id, field, drafts[field]);
  if (!result.ok) {
    error = i18n.t(
      result.reason === "email" ? "editor.jobPanel.notEmail" : "editor.jobPanel.notPhone",
    );
    return;
  }
  error = "";
  drafts[field] = result.value;
}
</script>

{#if job}
  <section class="panel" aria-labelledby="job-panel-title" data-history-keys>
    <h2 id="job-panel-title">{i18n.t("editor.jobPanel.title")}</h2>
    <p class="hint">{i18n.t("editor.jobPanel.hint")}</p>
    {#each FIELDS as { field, type, label } (field)}
      <label class="field">
        {i18n.t(`editor.jobPanel.${label}`)}
        <input
          {type}
          data-i18n-ignore
          bind:value={drafts[field]}
          onchange={() => apply(field)}
          onkeydown={(e) => e.key === "Enter" && apply(field)}
        />
      </label>
    {/each}
    {#if error}<p class="error" role="alert">{error}</p>{/if}
  </section>
{/if}

<style>
  .panel {
    padding: 1rem;
    border-bottom: 1px solid var(--ui-border);
  }

  h2 {
    margin: 0 0 0.5rem;
    font-size: 0.8rem;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: var(--ui-muted);
  }

  .field {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
    margin-top: 0.5rem;
    font-size: 0.9rem;
  }

  .hint,
  .error {
    margin: 0.5rem 0 0;
    font-size: 0.85rem;
  }

  .hint {
    color: var(--ui-muted);
  }

  .error {
    color: var(--ui-danger, #b42318);
  }
</style>
