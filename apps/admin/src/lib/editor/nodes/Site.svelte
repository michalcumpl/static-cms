<script lang="ts">
import { socialKind } from "@webmio/model";
import { contactDetails, openingHoursTable } from "@webmio/render";
import { type DocumentPath, Node, type SveditContext } from "svedit";
import { getContext } from "svelte";
import { getEditor } from "../state.svelte";
import { businessView } from "./business-view";
import Child from "./Child.svelte";

let { path }: { path: DocumentPath } = $props();
const svedit = getContext<SveditContext>("svedit");
const editor = getEditor();
const site = $derived(svedit.session.get(path));
// The header's logo and name, as the published header shows them (site-rendering, "Header logo").
const logo = $derived.by(() => {
  const id = site.logo?.nodes[0];
  return id === undefined
    ? undefined
    : (svedit.session.get(id) as { src: string; width: number; height: number } | undefined);
});
const showName = $derived(!logo || site.header_show_name);
// The footer's social profile links, as the published footer shows them.
const social = $derived.by(() => {
  const { info } = businessView(svedit.session.doc);
  return info.show_in_footer ? info.social : [];
});
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
      <span class="site-name" contenteditable="false">
        {#if logo}
          <img
            class="site-logo"
            src={editor.paths.image(logo.src, logo.width)}
            alt={showName ? "" : site.name}
            width={logo.width}
            height={logo.height}
          />
        {/if}
        {#if showName}{#if logo}<span>{site.name}</span>{:else}{site.name}{/if}{/if}
      </span>
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
      {#if social.length > 0}
        <nav class="footer-social">
          <ul>
            {#each social as url (url)}
              <li><a href={url}>{socialKind(url).label || url}</a></li>
            {/each}
          </ul>
        </nav>
      {/if}
      <p>© {site.name}</p>
    </div>
  </footer>
</Node>
