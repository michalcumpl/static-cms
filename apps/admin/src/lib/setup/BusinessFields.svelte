<script lang="ts">
import { getI18n } from "$lib/i18n";

// The guided setup's first step: the business's type, name and one sentence about it.
let {
  types,
  values,
  errors = {},
}: {
  types: { id: string; name: string }[];
  values: { type?: string; name?: string; sentence?: string };
  errors?: Record<string, string>;
} = $props();
const i18n = getI18n();
</script>

<fieldset class="types" aria-describedby={errors.type ? "type-error" : undefined}>
  <legend>{i18n.t("setup.business.type")}</legend>
  <div class="choices">
    {#each types as type (type.id)}
      <label class="choice">
        <input type="radio" name="type" value={type.id} checked={values.type === type.id} required />
        {type.name}
      </label>
    {/each}
  </div>
  {#if errors.type}<p id="type-error" class="error">{errors.type}</p>{/if}
</fieldset>
<div class="field">
  <label for="name">{i18n.t("setup.business.name")}</label>
  <input
    id="name"
    name="name"
    required
    value={values.name ?? ""}
    aria-invalid={errors.name ? "true" : undefined}
    aria-describedby={errors.name ? "name-error" : undefined}
  />
  {#if errors.name}<p id="name-error" class="error">{errors.name}</p>{/if}
</div>
<div class="field">
  <label for="sentence">{i18n.t("setup.business.sentence")}</label>
  <input id="sentence" name="sentence" maxlength="200" value={values.sentence ?? ""} aria-describedby="sentence-hint" />
  <p id="sentence-hint" class="hint">{i18n.t("setup.business.sentenceHint")}</p>
</div>

<style>
  .choices {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(11rem, 1fr));
    gap: var(--ui-space-2);
  }

  .choice {
    display: flex;
    align-items: center;
    gap: var(--ui-space-2);
    padding: var(--ui-space-2) var(--ui-space-3);
    border: 1px solid var(--ui-border);
    border-radius: var(--ui-radius-field);
    cursor: pointer;
  }

  .choice:has(input:checked) {
    border-color: var(--ui-link);
    background: var(--ui-soft);
  }
</style>
