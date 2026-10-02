<script lang="ts">
import { getI18n } from "$lib/i18n";
import { convertHeic, isHeic, UPLOAD_ACCEPT } from "./heic";
import type { EditorState } from "./state.svelte";
import type { ChosenImage } from "./transforms";

let { editor }: { editor: EditorState } = $props();
const i18n = getI18n();

interface LibraryImage {
  key: string;
  originalName: string;
  width: number;
  height: number;
}

interface Upload {
  id: number;
  name: string;
  /** 0–1 while sending; 1 while the server processes it. */
  progress: number;
  state: "converting" | "uploading" | "processing" | "done" | "failed";
  message?: string;
}

let dialog: HTMLDialogElement | undefined = $state();
let images = $state<LibraryImage[]>([]);
let uploads = $state<Upload[]>([]);
let loadError = $state("");
/** The chosen images, in the order they were chosen: one, or several in multi-select mode. */
let selection = $state<string[]>([]);
let multiple = $state(false);
let dragging = $state(false);
let resolveChoice: ((images: ChosenImage[]) => void) | undefined;
let nextUploadId = 0;

const selected = $derived(selection.at(-1));

function show(many: boolean, current?: string): Promise<ChosenImage[]> {
  multiple = many;
  selection = current ? [current] : [];
  uploads = [];
  loadError = "";
  dialog?.showModal();
  void load();
  return new Promise((resolve) => {
    resolveChoice = resolve;
  });
}

/** Opens the library; resolves with the chosen image, or undefined when closed without one. */
export async function open(current?: string): Promise<ChosenImage | undefined> {
  return (await show(false, current))[0];
}

/** Opens the library to choose several images; resolves with them in the order chosen. */
export function openMany(): Promise<ChosenImage[]> {
  return show(true);
}

/** Selects an image: the only one, or one more (or one less) in multi-select mode. */
function toggle(key: string) {
  if (!multiple) selection = [key];
  else if (selection.includes(key)) selection = selection.filter((k) => k !== key);
  else selection = [...selection, key];
}

async function load() {
  try {
    const response = await fetch(editor.paths.library);
    if (!response.ok) throw new Error(`${response.status}`);
    images = await response.json();
  } catch (error) {
    loadError = i18n.t("editor.media.loadFailed", { error: String(error) });
  }
}

function finish(chosen: ChosenImage[]) {
  resolveChoice?.(chosen);
  resolveChoice = undefined;
  dialog?.close();
}

function choose() {
  const chosen = selection.flatMap((key) => {
    const image = images.find((i) => i.key === key);
    return image
      ? [
          {
            key: image.key,
            width: image.width,
            height: image.height,
            originalName: image.originalName,
          },
        ]
      : [];
  });
  if (chosen.length > 0) finish(chosen);
}

async function remove(key: string) {
  const response = await fetch(editor.paths.media(key), { method: "DELETE" });
  if (response.ok || response.status === 404) {
    images = images.filter((i) => i.key !== key);
    selection = selection.filter((k) => k !== key);
  }
}

/** Sends one file with progress (fetch can't report upload progress). */
function send(file: File, upload: Upload): Promise<void> {
  return new Promise((resolve) => {
    const request = new XMLHttpRequest();
    const update = (changes: Partial<Upload>) => {
      uploads = uploads.map((u) => (u.id === upload.id ? { ...u, ...changes } : u));
    };
    request.upload.onprogress = (event) => {
      if (event.lengthComputable) update({ progress: event.loaded / event.total });
    };
    request.upload.onload = () => update({ progress: 1, state: "processing" });
    request.onload = () => {
      let body: { key?: string; message?: string } & Partial<LibraryImage> = {};
      try {
        body = JSON.parse(request.responseText);
      } catch {
        // Not JSON: an error page from the server or a proxy.
      }
      if (request.status === 200 || request.status === 201) {
        const image = body as LibraryImage;
        images = [image, ...images.filter((i) => i.key !== image.key)];
        if (!selection.includes(image.key))
          selection = multiple ? [...selection, image.key] : [image.key];
        update({ state: "done", progress: 1 });
      } else {
        const message =
          body.message ??
          (request.status === 413
            ? i18n.t("editor.media.tooLarge")
            : i18n.t("editor.media.uploadFailed", { status: request.status }));
        update({ state: "failed", message });
      }
      resolve();
    };
    request.onerror = () => {
      update({ state: "failed", message: i18n.t("editor.media.noConnection") });
      resolve();
    };
    const body = new FormData();
    body.set("file", file, file.name);
    request.open("POST", editor.paths.library);
    request.send(body);
  });
}

