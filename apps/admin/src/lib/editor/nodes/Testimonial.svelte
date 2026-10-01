<script lang="ts">
import { type DocumentPath, Node, TextProperty } from "svedit";
import ImageSlot from "./ImageSlot.svelte";

let { path }: { path: DocumentPath } = $props();
</script>

<Node {path} tag="li">
  <figure class="testimonial">
    <TextProperty tag="blockquote" path={[...path, "quote"]} placeholder="Co o vás zákazník říká" />
    <div class="testimonial-caption">
      <div class="photo"><ImageSlot {path} label="Add photo…" /></div>
      <TextProperty tag="span" class="testimonial-name" path={[...path, "name"]} placeholder="Jméno" />
      <TextProperty tag="span" class="testimonial-detail" path={[...path, "detail"]} placeholder="Detail (nepovinný)" />
    </div>
  </figure>
</Node>

<style>
  .testimonial-caption {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 0.25rem 0.75rem;
  }

  .photo {
    width: 4rem;
  }

  .photo :global(.image-slot) {
    min-height: 4rem;
    font-size: 0.75rem;
  }
</style>
