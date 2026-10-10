<script lang="ts">
import type { Weekday } from "@webmio/model";
import { getI18n } from "$lib/i18n";
import type { MessageKey } from "$lib/i18n/types";
import BusinessFields from "$lib/setup/BusinessFields.svelte";
import PhotosStep from "$lib/setup/PhotosStep.svelte";
import SetupFrame from "$lib/setup/SetupFrame.svelte";
import type { PageProps } from "./$types";

// The guided setup's steps once the project exists (guided-setup spec, "Setup steps").
let { data, form }: PageProps = $props();
const i18n = getI18n();
const MAX_ITEMS = 12;
const DAYS: Weekday[] = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"];
const TITLES = ["business", "design", "contact", "services", "photos", "pages", "preview"];

const errors = $derived<Record<string, string>>(form?.errors ?? {});
const answers = $derived(data.answers);
// What the form held when a step came back with errors, else what was saved.
// biome-ignore lint/suspicious/noExplicitAny: each step's own fields.
const values = $derived<any>(form?.values ?? {});
const title = $derived(i18n.t(`setup.steps.${TITLES[data.step - 1]}` as MessageKey));
const intro = $derived(
  (
    {
      2: "setup.design.intro",
      3: "setup.contact.intro",
      4: "setup.services.intro",
      5: "setup.photos.intro",
      6: "setup.pages.intro",
      7: "setup.preview.intro",
    } as Record<number, string>
  )[data.step],
);
const contact = $derived(answers.contact ?? {});
// The phone's number after its country's prefix, as the field shows it.
const prefix = $derived(data.phoneCountries[0]?.prefix ?? "");
const phoneNumber = $derived.by(() => {
  const phone: string = values.phone ?? contact.phone ?? "";
  return phone.startsWith(prefix) ? phone.slice(prefix.length).trim() : phone;
});
// The hours as given, else the type's typical ones, so most owners only adjust them.
const startHours = () => {
  const given = values.hours ?? contact.hours ?? data.typicalHours;
  return Object.fromEntries(
    DAYS.map((day) => [day, [given[day]?.[0]?.[0] ?? "", given[day]?.[0]?.[1] ?? ""]]),
  ) as Record<Weekday, [string, string]>;
};
// svelte-ignore state_referenced_locally
let hours = $state(startHours());
/** Monday's hours on the other weekdays. */
function copyMonday() {
  for (const day of ["tue", "wed", "thu", "fri"] as const) hours[day] = [...hours.mon];
}
const savedServices = $derived(values.services ?? answers.services ?? []);
// One service to start with; Add a service makes room for another.
// svelte-ignore state_referenced_locally
let serviceRows = $state(Math.max(1, savedServices.length));
const services = $derived(
  Array.from(
    { length: Math.min(MAX_ITEMS, serviceRows) },
    (_, i) => savedServices[i] ?? { name: "", description: "", price: "" },
  ),
);
const photo = (p: { key: string; alt: string } | undefined) =>
  p ? { ...p, width: data.widths[p.key] ?? 480 } : undefined;
const ticked = (id: string) =>
  answers.pages ? answers.pages.includes(id) : data.layouts.some((l) => l.id === id && l.suggested);
</script>

<SetupFrame
  step={data.step}
  total={data.total}
  {title}
  intro={intro ? i18n.t(intro as MessageKey) : undefined}
  back={data.back}
  hasErrors={Object.keys(errors).length > 0}
  continueLabel={data.step === data.total ? i18n.t("setup.preview.create") : undefined}
