<script lang="ts">
import { getI18n } from "$lib/i18n";
import FocalPoint from "./FocalPoint.svelte";
import {
  chooseImage,
  galleryFitOf,
  hasFocalPoint,
  IMAGE_ALT_FIELD,
  OPTIONAL_IMAGE_OWNERS,
  ownerOfSelectedImage,
  removeImageFrom,
  shapeOf,
} from "./image-slots";
import type { EditorState } from "./state.svelte";
import {
  setImageAlt,
  setImageDecorative,
  setImageSide,
  setLogoLink,
  swapImage,
} from "./transforms";

let { editor }: { editor: EditorState } = $props();
const i18n = getI18n();

type ImageNode = { id: string; type: "image"; src: string; alt: string; decorative: boolean };
const image = $derived.by(() => {
  const node = editor.session.selected_node as { type?: string } | null;
  return node?.type === "image" ? (node as ImageNode) : undefined;
});
const owner = $derived(image ? ownerOfSelectedImage(editor) : undefined);
// Collection items' images are shared from the primary language; elsewhere only described.
const COLLECTION_ITEM_TYPES = ["person", "testimonial"];

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
    linkError = i18n.t(`editor.links.${result.reason}`);
    return;
  }
  linkError = "";
  // Enter and leaving the field both apply the link; the same link twice isn't a new step.
  const unchanged =
    tr.get([owner.id, "page_id"]) === (ownerNode?.page_id ?? "") &&
    tr.get([owner.id, "url"]) === (ownerNode?.url ?? "");
  if (!unchanged) editor.session.apply(tr);
}

// Collection items outside the primary language only describe their image (shared, read-only).
const canChange = $derived(
  !!owner && !(editor.sharedReadOnly && COLLECTION_ITEM_TYPES.includes(owner.type)),
);

/** Crops or turns the image into a new one in this place, keeping its description. */
async function crop() {
  if (!image || !owner) return;
  const fit =
    owner.type === "gallery_item" ? galleryFitOf(editor.session.doc as never, owner.id) : undefined;
  const imageId = image.id;
  const edited = await editor.openCrop(image.src, shapeOf(owner.type, fit));
  if (!edited) return;
  const tr = editor.session.tr;
  swapImage(tr, imageId, edited);
  editor.session.apply(tr);
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
    <h2 id="image-panel-title">{i18n.t("editor.imagePanel.title")}</h2>
    <p class="file">{image.src}</p>
    {#if owner && canChange}
      <div class="actions">
        <button type="button" onclick={() => owner && chooseImage(editor, owner.id)}>{i18n.t("editor.imagePanel.replace")}</button>
        <button type="button" onclick={crop}>{i18n.t("editor.imagePanel.crop")}</button>
        {#if OPTIONAL_IMAGE_OWNERS.includes(owner.type)}
          <button type="button" onclick={() => owner && removeImageFrom(editor, owner.id)}>{i18n.t("editor.imagePanel.remove")}</button>
        {/if}
      </div>
    {/if}
    {#if owner && canChange && hasFocalPoint(owner.type)}
      <FocalPoint {editor} imageId={image.id} />
    {/if}
    {#if owner?.type === "text_with_image"}
      <fieldset class="side">
        <legend>{i18n.t("editor.imagePanel.position")}</legend>
        <label><input type="radio" name="image-side" checked={ownerNode?.image_side === "left"} onchange={() => setSide("left")} /> {i18n.t("editor.imagePanel.left")}</label>
        <label><input type="radio" name="image-side" checked={ownerNode?.image_side !== "left"} onchange={() => setSide("right")} /> {i18n.t("editor.imagePanel.right")}</label>
      </fieldset>
    {/if}
    {#if isLogo}
      <p class="described">{i18n.t("editor.imagePanel.describedBy")} <strong>{ownerNode?.name?.content || i18n.t("editor.imagePanel.noName")}</strong></p>
      <fieldset class="link">
        <legend>{i18n.t("editor.imagePanel.link")}</legend>
        <label><input type="radio" name="logo-link" bind:group={linkKind} value="none" onchange={() => applyLink("none")} /> {i18n.t("editor.imagePanel.noLink")}</label>
        <label><input type="radio" name="logo-link" bind:group={linkKind} value="page" onchange={() => applyLink("page")} /> {i18n.t("editor.imagePanel.page")}</label>
        {#if linkKind === "page"}
          <select aria-label={i18n.t("editor.imagePanel.pageLabel")} bind:value={linkPage} onchange={() => applyLink("page")}>
            {#each editor.pages as page (page.id)}
              <option value={page.id}>{page.title}</option>
            {/each}
          </select>
        {/if}
        <label><input type="radio" name="logo-link" bind:group={linkKind} value="address" /> {i18n.t("editor.imagePanel.address")}</label>
        {#if linkKind === "address"}
          <input
            type="text"
            aria-label={i18n.t("editor.imagePanel.addressLabel")}
            placeholder="https://"
            data-i18n-ignore
            bind:value={linkAddress}
            onchange={() => applyLink("address")}
            onkeydown={(e) => e.key === "Enter" && applyLink("address")}
          />
          <p class="hint">{i18n.t("editor.links.hint")}</p>
        {/if}
        {#if linkError}<p class="error" role="alert">{linkError}</p>{/if}
      </fieldset>
    {:else}
    <label>
      <input type="checkbox" checked={image.decorative} onchange={onDecorativeChange} />
      {i18n.t("editor.imagePanel.decorative")}
    </label>
    <label class="alt">
      {i18n.t("editor.imagePanel.alt")}
      <textarea
        id={IMAGE_ALT_FIELD}
        rows="3"
        value={image.alt}
        oninput={onAltInput}
        disabled={image.decorative}
        placeholder={i18n.t("editor.imagePanel.altPlaceholder")}
      ></textarea>
    </label>
    {#if !image.decorative && image.alt.trim() === ""}
      <p class="hint" role="status">{i18n.t("editor.imagePanel.altMissing")}</p>
    {/if}
    {/if}
  </section>
{/if}

<style>
  .panel {
    padding: 1rem;
    border-bottom: 1px solid var(--ui-border);
  }

  h2 {
    margin: 0 0 0.5rem;
    font-size: 0.8rem;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: var(--ui-muted);
  }

  .file {
    margin: 0 0 0.75rem;
    font-family: ui-monospace, monospace;
    font-size: 0.85rem;
    color: var(--ui-muted);
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
    color: var(--ui-problem);
    font-size: 0.9rem;
  }

  .hint {
    color: var(--ui-attention);
    font-size: 0.9rem;
  }
</style>
