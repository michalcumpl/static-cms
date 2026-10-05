<script lang="ts">
import { contactDetails } from "@webmio/render";
import { type DocumentPath, Node, type SveditContext, TextProperty } from "svedit";
import { getContext } from "svelte";
import { getI18n } from "$lib/i18n";
import { businessView } from "./business-view";
import EditBusinessButton from "./EditBusinessButton.svelte";

// The site's contact details, rendered by the same code as the published page
// (business-info design.md decision 3); only the heading is edited here.
let { path }: { path: DocumentPath } = $props();
const svedit = getContext<SveditContext>("svedit");
const block = $derived(
  svedit.session.get(path) as {
    show_address: boolean;
    show_phone: boolean;
    show_email: boolean;
    show_map: boolean;
  },
);
const details = $derived.by(() => {
  const { info, strings } = businessView(svedit.session.doc);
  return contactDetails(info, strings, {
    address: block.show_address,
    phone: block.show_phone,
    email: block.show_email,
    map: block.show_map,
  });
});
const i18n = getI18n();
</script>

<Node {path} tag="section" class="block contact">
  <div class="container">
    <TextProperty tag="h2" path={[...path, "heading"]} placeholder={i18n.t("editor.canvas.headingOptional")} />
    <div contenteditable="false">
      {#if details}
        {@html details.value}
      {:else}
        <p class="empty-note">{i18n.t("editor.canvas.noContact")}</p>
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
