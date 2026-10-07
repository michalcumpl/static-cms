<script lang="ts">
import { getI18n } from "$lib/i18n";
import Button from "$lib/ui/Button.svelte";
import { startsDecorative } from "../image-slots";
import { getEditor } from "../state.svelte";
import { removeImage, setImage, setImageAlt, setImageDecorative } from "../transforms";
import { getFormLists, listFieldId } from "./lists";

// A person's portrait or a testimonial's photo in a list form (offer-and-about decision 6): the
// canvas's image rules, chosen from the media library, starting decorative because the name next
// to it describes it. Outside the primary language only the description can change.
let { ownerId, label }: { ownerId: string; label: string } = $props();
const i18n = getI18n();
const editor = getEditor();
const form = getFormLists();
const owner = $derived(
  editor.session.get(ownerId) as { type: string; image: { nodes: string[] } } | undefined,
);
const image = $derived.by(() => {
  const id = owner?.image.nodes[0];
  return id === undefined
    ? undefined
    : (editor.session.get(id) as {
        id: string;
        src: string;
        width: number;
        alt: string;
        decorative: boolean;
      });
});
const id = $derived(listFieldId(form.section, ownerId, "image"));
const locked = $derived(editor.sharedReadOnly);

async function choose() {
  const chosen = await editor.openLibrary(image?.src);
  if (!chosen || !owner) return;
  const tr = editor.session.tr;
  setImage(tr, ownerId, chosen, { decorative: startsDecorative(owner.type) });
  editor.session.apply(tr);
}

function remove() {
  const tr = editor.session.tr;
  if (removeImage(tr, ownerId)) editor.session.apply(tr);
}

function describe(event: Event & { currentTarget: HTMLTextAreaElement }) {
  if (!image) return;
  const tr = editor.session.tr;
  setImageAlt(tr, image.id, event.currentTarget.value);
  // Typing merges into one undo step, like typing in the form's texts.
  editor.session.apply(tr, { batch: true });
}

function setDecorative(event: Event & { currentTarget: HTMLInputElement }) {
  if (!image) return;
  const tr = editor.session.tr;
  setImageDecorative(tr, image.id, event.currentTarget.checked);
  editor.session.apply(tr);
}
</script>

<!-- Svedit takes every input event inside its editable root as typing in its own text; the
     description field's input stays here. -->
<div
  class="form-image"
  contenteditable="false"
  role="group"
  aria-labelledby="{id}-label"
  onbeforeinput={(event) => event.stopPropagation()}
>
  <span class="label" id="{id}-label">{label}</span>
  <div class="row">
    {#if image}
      <img src={editor.paths.image(image.src, image.width, "thumbnail")} alt="" />
    {/if}
    <div class="buttons">
      <Button size="sm" {id} onclick={choose} disabled={locked}>
        {image ? i18n.t("editor.image.change") : i18n.t("editor.image.choose")}
      </Button>
      {#if image}
        <Button size="sm" kind="quiet" onclick={remove} disabled={locked}>{i18n.t("editor.image.remove")}</Button>
      {/if}
    </div>
  </div>
  {#if image}
    <label class="check">
      <input type="checkbox" checked={image.decorative} onchange={setDecorative} disabled={locked} />
      {i18n.t("editor.imagePanel.decorative")}
    </label>
    <label class="alt">
      {i18n.t("editor.imagePanel.alt")}
      <textarea
        id="{id}-alt"
        rows="2"
        value={image.alt}
        oninput={describe}
        disabled={image.decorative}
        placeholder={i18n.t("editor.imagePanel.altPlaceholder")}
      ></textarea>
    </label>
    {#if !image.decorative && image.alt.trim() === ""}
      <p class="hint" role="status">{i18n.t("editor.imagePanel.altMissing")}</p>
    {/if}
  {/if}
</div>

<style>
  .form-image {
    display: flex;
    flex-direction: column;
    gap: var(--ui-space-2);
    user-select: none;
  }

  .label,
  .alt {
    font-size: var(--ui-text-sm);
    font-weight: 600;
  }

  .row {
    display: flex;
    align-items: center;
    gap: var(--ui-space-3);
  }

  img {
    width: 4rem;
    height: 4rem;
    object-fit: cover;
    border-radius: var(--ui-radius-field);
    background: var(--ui-border);
  }

  .buttons {
    display: flex;
    gap: var(--ui-space-2);
  }

  .check {
    display: flex;
    gap: var(--ui-space-2);
    align-items: center;
    font-size: var(--ui-text-sm);
  }

  .alt {
    display: flex;
    flex-direction: column;
    gap: var(--ui-space-1);
  }

  textarea {
    padding: var(--ui-space-2) var(--ui-space-3);
    border: 1px solid var(--ui-border-strong);
    border-radius: var(--ui-radius-field);
    background: var(--ui-surface);
    color: var(--ui-ink);
    font: var(--ui-text-md) / 1.4 var(--ui-font);
    font-weight: 400;
  }

  .hint {
    margin: 0;
    color: var(--ui-muted);
    font-size: var(--ui-text-sm);
  }
</style>
