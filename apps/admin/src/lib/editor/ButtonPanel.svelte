<script lang="ts">
import { getI18n } from "$lib/i18n";
import {
  addButton,
  canAddButton,
  canRemoveButton,
  removeButton,
  selectedButton,
  setButtonAddress,
  setButtonPage,
} from "./buttons";
import type { EditorState } from "./state.svelte";

// Where the selected button of a hero, banner or call to action points, and adding or removing
// buttons (cta-and-testimonials design.md decision 3).
let { editor }: { editor: EditorState } = $props();
const i18n = getI18n();

type Doc = Parameters<typeof canRemoveButton>[0];
const found = $derived(selectedButton(editor.session));
const button = $derived(found.button);
const block = $derived(found.block);

// The target being edited: the kind shown, the address draft and its error.
let kind = $state<"page" | "address">("page");
let address = $state("");
let error = $state("");
$effect.pre(() => {
  kind = button?.type === "external_link" ? "address" : "page";
  address = button?.url ?? "";
  error = "";
});

function choosePage(pageId: string) {
  if (button) setButtonPage(editor.session, button.id, pageId);
}

function applyAddress() {
  if (!button) return;
  const result = setButtonAddress(editor.session, button.id, address);
  error = result.ok ? "" : i18n.t(`editor.links.${result.reason}`);
}

const canRemove = $derived(
  button ? canRemoveButton(editor.session.doc as unknown as Doc, button.id) : false,
);
</script>

{#if block}
  <section class="panel" aria-labelledby="button-panel-title" data-history-keys>
    <h2 id="button-panel-title">{button ? i18n.t("editor.buttons.button") : i18n.t("editor.buttons.buttons")}</h2>
    {#if button}
      <fieldset>
        <legend>{i18n.t("editor.buttons.linksTo")}</legend>
        <label class="check">
          <input
            type="radio"
            name="button-target"
            checked={kind === "page"}
            onchange={() => {
              kind = "page";
              choosePage(button.page_id || editor.homeId);
            }}
          />
          {i18n.t("editor.buttons.page")}
        </label>
        {#if kind === "page"}
          <select
            aria-label={i18n.t("editor.buttons.pageLabel")}
            value={button.page_id}
            onchange={(e) => choosePage(e.currentTarget.value)}
          >
            {#each editor.pages as page (page.id)}
              <option value={page.id}>{page.title}</option>
            {/each}
          </select>
        {/if}
        <label class="check">
          <input
            type="radio"
            name="button-target"
            checked={kind === "address"}
            onchange={() => (kind = "address")}
          />
          {i18n.t("editor.buttons.address")}
        </label>
        {#if kind === "address"}
          <input
            type="text"
            aria-label={i18n.t("editor.buttons.addressLabel")}
            placeholder={i18n.t("editor.buttons.addressExample")}
            bind:value={address}
            onchange={applyAddress}
            onkeydown={(e) => e.key === "Enter" && applyAddress()}
            aria-invalid={error !== ""}
            aria-describedby={error ? "button-address-error" : undefined}
          />
          {#if error}
            <p class="error" id="button-address-error" role="alert">{error}</p>
          {/if}
        {/if}
      </fieldset>
      <button
        type="button"
        class="danger"
        disabled={!canRemove}
        onclick={() => removeButton(editor.session, button.id)}
      >
        {i18n.t("editor.buttons.remove")}
      </button>
      {#if !canRemove}
        <p class="hint">{i18n.t("editor.buttons.keepOne")}</p>
      {/if}
    {/if}
    {#if canAddButton(block)}
      <button type="button" onclick={() => addButton(editor.session, block.id)}>
        {i18n.t("editor.buttons.add")}
      </button>
    {/if}
  </section>
{/if}

<style>
  .panel {
    padding: 1rem;
    border-bottom: 1px solid var(--ui-border);
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: 0.5rem;
  }

  h2 {
    margin: 0;
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
    gap: 0.35rem;
    width: 100%;
  }

  legend {
    font-size: 0.9rem;
    margin-bottom: 0.25rem;
  }

  .check {
    display: flex;
    gap: 0.4rem;
    align-items: center;
    font-size: 0.9rem;
  }

  select,
  input[type="text"] {
    font: inherit;
    padding: 0.3rem 0.4rem;
  }

  .error {
    margin: 0;
    color: var(--ui-problem);
    font-size: 0.85rem;
  }

  .hint {
    margin: 0;
    font-size: 0.85rem;
    color: var(--ui-muted);
  }

  .danger {
    color: var(--ui-problem);
  }
</style>
