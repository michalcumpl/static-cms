<script lang="ts">
import { BUSINESS_TYPES } from "@webmio/model";
import { getI18n } from "$lib/i18n";
import {
  addLocation,
  businessOf,
  locationsOf,
  setBusinessName,
  setBusinessType,
  setShowInFooter,
} from "./business";
import LocationSettings from "./LocationSettings.svelte";
import { businessFieldElementId } from "./locate";
import SharedNote from "./SharedNote.svelte";
import SocialProfilesEditor from "./SocialProfilesEditor.svelte";
import type { EditorState } from "./state.svelte";

// The business the site is for (business-info design.md decision 7): facts stored once, shown
// by the contact and opening hours blocks, the footer and the structured data. Its contact
// details and opening hours belong to its locations (business-locations design decision 7).
let { editor }: { editor: EditorState } = $props();
const i18n = getI18n();

const business = $derived(businessOf(editor.session.doc));
const locations = $derived(locationsOf(editor.session.doc));
// Outside the primary language only the names and the hours notes are this language's own.
const shared = $derived(editor.sharedReadOnly);
const siteName = $derived(
  (editor.session.doc.nodes[editor.siteId] as unknown as { name: string }).name,
);

const TYPES = BUSINESS_TYPES;

function add() {
  const id = addLocation(editor.session);
  if (id)
    queueMicrotask(() => document.getElementById(businessFieldElementId("name", id))?.focus());
}
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
      oninput={(e) => setBusinessName(editor.session, e.currentTarget.value)}
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

    <h3>{i18n.t("editor.business.locations")}</h3>
    {#each locations as location, index (location.id)}
      <LocationSettings {editor} {location} {index} count={locations.length} {shared} />
    {/each}
    {#if !shared}
      <button type="button" class="add" onclick={add}>{i18n.t("editor.business.addLocation")}</button>
    {/if}

    <SocialProfilesEditor {editor} disabled={shared} />

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


  h3 {
    margin: 1rem 0 0;
    font-size: 0.95rem;
  }

  .add {
    align-self: flex-start;
    margin-top: 0.75rem;
  }

  .check {
    display: flex;
    gap: 0.4rem;
    align-items: center;
  }

</style>
