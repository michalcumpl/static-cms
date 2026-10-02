<script lang="ts">
import { BUSINESS_TYPES, formatPhone } from "@static-cms/site";
import type { FullAutoFill } from "svelte/elements";
import { getI18n } from "$lib/i18n";
import {
  type BusinessTextField,
  businessOf,
  setBusinessField,
  setBusinessType,
  setPhone,
  setShowInFooter,
} from "./business";
import { businessFieldElementId } from "./locate";
import OpeningHoursEditor from "./OpeningHoursEditor.svelte";
import SharedNote from "./SharedNote.svelte";
import type { EditorState } from "./state.svelte";

// The business the site is for (business-info design.md decision 7): facts stored once, shown
// by the contact and opening hours blocks, the footer and the structured data.
let { editor }: { editor: EditorState } = $props();
const i18n = getI18n();

const business = $derived(businessOf(editor.session.doc));
// Outside the primary language only the name and the hours note are this language's own.
const shared = $derived(editor.sharedReadOnly);
const siteName = $derived(
  (editor.session.doc.nodes[editor.siteId] as unknown as { name: string }).name,
);

const TYPES = BUSINESS_TYPES;

const TEXT_FIELDS: [BusinessTextField, "street" | "postalCode" | "city", FullAutoFill][] = [
  ["street", "street", "street-address"],
  ["postal_code", "postalCode", "postal-code"],
  ["city", "city", "address-level2"],
];

// The phone is typed into a draft and normalised when the owner leaves the field.
let phoneDraft = $state("");
$effect.pre(() => {
  phoneDraft = formatPhone(business?.phone ?? "");
});
function commitPhone() {
  phoneDraft = formatPhone(setPhone(editor.session, phoneDraft));
}
$effect(() => editor.registerDraft(commitPhone));
</script>

{#if business}
  <section class="panel" aria-labelledby="business-panel-title" data-history-keys>
    <h2 id="business-panel-title">{i18n.t("editor.business.title")}</h2>
    {#if shared}<SharedNote {editor} tab="business" />{/if}

    <label for={businessFieldElementId("name")}>{i18n.t("editor.business.name")}</label>
    <input
      id={businessFieldElementId("name")}
      type="text"
      value={business.name}
      placeholder={siteName}
      oninput={(e) => setBusinessField(editor.session, "name", e.currentTarget.value)}
    />

    <label for={businessFieldElementId("business_type")}>{i18n.t("editor.business.type")}</label>
    <select
      id={businessFieldElementId("business_type")}
      value={business.business_type}
      disabled={shared}
      onchange={(e) => setBusinessType(editor.session, e.currentTarget.value)}
    >
      {#each TYPES as value (value)}
        <option {value}>{i18n.t(`editor.business.types.${value}`)}</option>
      {/each}
    </select>

    {#each TEXT_FIELDS as [field, label, autocomplete] (field)}
      <label for={businessFieldElementId(field)}>{i18n.t(`editor.business.${label}`)}</label>
      <input
        id={businessFieldElementId(field)}
        type="text"
        {autocomplete}
      disabled={shared}
        value={business[field]}
        oninput={(e) => setBusinessField(editor.session, field, e.currentTarget.value)}
      />
    {/each}

    <label for={businessFieldElementId("country")}>{i18n.t("editor.business.country")}</label>
    <input
      id={businessFieldElementId("country")}
      type="text"
      maxlength="2"
      class="short"
      disabled={shared}
      value={business.country}
      oninput={(e) =>
        setBusinessField(editor.session, "country", e.currentTarget.value.toUpperCase())}
    />

    <label for={businessFieldElementId("phone")}>{i18n.t("editor.business.phone")}</label>
    <input
      id={businessFieldElementId("phone")}
      type="tel"
      disabled={shared}
      bind:value={phoneDraft}
      onchange={commitPhone}
      onkeydown={(e) => e.key === "Enter" && commitPhone()}
    />

    <label for={businessFieldElementId("email")}>{i18n.t("editor.business.email")}</label>
    <input
      id={businessFieldElementId("email")}
      type="email"
      disabled={shared}
      value={business.email}
      oninput={(e) => setBusinessField(editor.session, "email", e.currentTarget.value)}
    />

    <label for={businessFieldElementId("map_url")}>{i18n.t("editor.business.map")}</label>
    <input
      id={businessFieldElementId("map_url")}
      type="url"
      disabled={shared}
      value={business.map_url}
      aria-describedby="business-map-hint"
      oninput={(e) => setBusinessField(editor.session, "map_url", e.currentTarget.value)}
    />
    <p class="hint" id="business-map-hint">
      {i18n.t("editor.business.mapHint")}
    </p>

    <OpeningHoursEditor {editor} disabled={shared} />

    <label for={businessFieldElementId("hours_note")}>{i18n.t("editor.business.hoursNote")}</label>
    <input
      id={businessFieldElementId("hours_note")}
      type="text"
      value={business.hours_note}
      placeholder={i18n.t("editor.business.hoursNoteExample")}
      oninput={(e) => setBusinessField(editor.session, "hours_note", e.currentTarget.value)}
    />

    <label class="check">
      <input
        type="checkbox"
        checked={business.show_in_footer}
      disabled={shared}
        onchange={(e) => setShowInFooter(editor.session, e.currentTarget.checked)}
      />
      {i18n.t("editor.business.showInFooter")}
    </label>
  </section>
{/if}

<style>
  .panel {
    padding: 1rem;
    border-bottom: 1px solid var(--ui-border);
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
  }

  h2 {
    margin: 0 0 0.5rem;
    font-size: 0.8rem;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: var(--ui-muted);
  }

  label {
    margin-top: 0.5rem;
    font-size: 0.9rem;
  }

  input:not([type="checkbox"]),
  select {
    font: inherit;
    padding: 0.3rem 0.4rem;
  }

  .short {
    width: 4rem;
  }

  .check {
    display: flex;
    gap: 0.4rem;
    align-items: center;
  }

  .hint {
    margin: 0;
    font-size: 0.85rem;
    color: var(--ui-muted);
  }
</style>
