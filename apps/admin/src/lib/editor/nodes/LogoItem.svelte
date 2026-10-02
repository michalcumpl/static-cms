<script lang="ts">
import { type DocumentPath, Node, type SveditContext, TextProperty } from "svedit";
import { getContext } from "svelte";
import { getI18n } from "$lib/i18n";
import Child from "./Child.svelte";

let { path }: { path: DocumentPath } = $props();
const svedit = getContext<SveditContext>("svedit");
const item = $derived(svedit.session.get(path) as { image: { nodes: string[] } });
const i18n = getI18n();
</script>

<Node {path} tag="li" class="logo-item">
  {#if item.image.nodes.length > 0}
    <Child path={[...path, "image", 0]} />
  {/if}
  <!-- Editing only: the name is the logo's description; the published page shows no text. -->
  <TextProperty tag="p" class="logo-name" path={[...path, "name"]} placeholder={i18n.t("editor.canvas.partnerName")} />
</Node>

<style>
  :global(.logo-name) {
    margin: 0.25rem 0 0;
    font-size: 0.8rem;
    text-align: center;
  }
</style>
