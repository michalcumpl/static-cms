<script lang="ts">
import { getI18n } from "$lib/i18n";
import { businessFieldElementId } from "../locate";
import { openSettings } from "../screen.svelte";
import { getEditor } from "../state.svelte";

/** Not part of the site: opens the Settings tab, where the details shown here are edited. */
const editor = getEditor();
const i18n = getI18n();
</script>

<div class="edit-business" contenteditable="false">
  <button type="button" onclick={() => openSettings(editor, i18n.t, businessFieldElementId("name"))}>
    {i18n.t("editor.canvas.editBusiness")}
  </button>
</div>

<style>
  .edit-business {
    margin-top: 0.75rem;
  }
</style>
