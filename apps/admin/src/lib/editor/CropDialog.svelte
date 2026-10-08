<script lang="ts">
import { getI18n } from "$lib/i18n";
import { type Rect, type Turn, turnedSize } from "$lib/image-edit";
import {
  clampFrame,
  fitShape,
  type Handle,
  moveFrame,
  nextTurn,
  resizeFrame,
  SHAPES,
  type Shape,
  turnFrame,
} from "./crop";
import type { EditorState } from "./state.svelte";
import type { ChosenImage } from "./transforms";

// Crop and rotate (image-cropping design decision 5): the whole source picture with a frame
// over it. Saving asks the server to cut a new library image from the source's original.
let { editor }: { editor: EditorState } = $props();
const i18n = getI18n();

interface Source {
  key: string;
  width: number;
  height: number;
}
interface ImageInfo extends Source {
  originalName: string;
  source?: Source & { turn: Turn; crop: Rect };
}

const HANDLES: Handle[] = ["nw", "n", "ne", "e", "se", "s", "sw", "w"];

let dialog: HTMLDialogElement | undefined = $state();
let source = $state<Source | undefined>();
let turn = $state<Turn>(0);
let frame = $state<Rect>({ x: 0, y: 0, width: 0, height: 0 });
/** The shape of the use the dialog was opened for, if it has one. */
let asShown = $state<Shape>();
let shapeId = $state<string>("free");
let message = $state("");
let saving = $state(false);
/** The dialog body's width and the window's height, which the stage is fitted into. */
let roomWidth = $state(0);
let windowHeight = $state(0);
let resolveEdit: ((image: ChosenImage | undefined) => void) | undefined;

const size = $derived<[number, number]>(
  source ? turnedSize(source.width, source.height, turn) : [1, 1],
);
const shape = $derived<Shape>(
  shapeId === "asShown" ? asShown : SHAPES.find((s) => s.id === shapeId)?.shape,
);
/** The stage: as wide as the dialog allows, and no taller than about half the window. */
const stageWidth = $derived(Math.min(roomWidth, windowHeight * 0.55 * (size[0] / size[1])));
/** Screen pixels per image pixel. */
const scale = $derived(stageWidth > 0 ? stageWidth / size[0] : 0);
const tooSmall = $derived(size[0] < 64 || size[1] < 64);

/** Opens the dialog on an image; resolves with the new image, or undefined when cancelled. */
export function open(key: string, useShape?: number): Promise<ChosenImage | undefined> {
  source = undefined;
  message = "";
  saving = false;
  asShown = useShape;
  shapeId = useShape ? "asShown" : "free";
  dialog?.showModal();
  void load(key);
  return new Promise((resolve) => {
    resolveEdit = resolve;
  });
}

async function load(key: string) {
  try {
    const response = await fetch(`${editor.paths.media(key)}/edit`);
    if (!response.ok) throw new Error(`${response.status}`);
    const info: ImageInfo = await response.json();
    // An edited image is edited again from its source, starting from the earlier edit.
    if (info.source) {
      const { turn: previous, crop, ...rest } = info.source;
      source = rest;
      turn = previous;
      frame = clampFrame(crop, turnedSize(rest.width, rest.height, previous), shape);
    } else {
      source = { key: info.key, width: info.width, height: info.height };
      turn = 0;
      frame = fitShape([info.width, info.height], shape);
    }
  } catch (error) {
    message = i18n.t("editor.crop.loadFailed", { error: String(error) });
  }
}

function finish(image: ChosenImage | undefined) {
  resolveEdit?.(image);
  resolveEdit = undefined;
  if (dialog?.open) dialog.close();
}

function chooseShape(id: string) {
  shapeId = id;
  frame = clampFrame(frame, size, shape);
}

function turnBy(clockwise: boolean) {
  const turned = turnFrame(frame, size, clockwise);
  turn = nextTurn(turn, clockwise);
  frame = clampFrame(turned, size, shape);
}

// Dragging: the frame or one of its handles, in image pixels from where the pointer went down.
let drag: { handle: Handle | "move"; x: number; y: number; start: Rect } | undefined;

