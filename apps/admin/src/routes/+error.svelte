<script lang="ts">
import { page } from "$app/state";
import { getI18n } from "$lib/i18n";
import Button from "$lib/ui/Button.svelte";
import EmptyState from "$lib/ui/EmptyState.svelte";
import Page from "$lib/ui/Page.svelte";

// Errors inside the app shell: a missing page says so plainly; other errors show the server's
// message, which it already said in the interface language.
const i18n = getI18n();
const missing = $derived(page.status === 404);
const title = $derived(missing ? i18n.t("server.notFoundTitle") : i18n.t("server.errorTitle"));
</script>

<svelte:head><title>{i18n.t("common.pageTitle", { page: title })}</title></svelte:head>

<Page width="narrow">
  <EmptyState {title} icon={missing ? "info" : "alert"}>
    {missing ? i18n.t("server.notFoundText") : page.error?.message}
    {#snippet action()}
      <Button href="/" kind="secondary" icon="arrow-left">{i18n.t("server.backHome")}</Button>
    {/snippet}
  </EmptyState>
</Page>
