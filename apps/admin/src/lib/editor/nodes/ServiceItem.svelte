<script lang="ts">
import { type DocumentPath, Node, TextProperty } from "svedit";

let { path }: { path: DocumentPath } = $props();
</script>

<Node {path} tag="li" class="service">
  <TextProperty tag="p" class="service-name" path={[...path, "name"]} placeholder="Název služby" />
  <TextProperty tag="p" class="service-description" path={[...path, "description"]} placeholder="Popis" />
  <TextProperty tag="p" class="service-price" path={[...path, "price"]} placeholder="Cena (nepovinná)" />
</Node>
