<script lang="ts">
import { getI18n } from "$lib/i18n";
import AuthPanel from "$lib/ui/AuthPanel.svelte";
import Button from "$lib/ui/Button.svelte";
import Notice from "$lib/ui/Notice.svelte";
import type { PageProps } from "./$types";

let { form }: PageProps = $props();
const i18n = getI18n();
</script>

<svelte:head>
  <title>{i18n.t("common.pageTitle", { page: i18n.t("invite.title") })}</title>
</svelte:head>

<AuthPanel title={i18n.t("invite.title")}>
  {#if form?.reason}
    <Notice kind="problem"><p>{i18n.t(`invite.reason.${form.reason}`)}</p></Notice>
    <p><a href="/signin">{i18n.t("invite.signIn")}</a></p>
  {:else}
    <form method="POST">
      <p>{i18n.t("invite.text")}</p>
      <Button type="submit" kind="primary">{i18n.t("invite.accept")}</Button>
    </form>
  {/if}
</AuthPanel>

<style>
  a {
    color: var(--ui-link);
  }
</style>
