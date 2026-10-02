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
import AddItemsButton from "./AddItemsButton.svelte";

let { path }: { path: DocumentPath } = $props();
const svedit = getContext<SveditContext>("svedit");
const block = $derived(svedit.session.get(path) as { id: string });
const i18n = getI18n();
</script>

<Node {path} tag="section" class="block team">
  <div class="container">
    <TextProperty tag="h2" path={[...path, "heading"]} placeholder={i18n.t("editor.canvas.headingOptional")} />
    <NodeArrayProperty tag="ul" class="team-list" path={[...path, "people"]} />
    <AddItemsButton blockId={block.id} label={i18n.t("editor.canvas.addPeople")} />
  </div>
</Node>
