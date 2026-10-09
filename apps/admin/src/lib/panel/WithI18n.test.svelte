<script lang="ts">
import type { Component } from "svelte";
import type { Locale } from "$lib/i18n";
import { setI18n } from "$lib/i18n/context.svelte";

// Renders a component that needs the interface language, for server-rendered component tests.
let {
  component: Child,
  props,
  locale = "en",
}: {
  // biome-ignore lint/suspicious/noExplicitAny: any component under test.
  component: Component<any>;
  props: Record<string, unknown>;
  locale?: Locale;
} = $props();
// svelte-ignore state_referenced_locally
setI18n(locale);
</script>

<Child {...props} />
