<script lang="ts">
import { type DocumentPath, Node, TextProperty } from "svedit";
import { getI18n } from "$lib/i18n";
import ImageSlot from "./ImageSlot.svelte";

let { path }: { path: DocumentPath } = $props();
const i18n = getI18n();
</script>

<Node {path} tag="li">
  <figure class="testimonial">
    <TextProperty tag="blockquote" path={[...path, "quote"]} placeholder={i18n.t("editor.canvas.quote")} />
    <div class="testimonial-caption">
      <div class="photo"><ImageSlot {path} label={i18n.t("editor.canvas.addPhoto")} /></div>
      <TextProperty tag="span" class="testimonial-name" path={[...path, "name"]} placeholder={i18n.t("editor.canvas.name")} />
      <TextProperty tag="span" class="testimonial-detail" path={[...path, "detail"]} placeholder={i18n.t("editor.canvas.detailOptional")} />
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
