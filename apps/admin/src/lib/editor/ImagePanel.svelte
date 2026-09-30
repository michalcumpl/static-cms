<script lang="ts">
import {
  chooseImage,
  IMAGE_ALT_FIELD,
  OPTIONAL_IMAGE_OWNERS,
  ownerOfSelectedImage,
  removeImageFrom,
} from "./image-slots";
import { ALLOWED_ADDRESSES } from "./links";
import type { EditorState } from "./state.svelte";
import { setImageAlt, setImageDecorative, setImageSide, setLogoLink } from "./transforms";

let { editor }: { editor: EditorState } = $props();

type ImageNode = { id: string; type: "image"; src: string; alt: string; decorative: boolean };
const image = $derived.by(() => {
  const node = editor.session.selected_node as { type?: string } | null;
  return node?.type === "image" ? (node as ImageNode) : undefined;
});
const owner = $derived(image ? ownerOfSelectedImage(editor) : undefined);

type OwnerNode = {
  id: string;
  image_side?: "left" | "right";
  name?: { content: string };
  page_id?: string;
  url?: string;
};
const ownerNode = $derived(owner ? (editor.session.get(owner.id) as OwnerNode) : undefined);
const isLogo = $derived(owner?.type === "logo_item");

function setSide(side: "left" | "right") {
  if (!owner) return;
  const tr = editor.session.tr;
  setImageSide(tr, owner.id, side);
  editor.session.apply(tr);
}

// A logo's link: kind of target, the chosen page, and a draft address applied on change.
let linkKind = $state<"none" | "page" | "address">("none");
let linkPage = $state("");
let linkAddress = $state("");
let linkError = $state("");
$effect.pre(() => {
  const node = ownerNode;
  if (!isLogo || !node) return;
  linkKind = node.page_id ? "page" : node.url ? "address" : "none";
  linkPage = node.page_id || editor.homeId;
  linkAddress = node.url ?? "";
  linkError = "";
});

function applyLink(kind: "none" | "page" | "address") {
  if (!owner) return;
  const tr = editor.session.tr;
  const result = setLogoLink(
    tr,
    owner.id,
    kind === "none" ? null : kind === "page" ? { page: linkPage } : { address: linkAddress },
  );
  if (!result.ok) {
    linkError = result.message;
    return;
  }
  linkError = "";
  // Enter and leaving the field both apply the link; the same link twice isn't a new step.
  const unchanged =
    tr.get([owner.id, "page_id"]) === (ownerNode?.page_id ?? "") &&
    tr.get([owner.id, "url"]) === (ownerNode?.url ?? "");
  if (!unchanged) editor.session.apply(tr);
}

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
    {#if owner}
      <div class="actions">
        <button type="button" onclick={() => owner && chooseImage(editor, owner.id)}>Replace…</button>
        {#if OPTIONAL_IMAGE_OWNERS.includes(owner.type)}
          <button type="button" onclick={() => owner && removeImageFrom(editor, owner.id)}>Remove</button>
        {/if}
      </div>
    {/if}
    {#if owner?.type === "text_with_image"}
      <fieldset class="side">
        <legend>Image position</legend>
        <label><input type="radio" name="image-side" checked={ownerNode?.image_side === "left"} onchange={() => setSide("left")} /> Left of the text</label>
        <label><input type="radio" name="image-side" checked={ownerNode?.image_side !== "left"} onchange={() => setSide("right")} /> Right of the text</label>
      </fieldset>
    {/if}
    {#if isLogo}
      <p class="described">Described by its name: <strong>{ownerNode?.name?.content || "(no name yet)"}</strong></p>
      <fieldset class="link">
        <legend>Link</legend>
        <label><input type="radio" name="logo-link" bind:group={linkKind} value="none" onchange={() => applyLink("none")} /> No link</label>
        <label><input type="radio" name="logo-link" bind:group={linkKind} value="page" onchange={() => applyLink("page")} /> A page of this site</label>
        {#if linkKind === "page"}
          <select aria-label="Page" bind:value={linkPage} onchange={() => applyLink("page")}>
            {#each editor.pages as page (page.id)}
              <option value={page.id}>{page.title}</option>
            {/each}
          </select>
        {/if}
        <label><input type="radio" name="logo-link" bind:group={linkKind} value="address" /> An address</label>
        {#if linkKind === "address"}
          <input
            type="text"
            aria-label="Address"
            placeholder="https://"
            bind:value={linkAddress}
            onchange={() => applyLink("address")}
            onkeydown={(e) => e.key === "Enter" && applyLink("address")}
          />
          <p class="hint">Use {ALLOWED_ADDRESSES}.</p>
        {/if}
        {#if linkError}<p class="error" role="alert">{linkError}</p>{/if}
      </fieldset>
    {:else}
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

  fieldset {
    border: 0;
    margin: 0 0 0.75rem;
    padding: 0;
  }

  legend {
    font-weight: 600;
    margin-bottom: 0.25rem;
  }

  fieldset label {
    margin-bottom: 0.25rem;
  }

  .described {
    margin: 0 0 0.75rem;
  }

  .error {
    color: #a3161a;
    font-size: 0.9rem;
  }

  .hint {
    color: #8a5a00;
    font-size: 0.9rem;
  }
</style>
