<script lang="ts">
import { type ImageSlot, setSlotImage, setSlotImageAlt, slotImage } from "./site";
import type { EditorState } from "./state.svelte";

// One image of the site or a page outside its blocks: the favicon or a share image
// (seo-and-metadata design.md decision 8).
let {
  editor,
  ownerId,
  slot,
  label,
  fieldId,
  altFieldId,
  square = false,
  emptyNote = "",
  locked = false,
}: {
  editor: EditorState;
  ownerId: string;
  slot: ImageSlot;
  label: string;
  /** Element ID of the choose button, for the problems panel. */
  fieldId: string;
  /** Element ID of the description field; without it there is no description field. */
  altFieldId?: string;
  /** Shows the image as the square icon it becomes (the favicon). */
  square?: boolean;
  /** Said when there is no image, such as which image is used instead. */
  emptyNote?: string;
  /** The image itself can't be changed here (shared, edited in the primary language). */
  locked?: boolean;
} = $props();

const image = $derived(slotImage(editor.session.doc, ownerId, slot));

async function choose() {
  const chosen = await editor.openLibrary(image?.src);
  if (chosen) setSlotImage(editor.session, ownerId, slot, chosen);
}
</script>

<div class="image-setting">
  <span class="label" id="{fieldId}-label">{label}</span>
  {#if image}
    <img
      class:square
      src={editor.paths.image(image.src, image.width, "thumbnail")}
      alt=""
    />
  {:else if emptyNote}
    <p class="hint">{emptyNote}</p>
  {/if}
  <div class="buttons">
    <button
      type="button"
      id={fieldId}
      aria-describedby="{fieldId}-label"
      disabled={locked}
      onclick={choose}
    >
      {image ? "Change…" : "Choose…"}
    </button>
    {#if image}
      <button
        type="button"
        aria-describedby="{fieldId}-label"
        disabled={locked}
        onclick={() => setSlotImage(editor.session, ownerId, slot, undefined)}
      >
        Remove
      </button>
    {/if}
  </div>
  {#if image && altFieldId}
    <label for={altFieldId}>Description of the image</label>
    <input
      id={altFieldId}
      type="text"
      value={image.alt}
      oninput={(e) => setSlotImageAlt(editor.session, image.id, e.currentTarget.value)}
    />
  {/if}
</div>

<style>
  .image-setting {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
    margin-top: 0.5rem;
  }

  .label,
  label {
    font-size: 0.9rem;
  }

  img {
    width: 100%;
    aspect-ratio: 1200 / 630;
    object-fit: cover;
    border-radius: 0.3rem;
    background: #eee;
  }

  img.square {
    width: 4rem;
    aspect-ratio: 1;
    object-fit: contain;
    background: repeating-conic-gradient(#e6e6e6 0 25%, #fff 0 50%) 0 0 / 0.5rem 0.5rem;
  }

  .buttons {
    display: flex;
    gap: 0.5rem;
  }

  input {
    font: inherit;
    padding: 0.3rem 0.4rem;
  }

  .hint {
    margin: 0;
    font-size: 0.85rem;
    color: #555;
  }
</style>
