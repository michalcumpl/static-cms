<script lang="ts">
import type { Snippet } from "svelte";
import { getI18n } from "$lib/i18n";
import Button from "$lib/ui/Button.svelte";
import Notice from "$lib/ui/Notice.svelte";
import Page from "$lib/ui/Page.svelte";
import PageHeader from "$lib/ui/PageHeader.svelte";

// A step of the guided setup (guided-setup spec, "Setup steps"): which step of how many, its
// form, Back and Continue. Continue submits the form; Back is a link, so it never saves.
let {
  step,
  total,
  title,
  intro,
  back,
  hasErrors = false,
  continueLabel,
  multipart = false,
  children,
}: {
  step: number;
  total: number;
  title: string;
  intro?: string;
  /** Where Back leads; no Back on the first step. */
  back?: string;
  hasErrors?: boolean;
  continueLabel?: string;
  multipart?: boolean;
  children: Snippet;
} = $props();
const i18n = getI18n();
</script>

<svelte:head>
  <title>{i18n.t("common.pageTitle", { page: `${title} – ${i18n.t("setup.title")}` })}</title>
</svelte:head>

<Page width="narrow">
  <PageHeader
    title={i18n.t("setup.title")}
    breadcrumb={[{ href: "/", label: i18n.t("projects.title") }]}
    breadcrumbLabel={i18n.t("common.breadcrumb")}
  />
  <p class="progress">{i18n.t("setup.stepOf", { step, total })}</p>
  <progress max={total} value={step} aria-hidden="true"></progress>
  <form method="POST" aria-labelledby="step-title" enctype={multipart ? "multipart/form-data" : undefined}>
    <h2 id="step-title">{title}</h2>
    {#if intro}<p class="intro">{intro}</p>{/if}
    {#if hasErrors}<Notice kind="problem"><p role="alert">{i18n.t("setup.fix")}</p></Notice>{/if}
    {@render children()}
    <div class="actions">
      {#if back}<Button href={back}>{i18n.t("setup.back")}</Button>{/if}
      <Button type="submit" kind="primary">{continueLabel ?? i18n.t("setup.continue")}</Button>
    </div>
  </form>
</Page>

<style>
  .progress {
    margin: 0 0 var(--ui-space-1);
    color: var(--ui-muted);
    font-size: var(--ui-text-sm);
  }

  progress {
    display: block;
    width: 100%;
    height: 0.375rem;
    margin-bottom: var(--ui-space-5);
    accent-color: var(--ui-link);
  }

  form {
    display: flex;
    flex-direction: column;
    gap: var(--ui-space-4);
  }

  h2 {
    margin: 0;
    font-size: var(--ui-text-xl);
  }

  .intro {
    margin: 0;
    color: var(--ui-muted);
  }

  .actions {
    display: flex;
    justify-content: space-between;
    gap: var(--ui-space-3);
    margin-top: var(--ui-space-2);
  }

  .actions :global(button[type="submit"]) {
    margin-left: auto;
  }

  /* The steps' fields, shared. */
  form :global(.field) {
    display: flex;
    flex-direction: column;
    gap: var(--ui-space-1);
  }

  form :global(.field input),
  form :global(.field textarea) {
    font: inherit;
    padding: var(--ui-space-2);
    border: 1px solid var(--ui-border-strong);
    border-radius: var(--ui-radius-field);
  }

  form :global(.hint) {
    margin: 0;
    color: var(--ui-muted);
    font-size: var(--ui-text-sm);
  }

  form :global(.error) {
    margin: 0;
    color: var(--ui-problem);
    font-size: var(--ui-text-sm);
  }

  form :global(fieldset) {
    border: 1px solid var(--ui-border);
    border-radius: var(--ui-radius-field);
    padding: var(--ui-space-3) var(--ui-space-4);
    margin: 0;
    display: flex;
    flex-direction: column;
    gap: var(--ui-space-3);
  }

  form :global(legend) {
    font-weight: 600;
    padding: 0 var(--ui-space-1);
  }
</style>