function startDrag(event: PointerEvent, handle: Handle | "move") {
  if (event.button !== 0) return;
  event.preventDefault();
  event.stopPropagation();
  (event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
  drag = { handle, x: event.clientX, y: event.clientY, start: frame };
}

function onDrag(event: PointerEvent) {
  if (!drag || scale === 0) return;
  const dx = (event.clientX - drag.x) / scale;
  const dy = (event.clientY - drag.y) / scale;
  frame =
    drag.handle === "move"
      ? moveFrame(drag.start, dx, dy, size)
      : resizeFrame(drag.start, drag.handle, dx, dy, size, shape);
}

function endDrag() {
  drag = undefined;
}

/** Arrow keys move the frame by 1 % of the picture; with Shift they resize it. */
function onFrameKey(event: KeyboardEvent) {
  const directions: Record<string, [number, number]> = {
    ArrowLeft: [-1, 0],
    ArrowRight: [1, 0],
    ArrowUp: [0, -1],
    ArrowDown: [0, 1],
  };
  const direction = directions[event.key];
  if (!direction) return;
  event.preventDefault();
  const dx = direction[0] * Math.max(1, Math.round(size[0] / 100));
  const dy = direction[1] * Math.max(1, Math.round(size[1] / 100));
  frame = event.shiftKey
    ? resizeFrame(frame, "se", dx, dy, size, shape)
    : moveFrame(frame, dx, dy, size);
}

async function save() {
  if (!source || saving) return;
  saving = true;
  message = "";
  try {
    const response = await fetch(`${editor.paths.media(source.key)}/edit`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ turn, crop: frame }),
    });
    let body: { message?: string } & Partial<ChosenImage> = {};
    try {
      body = await response.json();
    } catch {
      // Not JSON: an error page from the server or a proxy.
    }
    if (!response.ok) {
      message = body.message ?? i18n.t("editor.crop.failed", { status: response.status });
      return;
    }
    const { key, width, height, originalName } = body as ChosenImage;
    finish({ key, width, height, originalName });
  } catch {
    message = i18n.t("editor.crop.noConnection");
  } finally {
    saving = false;
  }
}

const px = (value: number) => `${value * scale}px`;
// The picture as displayed: the source's display variant, turned around the stage's centre.
const sideways = $derived(turn === 90 || turn === 270);
const stageHeight = $derived(scale * size[1]);
</script>

<svelte:window bind:innerHeight={windowHeight} />

<dialog
  bind:this={dialog}
  aria-labelledby="crop-dialog-title"
  class="crop-dialog"
  onclose={() => finish(undefined)}
