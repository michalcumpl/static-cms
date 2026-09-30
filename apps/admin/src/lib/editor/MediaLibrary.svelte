<script lang="ts">
import type { EditorState } from "./state.svelte";
import type { ChosenImage } from "./transforms";

let { editor }: { editor: EditorState } = $props();

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
  state: "uploading" | "processing" | "done" | "failed";
  message?: string;
}

const ACCEPT = "image/jpeg,image/png,image/webp";

let dialog: HTMLDialogElement | undefined = $state();
let images = $state<LibraryImage[]>([]);
let uploads = $state<Upload[]>([]);
let loadError = $state("");
let selected = $state<string | undefined>();
let dragging = $state(false);
let resolveChoice: ((image: ChosenImage | undefined) => void) | undefined;
let nextUploadId = 0;

/** Opens the library; resolves with the chosen image, or undefined when closed without one. */
export function open(current?: string): Promise<ChosenImage | undefined> {
  selected = current;
  uploads = [];
  loadError = "";
  dialog?.showModal();
  void load();
  return new Promise((resolve) => {
    resolveChoice = resolve;
  });
}

async function load() {
  try {
    const response = await fetch(editor.paths.library);
    if (!response.ok) throw new Error(`${response.status}`);
    images = await response.json();
  } catch (error) {
    loadError = `The library couldn't be loaded (${String(error)}).`;
  }
}

function finish(image: ChosenImage | undefined) {
  resolveChoice?.(image);
  resolveChoice = undefined;
  dialog?.close();
}

function choose() {
  const image = images.find((i) => i.key === selected);
  if (image) finish({ key: image.key, width: image.width, height: image.height });
}

async function remove(key: string) {
  const response = await fetch(editor.paths.media(key), { method: "DELETE" });
  if (response.ok || response.status === 404) {
    images = images.filter((i) => i.key !== key);
    if (selected === key) selected = undefined;
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
        selected = image.key;
        update({ state: "done", progress: 1 });
      } else {
        const message =
          body.message ??
          (request.status === 413
            ? "Images can be at most 20 MB."
            : `Uploading failed (${request.status}).`);
        update({ state: "failed", message });
      }
      resolve();
    };
    request.onerror = () => {
      update({ state: "failed", message: "Uploading failed: no connection to the server." });
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
  const added = list.map((file) => ({
    id: nextUploadId++,
    name: file.name,
    progress: 0,
    state: "uploading" as const,
  }));
  uploads = [...uploads, ...added];
  // One at a time: the server processes them one at a time anyway.
  for (const [index, file] of list.entries()) await send(file, added[index] as Upload);
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
  onclose={() => finish(undefined)}
>
  <div
    class="body"
    class:dragging
    role="region"
    aria-label="Images"
    ondragover={(e) => {
      e.preventDefault();
      dragging = true;
    }}
    ondragleave={() => (dragging = false)}
    ondrop={onDrop}
  >
    <h2 id="media-library-title">Images</h2>

    <div class="drop">
      <p>Drop photos here, or</p>
      <label class="choose">
        Choose files…
        <input
          type="file"
          accept={ACCEPT}
          multiple
          onchange={(e) => {
            const input = e.currentTarget;
            if (input.files?.length) void uploadFiles(input.files);
            input.value = "";
          }}
        />
      </label>
      <p class="hint">JPEG, PNG or WebP, up to 20 MB. Location and camera data are removed.</p>
    </div>

    {#if uploads.length > 0}
      <ul class="uploads" aria-label="Uploads">
        {#each uploads as upload (upload.id)}
          <li class={upload.state}>
            <span class="name">{upload.name}</span>
            {#if upload.state === "uploading"}
              <progress max="1" value={upload.progress}>{Math.round(upload.progress * 100)} %</progress>
            {:else if upload.state === "processing"}
              <span>Processing…</span>
            {:else if upload.state === "done"}
              <span>Uploaded</span>
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
      <p class="empty">No images yet.</p>
    {:else}
      <ul class="grid" role="listbox" aria-label="Library">
        {#each images as image (image.key)}
          <li
            role="option"
            aria-selected={selected === image.key}
            tabindex="0"
            onclick={() => (selected = image.key)}
            ondblclick={() => {
              selected = image.key;
              choose();
            }}
            onkeydown={(e) => {
              if (e.key === "Enter") {
                selected = image.key;
                choose();
              } else if (e.key === " ") {
                e.preventDefault();
                selected = image.key;
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
        disabled={!selected}
        onclick={() => selected && remove(selected)}
      >
        Remove from library
      </button>
      <span class="spacer"></span>
      <button type="button" onclick={() => finish(undefined)}>Cancel</button>
      <button type="button" disabled={!selected} onclick={choose}>Use this image</button>
    </div>
  </div>
</dialog>

<style>
  .media-library {
    width: min(48rem, 90vw);
    padding: 0;
    font-family: system-ui, sans-serif;
  }

  .body {
    padding: 1rem;
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }

  .body.dragging {
    outline: 3px dashed #1f5a8a;
    outline-offset: -6px;
  }

  h2 {
    margin: 0;
    font-size: 1.1rem;
  }

  .drop {
    border: 2px dashed #bbb;
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
    border: 1px solid #888;
    border-radius: 0.3rem;
    cursor: pointer;
  }

  .choose:focus-within {
    outline: 2px solid #1f5a8a;
  }

  .hint,
  .empty {
    color: #555;
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
    color: #a3161a;
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
    border-color: #1f5a8a;
    background: #eef4f9;
  }

  .grid li:focus-visible {
    outline: 2px solid #1f5a8a;
  }

  .grid img {
    width: 100%;
    aspect-ratio: 4 / 3;
    object-fit: cover;
    border-radius: 0.3rem;
    background: #eee;
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
    color: #a3161a;
  }
</style>
