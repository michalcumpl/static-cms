<script lang="ts">
import { getI18n } from "$lib/i18n";
import { getEditor } from "../state.svelte";

/** Not part of the site: opens the Business tab, where the details shown here are edited. */
const editor = getEditor();
const i18n = getI18n();
</script>

<div class="edit-business" contenteditable="false">
  <button type="button" onclick={() => (editor.settingsTab = "business")}>
    {i18n.t("editor.canvas.editBusiness")}
  </button>
</div>

<style>
  .edit-business {
    margin-top: 0.75rem;
  }
</style>
