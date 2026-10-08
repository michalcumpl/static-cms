<script lang="ts">
import { getI18n } from "$lib/i18n";
import type { EditorState } from "./state.svelte";
import { setImageFocus } from "./transforms";

// An image's focal point (image-cropping design decision 7): the part that stays in view where
// the site cuts the image to a shape. A click sets it; the arrow keys move it, merged into one
// undo step while the owner keeps pressing them.
let { editor, imageId }: { editor: EditorState; imageId: string } = $props();
const i18n = getI18n();
// Several images' controls can be on screen at once (a list form of people).
const uid = $props.id();

type Image = { src: string; width: number; focus_x: number; focus_y: number };
const image = $derived(editor.session.get(imageId) as Image | undefined);
let picture: HTMLImageElement | undefined = $state();

function set(x: number, y: number, batch: boolean) {
  const tr = editor.session.tr;
  setImageFocus(tr, imageId, x, y);
  editor.session.apply(tr, batch ? { batch: true } : undefined);
}

function onClick(event: MouseEvent) {
  const box = picture?.getBoundingClientRect();
  if (!box || box.width === 0 || box.height === 0) return;
  set(
    ((event.clientX - box.left) / box.width) * 100,
    ((event.clientY - box.top) / box.height) * 100,
    false,
  );
}

function onKey(event: KeyboardEvent) {
  if (!image) return;
  const step = event.shiftKey ? 10 : 1;
  const moves: Record<string, [number, number]> = {
    ArrowLeft: [-step, 0],
    ArrowRight: [step, 0],
    ArrowUp: [0, -step],
    ArrowDown: [0, step],
  };
  const move = moves[event.key];
  if (!move) return;
  event.preventDefault();
  set(image.focus_x + move[0], image.focus_y + move[1], true);
}
</script>

{#if image}
  <div class="focal-point">
    <span class="label" id="{uid}-label">{i18n.t("editor.focus.label")}</span>
    <!-- A button, so it takes focus and keys; a click inside it sets the point there. -->
    <button
      type="button"
      class="view"
      aria-labelledby="{uid}-label"
      aria-describedby="{uid}-help {uid}-value"
      onclick={onClick}
      onkeydown={onKey}
    >
      <img
        bind:this={picture}
        src={editor.paths.image(image.src, image.width, "thumbnail")}
        alt=""
        draggable="false"
      />
      <span class="marker" style:left={`${image.focus_x}%`} style:top={`${image.focus_y}%`}></span>
    </button>
    <p class="value" id="{uid}-value" aria-live="polite">
      {i18n.t("editor.focus.value", { x: image.focus_x, y: image.focus_y })}
    </p>
    <p class="hint" id="{uid}-help">{i18n.t("editor.focus.help")}</p>
    <button
      type="button"
      disabled={image.focus_x === 50 && image.focus_y === 50}
      onclick={() => set(50, 50, false)}
    >
      {i18n.t("editor.focus.centre")}
    </button>
  </div>
{/if}

<style>
  .focal-point {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: 0.25rem;
  }

  .label {
    font-size: 0.9rem;
  }

  .view {
    position: relative;
    display: block;
    padding: 0;
    border: 1px solid var(--ui-border);
    border-radius: 0.3rem;
    background: none;
    cursor: crosshair;
    line-height: 0;
    overflow: hidden;
  }

  .view:focus-visible {
    outline: 3px solid var(--ui-focus);
  }

  .view img {
    max-width: 100%;
    max-height: 12rem;
  }

  .marker {
    position: absolute;
    width: 1.25rem;
    height: 1.25rem;
    border: 2px solid #fff;
    border-radius: 50%;
    box-shadow: 0 0 0 2px rgb(0 0 0 / 0.6);
    transform: translate(-50%, -50%);
    pointer-events: none;
  }

  .value,
  .hint {
    margin: 0;
    font-size: 0.85rem;
    color: var(--ui-muted);
  }
</style>
