<script lang="ts">
import { type DocumentPath, Node, type SveditContext, TextProperty } from "svedit";
import { getContext } from "svelte";
import { getI18n } from "$lib/i18n";
import CollectionItems from "./CollectionItems.svelte";

let { path }: { path: DocumentPath } = $props();
const svedit = getContext<SveditContext>("svedit");
const block = $derived(svedit.session.get(path) as { layout: string });
const i18n = getI18n();
</script>

<!-- An accordion's descriptions stay open here, so they can be edited. -->
<Node
  {path}
  tag="section"
  class={block.layout === "cards" ? "block services" : `block services services-as-${block.layout}`}
>
  <div class="container">
    <TextProperty tag="h2" path={[...path, "heading"]} placeholder={i18n.t("editor.canvas.headingOptional")} />
    <CollectionItems {path} class="services-list" />
  </div>
</Node>
