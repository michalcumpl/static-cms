<script lang="ts">
import { type DocumentPath, Node, TextProperty } from "svedit";
import { getI18n } from "$lib/i18n";
import ImageSlot from "./ImageSlot.svelte";

// A video on the canvas: its poster in the usual slot (or the play frame), the play symbol, and
// its title and caption editable in place. Its address is set in the Video panel.
let { path }: { path: DocumentPath } = $props();
const i18n = getI18n();
</script>

<Node {path} tag="li" class="video-item">
  <figure class="video">
    <div class="video-play">
      <ImageSlot {path} />
    </div>
    <TextProperty tag="p" class="video-title-field" path={[...path, "title"]} placeholder={i18n.t("editor.canvas.videoTitle")} />
    <TextProperty tag="p" class="video-caption" path={[...path, "caption"]} placeholder={i18n.t("editor.canvas.captionOptional")} />
  </figure>
</Node>

<style>
  .video-play :global(img) {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  :global(.video-title-field) {
    margin: 0.5rem 0 0;
    font-weight: 700;
  }

  :global(.video-item .video-caption) {
    margin: 0.25rem 0 0;
  }
</style>
