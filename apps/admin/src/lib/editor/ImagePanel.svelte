<script lang="ts">
import {
  chooseHeroImage,
  heroOfSelectedImage,
  IMAGE_ALT_FIELD,
  removeImageFromHero,
} from "./hero-image";
import type { EditorState } from "./state.svelte";
import { setImageAlt, setImageDecorative } from "./transforms";

let { editor }: { editor: EditorState } = $props();

type ImageNode = { id: string; type: "image"; src: string; alt: string; decorative: boolean };
const image = $derived.by(() => {
  const node = editor.session.selected_node as { type?: string } | null;
  return node?.type === "image" ? (node as ImageNode) : undefined;
});
const heroId = $derived(image ? heroOfSelectedImage(editor) : undefined);

function onAltInput(event: Event & { currentTarget: HTMLTextAreaElement }) {
  if (!image) return;
  const tr = editor.session.tr;
  setImageAlt(tr, image.id, event.currentTarget.value);
  // Typing merges into one undo step, like typing on the canvas.
  editor.session.apply(tr, { batch: true });
}

function onDecorativeChange(event: Event & { currentTarget: HTMLInputElement }) {
  if (!image) return;
  const tr = editor.session.tr;
  setImageDecorative(tr, image.id, event.currentTarget.checked);
  editor.session.apply(tr);
}
</script>

{#if image}
  <section class="panel" aria-labelledby="image-panel-title">
    <h2 id="image-panel-title">Image</h2>
    <p class="file">{image.src}</p>
    {#if heroId}
      <div class="actions">
        <button type="button" onclick={() => heroId && chooseHeroImage(editor, heroId)}>Replace…</button>
        <button type="button" onclick={() => heroId && removeImageFromHero(editor, heroId)}>Remove</button>
      </div>
    {/if}
    <label>
      <input type="checkbox" checked={image.decorative} onchange={onDecorativeChange} />
      Decorative (adds nothing a reader needs)
    </label>
    <label class="alt">
      Description (alt text)
      <textarea
        id={IMAGE_ALT_FIELD}
        rows="3"
        value={image.alt}
        oninput={onAltInput}
        disabled={image.decorative}
        placeholder="What the image shows, for people who can't see it"
      ></textarea>
    </label>
    {#if !image.decorative && image.alt.trim() === ""}
      <p class="hint" role="status">Describe the image, or mark it as decorative.</p>
    {/if}
  </section>
{/if}

<style>
  .panel {
    padding: 1rem;
    border-bottom: 1px solid #ddd;
  }

  h2 {
    margin: 0 0 0.5rem;
    font-size: 0.8rem;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: #555;
  }

  .file {
    margin: 0 0 0.75rem;
    font-family: ui-monospace, monospace;
    font-size: 0.85rem;
    color: #555;
  }

  .actions {
    display: flex;
    gap: 0.5rem;
    margin-bottom: 0.75rem;
  }

  label {
    display: block;
    margin-bottom: 0.75rem;
  }

  textarea {
    display: block;
    width: 100%;
    margin-top: 0.25rem;
    font: inherit;
  }

  .hint {
    color: #8a5a00;
    font-size: 0.9rem;
  }
</style>
