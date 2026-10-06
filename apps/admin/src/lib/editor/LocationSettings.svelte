<script lang="ts">
import { formatPhone } from "@webmio/render";
import type { FullAutoFill } from "svelte/elements";
import { getI18n } from "$lib/i18n";
import {
  blocksChoosing,
  type LocationFields,
  type LocationTextField,
  moveLocation,
  removeLocation,
  setLocationField,
  setPhone,
} from "./business";
import { businessFieldElementId } from "./locate";
import OpeningHoursEditor from "./OpeningHoursEditor.svelte";
import type { EditorState } from "./state.svelte";

// One location of the business (business-locations design decision 7): its name, address,
// contact details and opening hours. Outside the primary language only the name and the hours
// note are this language's own.
let {
  editor,
  location,
  index,
  count,
  shared,
}: {
  editor: EditorState;
  location: LocationFields;
  index: number;
  count: number;
  shared: boolean;
} = $props();
const i18n = getI18n();
const id = (field: Parameters<typeof businessFieldElementId>[0]) =>
  businessFieldElementId(field, location.id);
const title = $derived(
  location.name.trim() ||
    (index === 0
      ? i18n.t("editor.business.mainLocation")
      : i18n.t("editor.business.location", { number: index + 1 })),
);

const TEXT_FIELDS: [LocationTextField, "street" | "postalCode" | "city", FullAutoFill][] = [
  ["street", "street", "street-address"],
  ["postal_code", "postalCode", "postal-code"],
  ["city", "city", "address-level2"],
];

// The phone is typed into a draft and normalised when the owner leaves the field.
let phoneDraft = $state("");
$effect.pre(() => {
  phoneDraft = formatPhone(location.phone);
});
function commitPhone() {
  phoneDraft = formatPhone(setPhone(editor.session, location.id, phoneDraft));
}
$effect(() => editor.registerDraft(commitPhone));

// Removing a location some blocks chose asks first (business-locations, "Business settings").
let confirming = $state(false);
const choosers = $derived(blocksChoosing(editor.session.doc, location.id));
function remove() {
  if (choosers.length > 0 && !confirming) {
    confirming = true;
    return;
  }
  confirming = false;
  removeLocation(editor.session, location.id);
}
const set = (field: LocationTextField) => (e: Event) =>
  setLocationField(editor.session, location.id, field, (e.currentTarget as HTMLInputElement).value);
</script>

<fieldset class="location">
  <legend>
    {title}{#if index === 0 && count > 1 && location.name.trim() !== ""}<span class="main"> · {i18n.t("editor.business.mainLocation")}</span>{/if}
  </legend>

  <label for={id("name")}>{i18n.t("editor.business.locationName")}</label>
  <input
    id={id("name")}
    type="text"
    value={location.name}
    aria-describedby="{id('name')}-hint"
    oninput={set("name")}
  />
  <p class="hint" id="{id('name')}-hint">{i18n.t("editor.business.locationNameHint")}</p>

  {#each TEXT_FIELDS as [field, label, autocomplete] (field)}
    <label for={id(field)}>{i18n.t(`editor.business.${label}`)}</label>
    <input
      id={id(field)}
      type="text"
      {autocomplete}
      disabled={shared}
      value={location[field]}
      oninput={set(field)}
    />
  {/each}

  <label for={id("country")}>{i18n.t("editor.business.country")}</label>
  <input
    id={id("country")}
    type="text"
    maxlength="2"
    class="short"
    disabled={shared}
    value={location.country}
    oninput={(e) =>
      setLocationField(editor.session, location.id, "country", e.currentTarget.value.toUpperCase())}
  />

  <label for={id("phone")}>{i18n.t("editor.business.phone")}</label>
  <input
    id={id("phone")}
    type="tel"
    disabled={shared}
    bind:value={phoneDraft}
    onchange={commitPhone}
    onkeydown={(e) => e.key === "Enter" && commitPhone()}
  />

  <label for={id("email")}>{i18n.t("editor.business.email")}</label>
  <input id={id("email")} type="email" disabled={shared} value={location.email} oninput={set("email")} />

  <label for={id("map_url")}>{i18n.t("editor.business.map")}</label>
  <input
    id={id("map_url")}
    type="url"
    disabled={shared}
    value={location.map_url}
    aria-describedby="{id('map_url')}-hint"
    oninput={set("map_url")}
  />
  <p class="hint" id="{id('map_url')}-hint">{i18n.t("editor.business.mapHint")}</p>

  <OpeningHoursEditor {editor} locationId={location.id} disabled={shared} />

  <label for={id("hours_note")}>{i18n.t("editor.business.hoursNote")}</label>
  <input
    id={id("hours_note")}
    type="text"
    value={location.hours_note}
    placeholder={i18n.t("editor.business.hoursNoteExample")}
    oninput={set("hours_note")}
  />

  {#if !shared && count > 1}
    <div class="actions">
      <button type="button" disabled={index === 0} onclick={() => moveLocation(editor.session, location.id, -1)}>
        {i18n.t("editor.business.moveLocationUp")}
      </button>
      <button type="button" disabled={index === count - 1} onclick={() => moveLocation(editor.session, location.id, 1)}>
        {i18n.t("editor.business.moveLocationDown")}
      </button>
      {#if !confirming}
        <button type="button" onclick={remove}>{i18n.t("editor.business.removeLocation")}</button>
      {/if}
    </div>
    {#if confirming}
      <div class="confirm" role="alert">
        <p>
          {i18n.t("editor.business.locationShownOn", {
            pages: [...new Set(choosers.map((c) => c.pageTitle))].join(", "),
          })}
        </p>
        <button type="button" onclick={remove}>{i18n.t("editor.business.removeAnyway")}</button>
        <button type="button" onclick={() => (confirming = false)}>{i18n.t("editor.business.keep")}</button>
      </div>
    {/if}
  {/if}
</fieldset>

<style>
  .location {
    margin: 0.75rem 0 0;
    padding: 0.75rem;
    border: 1px solid var(--ui-border);
    border-radius: var(--ui-radius, 12px);
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
  }

  legend {
    font-weight: 600;
    padding: 0 0.25rem;
  }

  .main {
    font-weight: 400;
    color: var(--ui-muted);
  }

  label {
    margin-top: 0.5rem;
    font-size: 0.9rem;
  }

  input {
    font: inherit;
    padding: 0.3rem 0.4rem;
  }

  .short {
    width: 4rem;
  }

  .hint {
    margin: 0;
    font-size: 0.85rem;
    color: var(--ui-muted);
  }

  .actions,
  .confirm {
    display: flex;
    flex-wrap: wrap;
    gap: 0.4rem;
    margin-top: 0.75rem;
    align-items: center;
  }

  .confirm p {
    margin: 0;
    flex-basis: 100%;
    font-size: 0.9rem;
  }
</style>