>
  {#if data.step === 1}
    <BusinessFields types={data.types} values={{ ...answers, ...values }} {errors} />
  {:else if data.step === 2}
    <fieldset>
      <legend class="visually-hidden">{title}</legend>
      {#each data.templates as template (template.id)}
        <label class="choice">
          <input
            type="radio"
            name="template"
            value={template.id}
            checked={(answers.template ?? data.templates[0]?.id) === template.id}
          />
          <span>
            <strong>{template.name}</strong>
            {#if template.suggested}<span class="badge">{i18n.t("setup.design.suggested")}</span>{/if}
            <span class="hint">{template.description}</span>
          </span>
        </label>
      {/each}
    </fieldset>
  {:else if data.step === 3}
    <div class="field">
      <label for="phone">{i18n.t("setup.contact.phone")}</label>
      <div class="phone">
        <select name="phone_country" aria-label={i18n.t("setup.contact.country")}>
          {#each data.phoneCountries as country (country.code)}
            <option value={country.prefix}>{country.flag} {country.prefix}</option>
          {/each}
        </select>
        <input
          id="phone"
          name="phone"
          type="tel"
          autocomplete="tel-national"
          value={phoneNumber}
          aria-invalid={errors.phone ? "true" : undefined}
          aria-describedby={errors.phone ? "phone-error" : undefined}
        />
      </div>
      {#if errors.phone}<p id="phone-error" class="error">{errors.phone}</p>{/if}
    </div>
    <div class="field">
      <label for="email">{i18n.t("setup.contact.email")}</label>
      <input
        id="email"
        name="email"
        type="email"
        value={values.email ?? contact.email ?? ""}
        aria-invalid={errors.email ? "true" : undefined}
        aria-describedby={errors.email ? "email-error" : undefined}
      />
      {#if errors.email}<p id="email-error" class="error">{errors.email}</p>{/if}
    </div>
    <div class="field">
      <label for="street">{i18n.t("setup.contact.street")}</label>
      <input id="street" name="street" autocomplete="street-address" value={values.street ?? contact.street ?? ""} />
    </div>
    <div class="row">
      <div class="field">
        <label for="postal_code">{i18n.t("setup.contact.postalCode")}</label>
        <input id="postal_code" name="postal_code" autocomplete="postal-code" value={values.postal_code ?? contact.postal_code ?? ""} />
      </div>
      <div class="field grow">
        <label for="city">{i18n.t("setup.contact.city")}</label>
        <input id="city" name="city" autocomplete="address-level2" value={values.city ?? contact.city ?? ""} />
      </div>
    </div>
    <fieldset aria-describedby="hours-hint">
      <legend>{i18n.t("setup.contact.hours")}</legend>
      <p id="hours-hint" class="hint">{i18n.t("setup.contact.hoursHint")}</p>
      {#each DAYS as day (day)}
        {@const dayName = i18n.t(`editor.hours.days.${day}` as MessageKey)}
        <div class="day">
          <span class="day-name">{dayName}</span>
          <input
            type="time"
            name={`hours.${day}.opens`}
            bind:value={hours[day][0]}
            aria-label={i18n.t("editor.hours.opens", { day: dayName })}
            aria-invalid={errors[`hours.${day}`] ? "true" : undefined}
          />
          <span aria-hidden="true">–</span>
          <input
            type="time"
            name={`hours.${day}.closes`}
            bind:value={hours[day][1]}
            aria-label={i18n.t("editor.hours.closes", { day: dayName })}
            aria-invalid={errors[`hours.${day}`] ? "true" : undefined}
          />
          {#if day === "mon"}
            <button type="button" class="link" onclick={copyMonday}>{i18n.t("setup.contact.copyMonday")}</button>
          {/if}
          {#if errors[`hours.${day}`]}<p class="error">{dayName}: {errors[`hours.${day}`]}</p>{/if}
        </div>
      {/each}
    </fieldset>
  {:else if data.step === 4}
    {#if errors.services}<p class="error">{errors.services}</p>{/if}
    {#each services as service, i (i)}
      <fieldset>
        <legend>{i18n.t("setup.services.service", { number: i + 1 })}</legend>
        <div class="field">
          <label for={`services.${i}.name`}>{i18n.t("setup.services.name")}</label>
          <input
            id={`services.${i}.name`}
            name={`services.${i}.name`}
            value={service.name ?? ""}
            aria-invalid={errors[`services.${i}.name`] ? "true" : undefined}
          />
          {#if errors[`services.${i}.name`]}<p class="error">{errors[`services.${i}.name`]}</p>{/if}
        </div>
        <div class="field">
          <label for={`services.${i}.description`}>{i18n.t("setup.services.description")}</label>
          <input id={`services.${i}.description`} name={`services.${i}.description`} value={service.description ?? ""} />
        </div>
        <div class="field">
          <label for={`services.${i}.price`}>{i18n.t("setup.services.price")}</label>
          <input id={`services.${i}.price`} name={`services.${i}.price`} value={service.price ?? ""} aria-describedby="price-hint" />
        </div>
      </fieldset>
    {/each}
    <p id="price-hint" class="hint">{i18n.t("setup.services.priceHint")}</p>
    {#if serviceRows < MAX_ITEMS}
      <button type="button" class="add" onclick={() => (serviceRows += 1)}>+ {i18n.t("setup.services.add")}</button>
    {/if}
  {:else if data.step === 5}
    <PhotosStep
      projectId={data.project.id}
      logo={photo(answers.logo)}
      photos={(answers.photos ?? []).map((p) => photo(p) as { key: string; alt: string; width: number })}
      max={MAX_ITEMS}
    />
  {:else if data.step === 6}
    <fieldset>
      <legend class="visually-hidden">{title}</legend>
      {#if errors.pages}<p class="error">{errors.pages}</p>{/if}
      {#each data.layouts as layout (layout.id)}
        <label class="choice">
          {#if layout.id === "home"}
            <input type="checkbox" checked disabled />
          {:else}
            <input type="checkbox" name="pages" value={layout.id} checked={ticked(layout.id)} />
          {/if}
          <span>
            {layout.name}
            {#if layout.id === "home"}<span class="hint">({i18n.t("setup.pages.always")})</span>{/if}
          </span>
        </label>
      {/each}
    </fieldset>
  {:else if data.step === 7}
    {#if data.edited}<p class="hint">{i18n.t("setup.preview.edited")}</p>{/if}
    <iframe class="preview" src={data.preview} title={i18n.t("setup.preview.frame")}></iframe>
    <a href={data.preview} target="_blank" rel="noopener">{i18n.t("setup.preview.open")}</a>
  {/if}
</SetupFrame>

<style>
  .choice {
    display: flex;
    align-items: flex-start;
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

  .choice > span {
    display: flex;
    flex-direction: column;
    gap: var(--ui-space-1);
  }

  .badge {
    font-size: var(--ui-text-xs);
    color: var(--ui-success);
  }

  .row {
    display: flex;
    gap: var(--ui-space-3);
    flex-wrap: wrap;
  }

  .grow {
    flex: 1;
  }

  .day {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: var(--ui-space-2);
  }

  .day-name {
    min-width: 6rem;
  }

  .day input {
    font: inherit;
    padding: var(--ui-space-1) var(--ui-space-2);
    border: 1px solid var(--ui-border-strong);
    border-radius: var(--ui-radius-field);
  }

  .day .error {
    flex-basis: 100%;
  }

  .preview {
    width: 100%;
    height: 32rem;
    border: 1px solid var(--ui-border);
    border-radius: var(--ui-radius-field);
    background: var(--ui-surface);
  }

  .phone {
    display: flex;
    gap: var(--ui-space-2);
  }

  .phone input {
    flex: 1;
  }

  .phone select {
    font: inherit;
    padding: var(--ui-space-2);
    border: 1px solid var(--ui-border-strong);
    border-radius: var(--ui-radius-field);
    background: var(--ui-surface);
  }

  .link {
    background: none;
    border: 0;
    padding: 0;
    color: var(--ui-link);
    text-decoration: underline;
    cursor: pointer;
    font: inherit;
    font-size: var(--ui-text-sm);
  }

  .add {
    align-self: flex-start;
    font: inherit;
    padding: var(--ui-space-2) var(--ui-space-3);
    border: 1px dashed var(--ui-border-strong);
    border-radius: var(--ui-radius-field);
    background: none;
    color: var(--ui-link);
    cursor: pointer;
  }

  .visually-hidden {
    position: absolute;
    width: 1px;
    height: 1px;
    overflow: hidden;
    clip: rect(0 0 0 0);
  }
</style>
