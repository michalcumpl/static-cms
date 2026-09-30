<script lang="ts">
import { type DocumentPath, Node, TextProperty } from "svedit";
import ImageSlot from "./ImageSlot.svelte";

let { path }: { path: DocumentPath } = $props();
</script>

<Node {path} tag="li" class="person">
  <ImageSlot {path} label="Add portrait…" />
  <TextProperty tag="h3" class="person-name" path={[...path, "name"]} placeholder="Jméno" />
  <TextProperty tag="p" class="person-role" path={[...path, "role"]} placeholder="Role (nepovinná)" />
  <TextProperty tag="p" class="person-text" path={[...path, "text"]} placeholder="Krátký text (nepovinný)" />
</Node>
