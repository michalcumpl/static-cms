<script lang="ts">
import { formatPhone } from "@static-cms/site";
import type { FullAutoFill } from "svelte/elements";
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
import type { EditorState } from "./state.svelte";

// The business the site is for (business-info design.md decision 7): facts stored once, shown
// by the contact and opening hours blocks, the footer and the structured data.
let { editor }: { editor: EditorState } = $props();

const business = $derived(businessOf(editor.session.doc));
const siteName = $derived(
  (editor.session.doc.nodes[editor.siteId] as unknown as { name: string }).name,
);

const TYPES: [string, string][] = [
  ["LocalBusiness", "Other local business"],
  ["Bakery", "Bakery"],
  ["CafeOrCoffeeShop", "Café"],
  ["Restaurant", "Restaurant"],
  ["Store", "Shop"],
  ["HairSalon", "Hairdresser"],
  ["BeautySalon", "Beauty salon"],
  ["ProfessionalService", "Professional services"],
  ["MedicalBusiness", "Medical practice"],
  ["SportsActivityLocation", "Sports and fitness"],
];

const TEXT_FIELDS: [BusinessTextField, string, FullAutoFill][] = [
  ["street", "Street and number", "street-address"],
  ["postal_code", "Postal code", "postal-code"],
  ["city", "City", "address-level2"],
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
    <h2 id="business-panel-title">Business</h2>

    <label for={businessFieldElementId("name")}>Name</label>
    <input
      id={businessFieldElementId("name")}
      type="text"
      value={business.name}
      placeholder={siteName}
      oninput={(e) => setBusinessField(editor.session, "name", e.currentTarget.value)}
    />

    <label for={businessFieldElementId("business_type")}>Type of business</label>
    <select
      id={businessFieldElementId("business_type")}
      value={business.business_type}
      onchange={(e) => setBusinessType(editor.session, e.currentTarget.value)}
    >
      {#each TYPES as [value, label] (value)}
        <option {value}>{label}</option>
      {/each}
    </select>

    {#each TEXT_FIELDS as [field, label, autocomplete] (field)}
      <label for={businessFieldElementId(field)}>{label}</label>
      <input
        id={businessFieldElementId(field)}
        type="text"
        {autocomplete}
        value={business[field]}
        oninput={(e) => setBusinessField(editor.session, field, e.currentTarget.value)}
      />
    {/each}

    <label for={businessFieldElementId("country")}>Country (two-letter code)</label>
    <input
      id={businessFieldElementId("country")}
      type="text"
      maxlength="2"
      class="short"
      value={business.country}
      oninput={(e) =>
        setBusinessField(editor.session, "country", e.currentTarget.value.toUpperCase())}
    />

    <label for={businessFieldElementId("phone")}>Phone</label>
    <input
      id={businessFieldElementId("phone")}
      type="tel"
      bind:value={phoneDraft}
      onchange={commitPhone}
      onkeydown={(e) => e.key === "Enter" && commitPhone()}
    />

    <label for={businessFieldElementId("email")}>Email</label>
    <input
      id={businessFieldElementId("email")}
      type="email"
      value={business.email}
      oninput={(e) => setBusinessField(editor.session, "email", e.currentTarget.value)}
    />

    <label for={businessFieldElementId("map_url")}>Map address (optional)</label>
    <input
      id={businessFieldElementId("map_url")}
      type="url"
      value={business.map_url}
      aria-describedby="business-map-hint"
      oninput={(e) => setBusinessField(editor.session, "map_url", e.currentTarget.value)}
    />
    <p class="hint" id="business-map-hint">
      Paste the link to your listing on Google Maps or Mapy.com. Without it, "Show on map"
      searches for the address.
    </p>

    <OpeningHoursEditor {editor} />

    <label for={businessFieldElementId("hours_note")}>Note on the opening hours</label>
    <input
      id={businessFieldElementId("hours_note")}
      type="text"
      value={business.hours_note}
      placeholder="Closed on public holidays"
      oninput={(e) => setBusinessField(editor.session, "hours_note", e.currentTarget.value)}
    />

    <label class="check">
      <input
        type="checkbox"
        checked={business.show_in_footer}
        onchange={(e) => setShowInFooter(editor.session, e.currentTarget.checked)}
      />
      Show contact details in the footer
    </label>
  </section>
{/if}

<style>
  .panel {
    padding: 1rem;
    border-bottom: 1px solid #ddd;
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
  }

  h2 {
    margin: 0 0 0.5rem;
    font-size: 0.8rem;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: #555;
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
    color: #555;
  }
</style>
