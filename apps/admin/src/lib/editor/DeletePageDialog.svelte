<script lang="ts">
import { getI18n } from "$lib/i18n";
import Button from "$lib/ui/Button.svelte";
import { countLinksTo, deletePage } from "./pages";
import type { EditorState } from "./state.svelte";

// Confirms deleting a page, saying how many links elsewhere point to it (site-editing spec,
// "Deleting pages"). The pages list's menu opens it with `open(page)`.
let { editor }: { editor: EditorState } = $props();
const i18n = getI18n();

let dialog: HTMLDialogElement | undefined = $state();
let target = $state<{ id: string; title: string } | undefined>();
const linkCount = $derived(target ? countLinksTo(editor.session.doc, target.id) : 0);

export function open(page: { id: string; title: string }): void {
  target = { id: page.id, title: page.title };
  dialog?.showModal();
}

function confirmDelete(event: SubmitEvent) {
  event.preventDefault();
  if (target) deletePage(editor.session, target.id);
  dialog?.close();
  // The layout switches to the home page once the current page is gone.
}
</script>

<dialog bind:this={dialog} aria-labelledby="delete-page-title" class="delete-dialog">
  <form onsubmit={confirmDelete}>
    <h2 id="delete-page-title">{i18n.t("editor.page.deleteTitle", { title: target?.title ?? "" })}</h2>
    <p>
      {linkCount === 0
        ? i18n.t("editor.page.noLinks")
        : i18n.t("editor.page.links", { count: linkCount })}
      {i18n.t("editor.page.undoNote")}
    </p>
    <div class="buttons">
      <Button onclick={() => dialog?.close()}>{i18n.t("common.cancel")}</Button>
      <Button type="submit" kind="danger">{i18n.t("editor.page.deletePage")}</Button>
    </div>
  </form>
</dialog>

<style>
  .delete-dialog {
    max-width: 26rem;
    font-family: var(--ui-font);
  }

  h2 {
    font-size: 1.1rem;
  }

  .buttons {
    display: flex;
    justify-content: flex-end;
    gap: 0.5rem;
  }
</style>
