<script lang="ts">
import { type DocumentPath, Node, type SveditContext } from "svedit";
import { getContext } from "svelte";
import { getEditor } from "../state.svelte";
import Child from "./Child.svelte";

let { path }: { path: DocumentPath } = $props();
const svedit = getContext<SveditContext>("svedit");
const editor = getEditor();
const site = $derived(svedit.session.get(path));
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
      <p>© {site.name}</p>
    </div>
  </footer>
</Node>
