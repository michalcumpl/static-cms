<script lang="ts">
import { getI18n } from "$lib/i18n";
import Button from "$lib/ui/Button.svelte";
import Card from "$lib/ui/Card.svelte";
import Page from "$lib/ui/Page.svelte";
import PageHeader from "$lib/ui/PageHeader.svelte";
import type { PageProps } from "./$types";

let { data, form }: PageProps = $props();
const i18n = getI18n();
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
  <Card>
    <form method="POST">
      <div class="field">
        <label for="name">{i18n.t("newProject.name")}</label>
        <input
          id="name"
          name="name"
          required
          defaultValue={form?.name ?? ""}
          aria-invalid={form?.missing ? "true" : undefined}
          aria-describedby={form?.missing ? "name-error" : "name-hint"}
        />
        <p id="name-hint" class="hint">{i18n.t("newProject.nameHint")}</p>
        {#if form?.missing}
          <p id="name-error" class="error" role="alert">{i18n.t("newProject.missing")}</p>
        {/if}
      </div>
      <div><Button type="submit" kind="primary" icon="plus">{i18n.t("newProject.create")}</Button></div>
    </form>
  </Card>
</Page>

<style>
  form {
    display: flex;
    flex-direction: column;
    gap: var(--ui-space-4);
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

  input {
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
