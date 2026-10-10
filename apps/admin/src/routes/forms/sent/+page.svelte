<script lang="ts">
import { page } from "$app/state";
import { getI18n } from "$lib/i18n";
import type { MessageKey } from "$lib/i18n/types";
import Card from "$lib/ui/Card.svelte";
import Page from "$lib/ui/Page.svelte";

// Where a website's contact form leads when it isn't on one of the website's own addresses
// (contact-form spec, "Form endpoint"): the confirmation, or why the message was refused.
const i18n = getI18n();
const ERRORS = ["missing", "contact", "invalid", "limit", "links"];
const error = $derived.by(() => {
  const code = page.url.searchParams.get("error") ?? "";
  return ERRORS.includes(code) ? code : undefined;
});
</script>

<svelte:head>
  <title>{i18n.t("forms.title")}</title>
  <meta name="robots" content="noindex" />
</svelte:head>

<Page width="narrow">
  <Card>
    {#if error}
      <p role="alert">{i18n.t(`forms.errors.${error}` as MessageKey)}</p>
      <p>{i18n.t("forms.back")}</p>
    {:else}
      <p role="status">{i18n.t("forms.sent")}</p>
    {/if}
  </Card>
</Page>
