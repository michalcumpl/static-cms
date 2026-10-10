<script lang="ts">
import { getI18n } from "$lib/i18n";
import Card from "$lib/ui/Card.svelte";
import Page from "$lib/ui/Page.svelte";
import type { PageProps } from "./$types";

// A contact form's address confirming it takes the form's messages (contact-form).
let { data }: PageProps = $props();
const i18n = getI18n();
</script>

<svelte:head>
  <title>{i18n.t("forms.confirmTitle")}</title>
  <meta name="robots" content="noindex" />
</svelte:head>

<Page width="narrow">
  <Card>
    {#if data.email}
      <p role="status">{i18n.t("forms.confirmed", { email: data.email, site: data.site ?? "" })}</p>
    {:else}
      <p role="alert">{i18n.t("forms.confirmInvalid")}</p>
    {/if}
  </Card>
</Page>
