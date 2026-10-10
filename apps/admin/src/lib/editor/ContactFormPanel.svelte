<script lang="ts">
import { getI18n } from "$lib/i18n";
import { type ContactFormKind, setFormButton, setFormKind, setFormRecipient } from "./contact-form";
import { handleTargets, selectionPath } from "./handles";
import { businessView } from "./nodes/business-view";
import type { EditorState } from "./state.svelte";

// The selected contact form's settings (contact-form spec, "Contact form in the editor"): its
// kind, its button and where its messages go. Another address waits for confirmation, which
// is asked for once the site is saved.
let { editor }: { editor: EditorState } = $props();
const i18n = getI18n();

type Form = {
  id: string;
  form_kind: ContactFormKind;
  button: { content: string };
  recipient: string;
};
const form = $derived.by(() => {
  const path = selectionPath(editor.session);
  const block = path ? handleTargets(editor.session, path).block : undefined;
  return block?.type === "contact_form" ? (editor.session.get(block.id) as Form) : undefined;
});
const businessEmail = $derived(businessView(editor.session.doc).info.locations[0]?.email ?? "");

let button = $state("");
let other = $state(false);
let address = $state("");
let error = $state("");
let shownForm = "";
$effect.pre(() => {
  // A new form selected: its stored values. Edits of the same form keep the drafts.
  if (form?.id === shownForm) return;
  shownForm = form?.id ?? "";
  button = form?.button.content ?? "";
  other = (form?.recipient ?? "") !== "";
  address = form?.recipient ?? "";
  error = "";
});

// Which addresses have confirmed, asked again after each save.
let confirmed = $state<Set<string>>(new Set());
$effect(() => {
  if (!form || form.recipient === "") return;
  void editor.version;
  let stale = false;
  fetch(editor.paths.formRecipients)
    .then((response) => (response.ok ? response.json() : []))
    .then((rows: { email: string; confirmed: boolean }[]) => {
      if (!stale) confirmed = new Set(rows.filter((r) => r.confirmed).map((r) => r.email));
    })
    .catch(() => {});
  return () => {
    stale = true;
  };
});

function applyButton() {
  if (form) button = setFormButton(editor.session, form.id, button);
}

function applyAddress() {
  if (!form) return;
  const result = setFormRecipient(editor.session, form.id, other ? address : "");
  if (!result.ok) {
    error = i18n.t("editor.contactFormPanel.notEmail");
    return;
  }
  error = "";
  address = result.value;
}
</script>

{#if form}
  <section class="panel" aria-labelledby="contact-form-panel-title" data-history-keys>
    <h2 id="contact-form-panel-title">{i18n.t("editor.contactFormPanel.title")}</h2>
    <fieldset>
      <legend>{i18n.t("editor.contactFormPanel.kind")}</legend>
      {#each ["contact", "callback"] as const as kind (kind)}
        <label class="choice">
          <input
            type="radio"
            name="contact-form-kind"
            checked={form.form_kind === kind}
            onchange={() => form && setFormKind(editor.session, form.id, kind)}
          />
          {i18n.t(`editor.contactFormPanel.${kind}`)}
        </label>
      {/each}
    </fieldset>
    <label class="field">
      {i18n.t("editor.contactFormPanel.button")}
      <input
        type="text"
        data-i18n-ignore
        bind:value={button}
        onchange={applyButton}
        onkeydown={(e) => e.key === "Enter" && applyButton()}
      />
    </label>
    <fieldset>
      <legend>{i18n.t("editor.contactFormPanel.sendTo")}</legend>
      <label class="choice">
        <input
          type="radio"
          name="contact-form-recipient"
          checked={!other}
          onchange={() => {
            other = false;
            applyAddress();
          }}
        />
        {businessEmail
          ? i18n.t("editor.contactFormPanel.business", { email: businessEmail })
          : i18n.t("editor.contactFormPanel.businessNone")}
      </label>
      <label class="choice">
        <input
          type="radio"
          name="contact-form-recipient"
          checked={other}
          onchange={() => (other = true)}
        />
        {i18n.t("editor.contactFormPanel.other")}
      </label>
      {#if other}
        <input
          type="email"
          aria-label={i18n.t("editor.contactFormPanel.otherAddress")}
          data-i18n-ignore
          bind:value={address}
          onchange={applyAddress}
          onkeydown={(e) => e.key === "Enter" && applyAddress()}
        />
        {#if form.recipient !== "" && !confirmed.has(form.recipient)}
          <p class="hint" role="status">
            {i18n.t("editor.contactFormPanel.waiting", { email: form.recipient })}
          </p>
        {/if}
      {/if}
    </fieldset>
    {#if error}<p class="error" role="alert">{error}</p>{/if}
    <p class="hint"><a href={editor.paths.messages}>{i18n.t("editor.contactFormPanel.messages")}</a></p>
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

  fieldset {
    margin: 0.5rem 0 0;
    padding: 0;
    border: 0;
    font-size: 0.9rem;
  }

  legend {
    padding: 0;
    margin-bottom: 0.25rem;
  }

  .choice {
    display: flex;
    gap: 0.4rem;
    align-items: baseline;
    margin-top: 0.25rem;
  }

  .field {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
    margin-top: 0.75rem;
    font-size: 0.9rem;
  }

  fieldset > input[type="email"] {
    width: 100%;
    margin-top: 0.4rem;
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
