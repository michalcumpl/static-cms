<script lang="ts">
import { openingHoursTable } from "@static-cms/site";
import { type DocumentPath, Node, type SveditContext, TextProperty } from "svedit";
import { getContext } from "svelte";
import { businessView } from "./business-view";
import EditBusinessButton from "./EditBusinessButton.svelte";

// The site's opening hours, rendered by the same code as the published page
// (business-info design.md decision 3); only the heading is edited here.
let { path }: { path: DocumentPath } = $props();
const svedit = getContext<SveditContext>("svedit");
const table = $derived.by(() => {
  const { info, strings } = businessView(svedit.session.doc);
  return openingHoursTable(info, strings);
});
</script>

<Node {path} tag="section" class="block opening-hours">
  <div class="container">
    <TextProperty tag="h2" path={[...path, "heading"]} placeholder="Nadpis (nepovinný)" />
    <div contenteditable="false">
      {#if table}
        {@html table.value}
      {:else}
        <p class="empty-note">No opening hours yet.</p>
      {/if}
    </div>
    <EditBusinessButton />
  </div>
</Node>

<style>
  .empty-note {
    color: #777;
    font-style: italic;
  }
</style>
