<script lang="ts">
import { getEditor } from "../state.svelte";

/** Not part of the site: opens the Business tab, where the details shown here are edited. */
const editor = getEditor();
</script>

<div class="edit-business" contenteditable="false">
  <button type="button" onclick={() => (editor.settingsTab = "business")}>
    Edit business details
  </button>
</div>

<style>
  .edit-business {
    margin-top: 0.75rem;
  }
</style>
