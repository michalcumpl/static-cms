<script lang="ts">
import {
  type DocumentPath,
  Node,
  NodeArrayProperty,
  type SveditContext,
  TextProperty,
} from "svedit";
import { getContext } from "svelte";
import { getI18n } from "$lib/i18n";
import ImageSlot from "./ImageSlot.svelte";

let { path }: { path: DocumentPath } = $props();
const svedit = getContext<SveditContext>("svedit");
const block = $derived(svedit.session.get(path) as { image_side: "left" | "right" });
const i18n = getI18n();
</script>

<Node {path} tag="section" class="block text-with-image image-{block.image_side}">
  <div class="container twi-inner">
    <div class="twi-text">
      <TextProperty tag="h2" path={[...path, "heading"]} placeholder={i18n.t("editor.canvas.headingOptional")} />
      <NodeArrayProperty path={[...path, "body"]} />
    </div>
    <div class="twi-image"><ImageSlot {path} /></div>
  </div>
</Node>