async function uploadFiles(files: FileList | File[]) {
  const list = [...files];
  const added: Upload[] = list.map((file) => ({
    id: nextUploadId++,
    name: file.name,
    progress: 0,
    state: "uploading",
  }));
  uploads = [...uploads, ...added];
  // One at a time: conversions and the server both handle one image at a time.
  for (const [index, original] of list.entries()) {
    const upload = added[index] as Upload;
    const update = (changes: Partial<Upload>) => {
      uploads = uploads.map((u) => (u.id === upload.id ? { ...u, ...changes } : u));
    };
    let file = original;
    // iPhone photos (HEIC) become JPEGs here: the server only takes JPEG, PNG and WebP.
    if (await isHeic(original)) {
      update({ state: "converting" });
      const converted = await convertHeic(original);
      if (!converted.ok) {
        update({ state: "failed", message: i18n.t("editor.media.conversionFailed") });
        continue;
      }
      file = converted.file;
      update({ state: "uploading", name: file.name });
    }
    await send(file, upload);
  }
}

function onDrop(event: DragEvent) {
  event.preventDefault();
  dragging = false;
  if (event.dataTransfer?.files.length) void uploadFiles(event.dataTransfer.files);
}

const thumbnail = (image: LibraryImage) => editor.paths.image(image.key, image.width, "thumbnail");
</script>

<dialog
  bind:this={dialog}
  aria-labelledby="media-library-title"
  class="media-library"
  onclose={() => finish([])}
