<script lang="ts">
import { addImagesToBlock } from "../image-slots";
import { getEditor } from "../state.svelte";

/** Not part of the site: adds items to a gallery, team or logos block from the library. */
let { blockId, label }: { blockId: string; label: string } = $props();
const editor = getEditor();
</script>

<div class="add-items" contenteditable="false">
  <button type="button" onclick={() => addImagesToBlock(editor, blockId)}>{label}</button>
</div>

<style>
  .add-items {
    margin-top: 1rem;
    text-align: center;
  }
</style>
