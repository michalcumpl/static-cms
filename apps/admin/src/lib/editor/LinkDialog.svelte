<script lang="ts">
import type { Selection } from "svedit";
import { checkLinkAddress } from "./links";
import type { EditorState } from "./state.svelte";

let { editor, onclose }: { editor: EditorState; onclose?: () => void } = $props();

let dialog: HTMLDialogElement | undefined = $state();
let kind = $state<"page" | "address">("page");
let pageId = $state("");
let address = $state("");
let error = $state("");
// Focus moves into the dialog, so remember which text the link is for.
let selection: Selection | null = null;

export function open(): void {
  selection = editor.session.selection;
  kind = "page";
  pageId = editor.homeId;
  address = "";
  error = "";
  dialog?.showModal();
}

function apply(event: SubmitEvent): void {
  event.preventDefault();
  const { session } = editor;
  const tr = session.tr;
  if (selection) tr.set_selection(selection);
  if (kind === "page") {
    tr.toggle_mark("internal_link", { page_id: pageId });
  } else {
    const check = checkLinkAddress(address);
    if (!check.ok) {
      error = check.message;
      return;
    }
    tr.toggle_mark("link", { href: check.href });
  }
  session.apply(tr);
  dialog?.close();
}
</script>

<!-- `close` fires however the dialog closes (apply, Cancel, Escape). -->
<dialog bind:this={dialog} aria-labelledby="link-dialog-title" class="link-dialog" {onclose}>
  <form onsubmit={apply}>
    <h2 id="link-dialog-title">Add link</h2>
    <fieldset>
      <legend>Link to</legend>
      <label><input type="radio" bind:group={kind} value="page" /> A page of this site</label>
      <label><input type="radio" bind:group={kind} value="address" /> An address</label>
    </fieldset>
    {#if kind === "page"}
      <label for="link-page">Page</label>
      <select id="link-page" bind:value={pageId}>
        {#each editor.pages as page (page.id)}
          <option value={page.id}>{page.title}</option>
        {/each}
      </select>
    {:else}
      <label for="link-address">Address</label>
      <input
          id="link-address"
          type="text"
          bind:value={address}
          placeholder="https://…"
          aria-invalid={error ? "true" : undefined}
          aria-describedby={error ? "link-error" : undefined}
        />
    {/if}
    {#if error}
      <p id="link-error" class="error" role="alert">{error}</p>
    {/if}
    <div class="actions">
      <button type="button" onclick={() => dialog?.close()}>Cancel</button>
      <button type="submit">Add link</button>
    </div>
  </form>
</dialog>

<style>
  .link-dialog {
    width: min(26rem, 90vw);
    border: 1px solid #ccc;
    border-radius: 0.5rem;
    font-family: system-ui, sans-serif;
  }

  h2 {
    margin-top: 0;
    font-size: 1.1rem;
  }

  fieldset {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
    margin: 0 0 1rem;
  }

  label {
    display: block;
  }

  select,
  input[type="text"] {
    display: block;
    width: 100%;
    margin-top: 0.25rem;
    font: inherit;
  }

  .error {
    color: #a3161a;
  }

  .actions {
    display: flex;
    justify-content: flex-end;
    gap: 0.5rem;
    margin-top: 1rem;
  }
</style>
