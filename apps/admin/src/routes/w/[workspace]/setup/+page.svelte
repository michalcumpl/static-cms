<script lang="ts">
import { getI18n } from "$lib/i18n";
import BusinessFields from "$lib/setup/BusinessFields.svelte";
import SetupFrame from "$lib/setup/SetupFrame.svelte";
import type { PageProps } from "./$types";

// The guided setup's first step: continuing makes the project (guided-setup spec, "Setup steps").
let { data, form }: PageProps = $props();
const i18n = getI18n();
const errors = $derived(form?.errors ?? {});
</script>

<SetupFrame step={1} total={data.total} title={i18n.t("setup.steps.business")} hasErrors={Object.keys(errors).length > 0}>
  <BusinessFields types={data.types} values={form?.values ?? {}} {errors} />
</SetupFrame>