>
  <div class="body">
    <h2 id="crop-dialog-title">{i18n.t("editor.crop.title")}</h2>

    {#if source}
      <div class="toolbar">
        <button type="button" onclick={() => turnBy(false)}>↺ {i18n.t("editor.crop.turnLeft")}</button>
        <button type="button" onclick={() => turnBy(true)}>↻ {i18n.t("editor.crop.turnRight")}</button>
        <fieldset class="shapes">
          <legend>{i18n.t("editor.crop.shape")}</legend>
          {#if asShown}
            <label><input type="radio" name="crop-shape" checked={shapeId === "asShown"} onchange={() => chooseShape("asShown")} /> {i18n.t("editor.crop.shapes.asShown")}</label>
          {/if}
          {#each SHAPES as option (option.id)}
            <label><input type="radio" name="crop-shape" checked={shapeId === option.id} onchange={() => chooseShape(option.id)} /> {i18n.t(`editor.crop.shapes.${option.id}`)}</label>
          {/each}
        </fieldset>
      </div>

      <div class="stage-area" bind:clientWidth={roomWidth}>
        <div
          class="stage"
          role="group"
          aria-label={i18n.t("editor.crop.picture")}
          style:width={`${stageWidth}px`}
          style:height={`${stageHeight}px`}
        >
          <img
            src={editor.paths.image(source.key, source.width)}
            alt=""
            draggable="false"
            style:width={sideways ? `${stageHeight}px` : "100%"}
            style:height={sideways ? `${stageWidth}px` : "100%"}
            style:transform={`translate(-50%, -50%) rotate(${turn}deg)`}
          />
          {#if scale > 0}
            <!-- A button, so it takes focus and keys; Enter and Space do nothing. -->
            <button
              type="button"
              class="frame"
              aria-label={i18n.t("editor.crop.frame")}
              aria-describedby="crop-frame-help"
              style:left={px(frame.x)}
              style:top={px(frame.y)}
              style:width={px(frame.width)}
              style:height={px(frame.height)}
              onpointerdown={(e) => startDrag(e, "move")}
              onpointermove={onDrag}
              onpointerup={endDrag}
              onpointercancel={endDrag}
              onkeydown={onFrameKey}
            >
              {#each HANDLES as handle (handle)}
                <span
                  class="handle {handle}"
                  aria-hidden="true"
                  onpointerdown={(e) => startDrag(e, handle)}
                  onpointermove={onDrag}
                  onpointerup={endDrag}
                  onpointercancel={endDrag}
                ></span>
              {/each}
            </button>
          {/if}
        </div>
      </div>
      <p id="crop-frame-help" class="hint">{i18n.t("editor.crop.frameHelp")}</p>
      <p class="state" aria-live="polite">
        {i18n.t("editor.crop.frameState", {
          width: frame.width,
          height: frame.height,
          x: frame.x,
          y: frame.y,
        })}
      </p>
      {#if tooSmall}<p class="hint">{i18n.t("editor.crop.tooSmall")}</p>{/if}
    {/if}

    {#if message}<p role="alert" class="problem">{message}</p>{/if}

    <div class="buttons">
      <button type="button" disabled={!source} onclick={() => (frame = fitShape(size, shape))}>
        {i18n.t("editor.crop.reset")}
      </button>
      <span class="spacer"></span>
      <button type="button" onclick={() => finish(undefined)}>{i18n.t("common.cancel")}</button>
      <button type="button" disabled={!source || saving || tooSmall} onclick={save}>
        {saving ? i18n.t("editor.crop.saving") : i18n.t("editor.crop.save")}
      </button>
    </div>
  </div>
</dialog>

<style>
  .crop-dialog {
    width: min(48rem, 92vw);
    padding: 0;
    font-family: var(--ui-font);
  }

  .body {
    padding: 1rem;
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }

  h2 {
    margin: 0;
    font-size: 1.1rem;
  }

  .toolbar {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
    align-items: center;
  }

  .shapes {
    display: flex;
    flex-wrap: wrap;
    gap: 0.25rem 0.75rem;
    border: 0;
    margin: 0;
    padding: 0;
  }

  .shapes legend {
    float: left;
    margin-right: 0.5rem;
    color: var(--ui-muted);
  }

  .stage-area {
    display: flex;
    justify-content: center;
  }

  .stage {
    position: relative;
    flex: none;
    overflow: hidden;
    background: repeating-conic-gradient(var(--ui-border) 0 25%, var(--ui-surface) 0 50%) 0 0 / 1rem 1rem;
    touch-action: none;
    user-select: none;
  }

  .stage img {
    position: absolute;
    left: 50%;
    top: 50%;
    max-width: none;
    pointer-events: none;
  }

  .frame {
    position: absolute;
    box-sizing: border-box;
    padding: 0;
    background: none;
    border-radius: 0;
    border: 2px solid #fff;
    outline: 1px solid rgb(0 0 0 / 0.6);
    /* Everything outside the frame is dimmed. */
    box-shadow: 0 0 0 100vmax rgb(0 0 0 / 0.5);
    cursor: move;
  }

  .frame:focus-visible {
    outline: 3px solid var(--ui-focus);
  }

  .handle {
    position: absolute;
    width: 0.9rem;
    height: 0.9rem;
    background: #fff;
    border: 1px solid rgb(0 0 0 / 0.6);
    transform: translate(-50%, -50%);
  }

  .nw { left: 0; top: 0; cursor: nwse-resize; }
  .n { left: 50%; top: 0; cursor: ns-resize; }
  .ne { left: 100%; top: 0; cursor: nesw-resize; }
  .e { left: 100%; top: 50%; cursor: ew-resize; }
  .se { left: 100%; top: 100%; cursor: nwse-resize; }
  .s { left: 50%; top: 100%; cursor: ns-resize; }
  .sw { left: 0; top: 100%; cursor: nesw-resize; }
  .w { left: 0; top: 50%; cursor: ew-resize; }

  .hint,
  .state {
    margin: 0;
    color: var(--ui-muted);
    font-size: 0.85rem;
  }

  .problem {
    margin: 0;
    color: var(--ui-problem);
  }

  .buttons {
    display: flex;
    gap: 0.5rem;
  }

  .spacer {
    flex: 1;
  }
</style>
