<script lang="ts">
// Renders one child node by its type, for nodes placed without a NodeArrayProperty
// (so they get no insertion gaps: nav items, the hero's image and action, the page).

import type { DocumentPath, SveditContext } from "svedit";
import { getContext } from "svelte";

let { path }: { path: DocumentPath } = $props();
const svedit = getContext<SveditContext>("svedit");
const node = $derived(svedit.session.get(path));
const Component = $derived(node ? svedit.session.config.node_components[node.type] : undefined);
</script>

{#if Component}
  <Component {path} />
{/if}
