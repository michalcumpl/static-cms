<script lang="ts">
import { contactDetails, openingHoursTable } from "@static-cms/site";
import { type DocumentPath, Node, type SveditContext } from "svedit";
import { getContext } from "svelte";
import { getEditor } from "../state.svelte";
import { businessView } from "./business-view";
import Child from "./Child.svelte";

let { path }: { path: DocumentPath } = $props();
const svedit = getContext<SveditContext>("svedit");
const editor = getEditor();
const site = $derived(svedit.session.get(path));
// The footer's business details, as the published footer shows them.
const footer = $derived.by(() => {
  const { info, strings, siteName } = businessView(svedit.session.doc);
  if (!info.show_in_footer) return undefined;
  const name = info.name.trim() !== "" && info.name !== siteName ? info.name : "";
  const contact = contactDetails(info, strings, undefined, name);
  const hours = openingHoursTable(info, strings);
  return contact || hours ? { contact, hours } : undefined;
});
</script>

<Node {path} class="site-root">
  <header class="site-header">
    <div class="container">
      <span class="site-name" contenteditable="false">{site.name}</span>
      <Child path={[...path, "nav"]} />
    </div>
  </header>
  {#if editor.pageIndex >= 0}
    <Child path={[...path, "pages", editor.pageIndex]} />
  {/if}
  <footer class="site-footer">
    <div class="container" contenteditable="false">
      {#if footer}
        <div class="footer-business">
          {#if footer.contact}{@html footer.contact.value}{/if}
          {#if footer.hours}{@html footer.hours.value}{/if}
        </div>
      {/if}
      <p>© {site.name}</p>
    </div>
  </footer>
</Node>
