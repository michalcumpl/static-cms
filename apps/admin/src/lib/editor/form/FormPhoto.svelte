<script lang="ts">
import { type DocumentPath, Node, type SveditContext } from "svedit";
import { getContext } from "svelte";
import { getI18n } from "$lib/i18n";
import Button from "$lib/ui/Button.svelte";
import { moveChild, removeChild } from "../item-pages";
import { getEditor } from "../state.svelte";
import { setImageAlt, setImageDecorative } from "../transforms";
import FormField from "./FormField.svelte";

// A photo of a project in its form: the picture, its description, its caption, moving and
// removing.
let { path }: { path: DocumentPath } = $props();
const i18n = getI18n();
const svedit = getContext<SveditContext>("svedit");
const editor = getEditor();
const photo = $derived(svedit.session.get(path) as { id: string; image: { nodes: string[] } });
const image = $derived.by(() => {
  const id = photo.image.nodes[0];
  return id === undefined
    ? undefined
    : (svedit.session.get(id) as {
        id: string;
        src: string;
        width: number;
        alt: string;
        decorative: boolean;
      });
});
const projectId = $derived((svedit.session.get(path.slice(0, -2)) as { id: string }).id);
const locked = $derived(editor.sharedReadOnly);
</script>

<Node {path} tag="div" class="photo-row">
  {#if image}
    <img contenteditable="false" src={editor.paths.image(image.src, image.width, "thumbnail")} alt={image.alt} />
  {/if}
  <div class="fields">
    {#if image}
      {@const current = image}
      <div class="describe" contenteditable="false" onbeforeinput={(event) => event.stopPropagation()}>
        <label>
          {i18n.t("editor.imagePanel.alt")}
          <input
            value={current.alt}
            disabled={current.decorative}
            oninput={(event) => {
              const tr = editor.session.tr;
              setImageAlt(tr, current.id, event.currentTarget.value);
              editor.session.apply(tr, { batch: true });
            }}
          />
        </label>
        <label class="check">
          <input
            type="checkbox"
            checked={current.decorative}
            onchange={(event) => {
              const tr = editor.session.tr;
              setImageDecorative(tr, current.id, event.currentTarget.checked);
              editor.session.apply(tr);
            }}
          />
          {i18n.t("editor.imagePanel.decorative")}
        </label>
      </div>
    {/if}
    <FormField path={[...path, "caption"]} label={i18n.t("panel.lists.fields.caption")} />
  </div>
  <div class="actions" contenteditable="false">
    <button type="button" class="arrow" aria-label={i18n.t("panel.lists.moveUp")} disabled={locked} onclick={() => moveChild(svedit.session, projectId, "photos", photo.id, -1)}>↑</button>
    <button type="button" class="arrow" aria-label={i18n.t("panel.lists.moveDown")} disabled={locked} onclick={() => moveChild(svedit.session, projectId, "photos", photo.id, 1)}>↓</button>
    <Button size="sm" kind="quiet" icon="trash" disabled={locked} onclick={() => removeChild(svedit.session, projectId, "photos", photo.id)}>{i18n.t("panel.lists.fields.remove")}</Button>
  </div>
</Node>

<style>
  :global(.photo-row) {
    display: grid;
    grid-template-columns: 4rem minmax(0, 1fr) auto;
    align-items: end;
    gap: var(--ui-space-2);
  }

  img {
    width: 4rem;
    height: 4rem;
    object-fit: cover;
    border-radius: var(--ui-radius-field);
    user-select: none;
  }

  .fields,
  .describe {
    display: flex;
    flex-direction: column;
    gap: var(--ui-space-1);
    min-width: 0;
  }

  .describe label {
    display: flex;
    flex-direction: column;
    gap: var(--ui-space-1);
    font-size: var(--ui-text-sm);
    font-weight: 600;
    user-select: none;
  }

  .describe .check {
    flex-direction: row;
    align-items: center;
    font-weight: 400;
  }

  .describe input:not([type]) {
    min-height: var(--ui-control);
    padding: var(--ui-space-2) var(--ui-space-3);
    border: 1px solid var(--ui-border-strong);
    border-radius: var(--ui-radius-field);
    font: var(--ui-text-md) / 1.4 var(--ui-font);
    user-select: text;
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
