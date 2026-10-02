<script lang="ts">
import { getI18n } from "$lib/i18n";
import AuthPanel from "$lib/ui/AuthPanel.svelte";
import Button from "$lib/ui/Button.svelte";
import Notice from "$lib/ui/Notice.svelte";
import type { PageProps } from "./$types";

let { form }: PageProps = $props();
const i18n = getI18n();
// The address in bold inside the sentence: the message around its placeholder.
const sent = $derived(i18n.t("signin.sent", { email: "\u0000" }).split("\u0000"));
</script>

<svelte:head>
  <title>{i18n.t("common.pageTitle", { page: i18n.t("signin.title") })}</title>
</svelte:head>

<AuthPanel title={i18n.t("signin.title")}>
  {#if form?.sent}
    <Notice kind="success">
      <p role="status">{sent[0]}<strong>{form.email}</strong>{sent[1]}</p>
    </Notice>
  {:else}
    <form method="POST">
      <div class="field">
        <label for="email">{i18n.t("signin.email")}</label>
        <input
          id="email"
          name="email"
          type="email"
          autocomplete="email"
          required
          defaultValue={form?.email ?? ""}
          aria-invalid={form?.invalid ? "true" : undefined}
          aria-describedby={form?.invalid || form?.rateLimited ? "signin-error" : undefined}
        />
        {#if form?.invalid}
          <p id="signin-error" class="error" role="alert">{i18n.t("signin.invalid")}</p>
        {:else if form?.rateLimited}
          <p id="signin-error" class="error" role="alert">{i18n.t("signin.rateLimited")}</p>
        {/if}
      </div>
      <Button type="submit" kind="primary" icon="mail">{i18n.t("signin.submit")}</Button>
    </form>
    <p class="note">{i18n.t("signin.inviteOnly")}</p>
  {/if}
</AuthPanel>

<style>
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
    color: var(--ui-ink);
  }

  [aria-invalid="true"] {
    border-color: var(--ui-problem);
  }

  .error {
    color: var(--ui-problem);
    font-size: var(--ui-text-sm);
  }

  .note {
    color: var(--ui-muted);
    font-size: var(--ui-text-sm);
  }
</style>
