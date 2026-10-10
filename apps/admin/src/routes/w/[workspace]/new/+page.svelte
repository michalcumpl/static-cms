<script lang="ts">
import { getI18n } from "$lib/i18n";
import Button from "$lib/ui/Button.svelte";
import Card from "$lib/ui/Card.svelte";
import Page from "$lib/ui/Page.svelte";
import PageHeader from "$lib/ui/PageHeader.svelte";
import type { PageProps } from "./$types";

// Two ways to a new website, side by side (accounts, "Projects"): empty, or from the owner's
// current website by its address (site-import, "Starting an import").
let { data, form }: PageProps = $props();
const i18n = getI18n();
const importError = $derived(form && "importError" in form ? form.importError : undefined);
const nameMissing = $derived(Boolean(form && "missing" in form && form.missing));
</script>

<svelte:head>
  <title>{i18n.t("common.pageTitle", { page: i18n.t("newProject.title") })}</title>
</svelte:head>

<Page width="narrow">
  <PageHeader
    title={i18n.t("newProject.heading", { workspace: data.workspace.name })}
    breadcrumb={[{ href: "/", label: i18n.t("projects.title") }]}
    breadcrumbLabel={i18n.t("common.breadcrumb")}
  />
  <div class="ways">
    <Card>
      <section class="guided" aria-labelledby="guided-title">
        <h2 id="guided-title">{i18n.t("setup.title")}</h2>
        <p class="hint">{i18n.t("newProject.guidedText")}</p>
        <div><Button href={`/w/${data.workspace.id}/setup`} kind="primary" icon="pencil">{i18n.t("newProject.guidedStart")}</Button></div>
      </section>
    </Card>
    <Card>
      <form method="POST" action="?/import" aria-labelledby="import-title">
        <h2 id="import-title">{i18n.t("newProject.fromWebsite")}</h2>
        <p class="hint">{i18n.t("newProject.fromWebsiteText")}</p>
        <div class="field">
          <label for="address">{i18n.t("newProject.address")}</label>
          <input
            id="address"
            name="address"
            inputmode="url"
            autocomplete="url"
            placeholder={i18n.t("newProject.addressExample")}
            defaultValue={form && "address" in form ? (form.address ?? "") : ""}
            aria-invalid={importError ? "true" : undefined}
            aria-describedby={importError ? "import-error" : undefined}
          />
        </div>
        <label class="check">
          <input type="checkbox" name="confirm" />
          {i18n.t("newProject.confirm")}
        </label>
        {#if importError}
          <p id="import-error" class="error" role="alert">{importError}</p>
        {/if}
        <div><Button type="submit" kind="primary" icon="globe">{i18n.t("newProject.import")}</Button></div>
      </form>
    </Card>
    <!-- Open only when its name was missing; a static attribute, so hydration never closes it
         under a click that came first. -->
    {#if nameMissing}
      <details class="empty" open>{@render empty()}</details>
    {:else}
      <details class="empty">{@render empty()}</details>
    {/if}
  </div>
</Page>

{#snippet empty()}
      <summary>{i18n.t("newProject.empty")}</summary>
      <form method="POST" action="?/empty" aria-label={i18n.t("newProject.empty")}>
        <div class="field">
          <label for="name">{i18n.t("newProject.name")}</label>
          <input
            id="name"
            name="name"
            required
            defaultValue={form && "name" in form ? (form.name ?? "") : ""}
            aria-invalid={nameMissing ? "true" : undefined}
            aria-describedby={nameMissing ? "name-error" : "name-hint"}
          />
          <p id="name-hint" class="hint">{i18n.t("newProject.nameHint")}</p>
          {#if nameMissing}
            <p id="name-error" class="error" role="alert">{i18n.t("newProject.missing")}</p>
          {/if}
        </div>
        <div><Button type="submit" icon="plus">{i18n.t("newProject.create")}</Button></div>
      </form>
{/snippet}

<style>
  .ways {
    display: grid;
    gap: var(--ui-space-5);
  }

  form {
    display: flex;
    flex-direction: column;
    gap: var(--ui-space-4);
  }

  h2 {
    margin: 0;
    font-size: var(--ui-text-lg);
  }

  .guided {
    display: flex;
    flex-direction: column;
    gap: var(--ui-space-3);
  }

  .guided p {
    margin: 0;
  }

  .empty summary {
    cursor: pointer;
    color: var(--ui-link);
    text-decoration: underline;
    width: fit-content;
  }

  .empty form {
    margin-top: var(--ui-space-3);
  }

  .field {
    display: flex;
    flex-direction: column;
    gap: var(--ui-space-1);
  }

  label {
    font-size: var(--ui-text-sm);
    font-weight: 600;
  }

  .check {
    display: flex;
    gap: var(--ui-space-2);
    align-items: flex-start;
    font-weight: 400;
  }

  .check input {
    margin-top: 0.2rem;
  }

  input:not([type="checkbox"]) {
    min-height: var(--ui-control);
    padding: 0 var(--ui-space-3);
    border: 1px solid var(--ui-border-strong);
    border-radius: var(--ui-radius-field);
    font: var(--ui-text-md) var(--ui-font);
  }

  [aria-invalid="true"] {
    border-color: var(--ui-problem);
  }

  .hint,
  .error {
    margin: 0;
    font-size: var(--ui-text-sm);
    color: var(--ui-muted);
  }

  .error {
    color: var(--ui-problem);
  }
</style>
