<script lang="ts">
import { type DocumentPath, Node, type SveditContext } from "svedit";
import { getContext } from "svelte";
import { getI18n } from "$lib/i18n";
import Button from "$lib/ui/Button.svelte";
import { moveChild, removeChild } from "../item-pages";
import FormField from "./FormField.svelte";

// A fact of a project in its form: a label and a value, with moving and removing.
let { path }: { path: DocumentPath } = $props();
const i18n = getI18n();
const svedit = getContext<SveditContext>("svedit");
const fact = $derived(svedit.session.get(path) as { id: string });
const projectId = $derived((svedit.session.get(path.slice(0, -2)) as { id: string }).id);
</script>

<Node {path} tag="div" class="fact-row">
  <FormField path={[...path, "label"]} label={i18n.t("panel.lists.fields.factLabel")} />
  <FormField path={[...path, "value"]} label={i18n.t("panel.lists.fields.factValue")} />
  <div class="actions" contenteditable="false">
    <button type="button" class="arrow" aria-label={i18n.t("panel.lists.moveUp")} onclick={() => moveChild(svedit.session, projectId, "facts", fact.id, -1)}>↑</button>
    <button type="button" class="arrow" aria-label={i18n.t("panel.lists.moveDown")} onclick={() => moveChild(svedit.session, projectId, "facts", fact.id, 1)}>↓</button>
    <Button size="sm" kind="quiet" icon="trash" onclick={() => removeChild(svedit.session, projectId, "facts", fact.id)}>{i18n.t("panel.lists.fields.remove")}</Button>
  </div>
</Node>

<style>
  :global(.fact-row) {
    display: grid;
    grid-template-columns: minmax(0, 1fr) minmax(0, 2fr) auto;
    align-items: end;
    gap: var(--ui-space-2);
  }

  .actions {
    display: flex;
    gap: var(--ui-space-1);
    user-select: none;
  }

  .arrow {
    min-width: var(--ui-control);
    min-height: var(--ui-control);
  }
</style>