>
  <div
    class="body"
    class:dragging
    role="region"
    aria-label={i18n.t("editor.media.title")}
    ondragover={(e) => {
      e.preventDefault();
      dragging = true;
    }}
    ondragleave={() => (dragging = false)}
    ondrop={onDrop}
  >
    <h2 id="media-library-title">{i18n.t("editor.media.title")}</h2>

    <div class="drop">
      <p>{i18n.t("editor.media.drop")}</p>
      <label class="choose">
        {i18n.t("editor.media.choose")}
        <input
          type="file"
          accept={UPLOAD_ACCEPT}
          multiple
          onchange={(e) => {
            const input = e.currentTarget;
            if (input.files?.length) void uploadFiles(input.files);
            input.value = "";
          }}
        />
      </label>
      <p class="hint">
        {i18n.t("editor.media.formats")}
      </p>
    </div>

    {#if uploads.length > 0}
      <ul class="uploads" aria-label={i18n.t("editor.media.uploads")}>
        {#each uploads as upload (upload.id)}
          <li class={upload.state}>
            <span class="name">{upload.name}</span>
            {#if upload.state === "converting"}
              <span>{i18n.t("editor.media.converting")}</span>
            {:else if upload.state === "uploading"}
              <progress max="1" value={upload.progress}>{Math.round(upload.progress * 100)} %</progress>
            {:else if upload.state === "processing"}
              <span>{i18n.t("editor.media.processing")}</span>
            {:else if upload.state === "done"}
              <span>{i18n.t("editor.media.uploaded")}</span>
            {:else}
              <span role="alert">{upload.message}</span>
            {/if}
          </li>
        {/each}
      </ul>
    {/if}

    {#if loadError}
      <p role="alert">{loadError}</p>
    {:else if images.length === 0}
      <p class="empty">{i18n.t("editor.media.empty")}</p>
    {:else}
      <ul class="grid" role="listbox" aria-label={i18n.t("editor.media.library")} aria-multiselectable={multiple}>
        {#each images as image (image.key)}
          <li
            role="option"
            aria-selected={selection.includes(image.key)}
            tabindex="0"
            onclick={() => toggle(image.key)}
            ondblclick={() => {
              if (multiple) return;
              selection = [image.key];
              choose();
            }}
            onkeydown={(e) => {
              if (e.key === "Enter" && !multiple) {
                selection = [image.key];
                choose();
              } else if (e.key === " ") {
                e.preventDefault();
                toggle(image.key);
              }
            }}
          >
            <img src={thumbnail(image)} alt="" loading="lazy" />
            <span class="name">{image.originalName}</span>
          </li>
        {/each}
      </ul>
    {/if}

    <div class="buttons">
      <button
        type="button"
        class="danger"
        disabled={selection.length !== 1}
        onclick={() => selected && remove(selected)}
      >
        {i18n.t("editor.media.removeFromLibrary")}
      </button>
      <span class="spacer"></span>
      <button type="button" onclick={() => finish([])}>{i18n.t("common.cancel")}</button>
      <button type="button" disabled={selection.length === 0} onclick={choose}>
        {multiple
          ? i18n.t("editor.media.addImages", { count: selection.length })
          : i18n.t("editor.media.useImage")}
      </button>
    </div>
  </div>
</dialog>

<style>
  .media-library {
    width: min(48rem, 90vw);
    padding: 0;
    font-family: var(--ui-font);
  }

  .body {
    padding: 1rem;
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }

  .body.dragging {
    outline: 3px dashed var(--ui-focus);
    outline-offset: -6px;
  }

  h2 {
    margin: 0;
    font-size: 1.1rem;
  }

  .drop {
    border: 2px dashed var(--ui-border-strong);
    border-radius: 0.5rem;
    padding: 1rem;
    text-align: center;
  }

  .drop p {
    margin: 0.25rem 0;
  }

  .choose input {
    position: absolute;
    width: 1px;
    height: 1px;
    opacity: 0;
  }

  .choose {
    display: inline-block;
    padding: 0.3rem 0.8rem;
    border: 1px solid var(--ui-muted);
    border-radius: 0.3rem;
    cursor: pointer;
  }

  .choose:focus-within {
    outline: 2px solid var(--ui-focus);
  }

  .hint,
  .empty {
    color: var(--ui-muted);
    font-size: 0.85rem;
  }

  .uploads {
    list-style: none;
    margin: 0;
    padding: 0;
    font-size: 0.9rem;
  }

  .uploads li {
    display: flex;
    gap: 0.75rem;
    align-items: center;
  }

  .uploads .failed {
    color: var(--ui-problem);
  }

  .grid {
    list-style: none;
    margin: 0;
    padding: 0;
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(8rem, 1fr));
    gap: 0.75rem;
    max-height: 50vh;
    overflow: auto;
  }

  .grid li {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
    padding: 0.25rem;
    border: 2px solid transparent;
    border-radius: 0.4rem;
    cursor: pointer;
  }

  .grid li[aria-selected="true"] {
    border-color: var(--ui-focus);
    background: var(--ui-soft);
  }

  .grid li:focus-visible {
    outline: 2px solid var(--ui-focus);
  }

  .grid img {
    width: 100%;
    aspect-ratio: 4 / 3;
    object-fit: cover;
    border-radius: 0.3rem;
    background: var(--ui-border);
  }

  .name {
    font-size: 0.8rem;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .buttons {
    display: flex;
    gap: 0.5rem;
  }

  .spacer {
    flex: 1;
  }

  .danger {
    color: var(--ui-problem);
  }
</style>
