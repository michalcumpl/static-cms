<script lang="ts">
import { getI18n } from "$lib/i18n";
import {
  type ContactSwitch,
  locationsOf,
  selectedBusinessBlock,
  selectedContactBlock,
  setBlockLocation,
  setContactSwitch,
} from "./business";
import {
  addItem,
  type CollectionMode,
  chooseItem,
  setBlockMode,
  unchosenItems,
} from "./collections";
import { handleTargets, selectionPath } from "./handles";
import type { EditorState } from "./state.svelte";

// Options of the selected block: which of the business details a contact block shows, and what
// a collection block shows (business-collections, "Collection block mode").
let { editor }: { editor: EditorState } = $props();
const i18n = getI18n();

const block = $derived(selectedContactBlock(editor.session));
// Which location a contact or opening hours block shows, once there are several
// (business-locations design decision 8).
const businessBlock = $derived(selectedBusinessBlock(editor.session));
const locations = $derived(locationsOf(editor.session.doc));
const SWITCHES: ContactSwitch[] = ["show_address", "show_phone", "show_email", "show_map"];

const collectionBlock = $derived.by(() => {
  const path = selectionPath(editor.session);
  const target = path ? handleTargets(editor.session, path).block : undefined;
  return target ? editor.collections.find((view) => view.blockId === target.id) : undefined;
});
const choices = $derived(
  collectionBlock?.mode === "chosen" ? unchosenItems(editor.session.doc, collectionBlock) : [],
);
let picked = $state("");

/** How an item is named in the list of items to add: its first text. */
function itemLabel(id: string): string {
  const item = editor.session.get(id) as Record<string, { content?: string }> | undefined;
  const text = item?.name?.content ?? item?.quote?.content ?? item?.question?.content ?? "";
  return text.trim() || i18n.t("editor.items.other");
}

function setMode(mode: CollectionMode) {
  if (collectionBlock) setBlockMode(editor.session, editor.siteId, collectionBlock.blockId, mode);
}

function addPicked() {
  if (!collectionBlock || picked === "") return;
  chooseItem(editor.session, collectionBlock, picked);
  picked = "";
}
</script>

{#if collectionBlock}
  {@const name = collectionBlock.collection}
  <section class="panel" aria-labelledby="collection-panel-title" data-history-keys>
    <h2 id="collection-panel-title">{i18n.t(`editor.blocks.${collectionBlock.type}.name`)}</h2>
    <fieldset>
      <legend>{i18n.t("editor.collectionBlock.show")}</legend>
      {#each ["all", "chosen"] as const as mode (mode)}
        <label class="check">
          <input
            type="radio"
            name="collection-mode"
            checked={collectionBlock.mode === mode}
            onchange={() => setMode(mode)}
          />
          {i18n.t(`editor.collectionBlock.${mode}.${name}`)}
        </label>
      {/each}
    </fieldset>
    {#if collectionBlock.mode === "chosen" && choices.length > 0}
      <div class="add-existing">
        <label>
          {i18n.t("editor.collectionBlock.addExisting")}
          <select bind:value={picked}>
            <option value="">{i18n.t("editor.collectionBlock.choose")}</option>
            {#each choices as id (id)}
              <option value={id}>{itemLabel(id)}</option>
            {/each}
          </select>
        </label>
        <button type="button" disabled={picked === ""} onclick={addPicked}>
          {i18n.t("editor.collectionBlock.add")}
        </button>
      </div>
    {/if}
    {#if !editor.sharedReadOnly}
      <button
        type="button"
        class="new-item"
        onclick={() => collectionBlock && addItem(editor.session, editor.siteId, collectionBlock)}
      >
        {i18n.t(`editor.collectionBlock.newItem.${name}`)}
      </button>
    {/if}
  </section>
{/if}

{#if businessBlock && locations.length > 1}
  <section class="panel" aria-labelledby="location-panel-title" data-history-keys>
    <h2 id="location-panel-title">{i18n.t("editor.businessBlock.title")}</h2>
    <label class="field">
      {i18n.t("editor.businessBlock.location")}
      <select
        value={businessBlock.location_id}
        onchange={(e) => setBlockLocation(editor.session, businessBlock.id, e.currentTarget.value)}
      >
        <option value="">{i18n.t("editor.businessBlock.allLocations")}</option>
        {#each locations as location, index (location.id)}
          <option value={location.id}>
            {location.name.trim() || i18n.t("editor.business.location", { number: index + 1 })}
          </option>
        {/each}
      </select>
    </label>
  </section>
{/if}

{#if block}
  <section class="panel" aria-labelledby="block-panel-title" data-history-keys>
    <h2 id="block-panel-title">{i18n.t("editor.contactBlock.title")}</h2>
    <fieldset>
      <legend>{i18n.t("editor.contactBlock.show")}</legend>
      {#each SWITCHES as which (which)}
        <label class="check">
          <input
            type="checkbox"
            checked={block[which]}
            onchange={(e) => setContactSwitch(editor.session, block.id, which, e.currentTarget.checked)}
          />
          {i18n.t(`editor.contactBlock.${which}`)}
        </label>
      {/each}
    </fieldset>
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
    margin: 0;
    padding: 0;
    border: 0;
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
  }

  legend {
    font-size: 0.9rem;
    margin-bottom: 0.25rem;
  }

  .add-existing {
    display: flex;
    gap: 0.4rem;
    align-items: end;
    margin-top: 0.75rem;
    font-size: 0.9rem;
  }

  .add-existing label {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
  }

  .new-item {
    margin-top: 0.75rem;
  }

  .field {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
    font-size: 0.9rem;
  }

  .check {
    display: flex;
    gap: 0.4rem;
    align-items: center;
    font-size: 0.9rem;
  }
</style>
