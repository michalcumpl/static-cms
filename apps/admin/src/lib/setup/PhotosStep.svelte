<script lang="ts">
import { getI18n } from "$lib/i18n";
import { projectPaths } from "$lib/project-paths";

// The guided setup's photos step (guided-setup design decision 5): each file uploads into the
// project's media library at once, through the library's own API and checks; the form then
// carries the media keys, the descriptions and which photo is the main one.
type Photo = { key: string; alt: string; width: number };
let {
  projectId,
  logo: initialLogo,
  photos: initialPhotos,
  max,
}: { projectId: string; logo?: Photo; photos: Photo[]; max: number } = $props();
const i18n = getI18n();
const paths = $derived(projectPaths(projectId));

// The saved photos start the step; from then on the step's own state is what the form sends.
// svelte-ignore state_referenced_locally
let logo = $state<Photo | undefined>(initialLogo);
// svelte-ignore state_referenced_locally
let photos = $state<Photo[]>(initialPhotos);
let main = $state(0);
let busy = $state("");
let problems = $state<string[]>([]);

async function upload(file: File): Promise<Photo | undefined> {
  busy = i18n.t("setup.photos.uploading", { name: file.name });
  const body = new FormData();
  body.append("file", file);
  const response = await fetch(paths.library, { method: "POST", body }).catch(() => undefined);
  busy = "";
  const answer = response ? await response.json().catch(() => ({})) : {};
  if (!response?.ok) {
    problems = [
      ...problems,
      i18n.t("setup.photos.failed", {
        name: file.name,
        message: answer.message ?? response?.status ?? "",
      }),
    ];
    return undefined;
  }
  return { key: answer.key, alt: "", width: answer.width };
}

async function chooseLogo(event: Event) {
  // The event's target is gone once the upload is awaited.
  const input = event.currentTarget as HTMLInputElement;
  const file = input.files?.[0];
  if (file) logo = (await upload(file)) ?? logo;
  input.value = "";
}

async function addPhotos(event: Event) {
  const input = event.currentTarget as HTMLInputElement;
  problems = [];
  for (const file of [...(input.files ?? [])]) {
    if (photos.length >= max) break;
    const photo = await upload(file);
    if (photo) photos = [...photos, photo];
  }
  input.value = "";
}

function remove(index: number) {
  photos = photos.filter((_, i) => i !== index);
  if (main >= photos.length) main = 0;
}
const thumbnail = (photo: Photo) => paths.image(photo.key, photo.width, "thumbnail");
</script>

<fieldset>
  <legend>{i18n.t("setup.photos.logo")}</legend>
  {#if logo}
    <div class="photo">
      <img src={thumbnail(logo)} alt="" />
      <input type="hidden" name="logo.key" value={logo.key} />
      <input type="hidden" name="logo.alt" value={logo.alt} />
      <button type="button" class="link" onclick={() => (logo = undefined)}>{i18n.t("setup.photos.remove")}</button>
    </div>
  {/if}
  <label class="upload">
    {i18n.t("setup.photos.chooseLogo")}
    <input type="file" accept="image/jpeg,image/png,image/webp" onchange={chooseLogo} />
  </label>
</fieldset>

<fieldset>
  <legend>{i18n.t("setup.photos.photos")}</legend>
  <ul class="photos">
    {#each photos as photo, i (photo.key)}
      <li class="photo">
        <img src={thumbnail(photo)} alt="" />
        <div class="fields">
          <input type="hidden" name={`photos.${i}.key`} value={photo.key} />
          <label class="field">
            {i18n.t("setup.photos.alt")}
            <input name={`photos.${i}.alt`} bind:value={photo.alt} aria-describedby="alt-hint" />
          </label>
          <label class="main">
            <input type="radio" name="main" value={i} bind:group={main} />
            {i18n.t("setup.photos.main")}
          </label>
          <button type="button" class="link" onclick={() => remove(i)}>{i18n.t("setup.photos.remove")}</button>
        </div>
      </li>
    {/each}
  </ul>
  <p id="alt-hint" class="hint">{i18n.t("setup.photos.altHint")}</p>
  {#if photos.length < max}
    <label class="upload">
      {i18n.t("setup.photos.choose")}
      <input type="file" accept="image/jpeg,image/png,image/webp" multiple onchange={addPhotos} />
    </label>
  {/if}
  {#if busy}<p class="hint" role="status">{busy}</p>{/if}
  {#each problems as problem, i (i)}<p class="error" role="alert">{problem}</p>{/each}
</fieldset>

<style>
  .photos {
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: var(--ui-space-3);
  }

  .photo {
    display: flex;
    gap: var(--ui-space-3);
    align-items: flex-start;
  }

  .photo img {
    width: 6rem;
    height: 4.5rem;
    object-fit: cover;
    border-radius: var(--ui-radius-field);
    background: var(--ui-soft);
  }

  .fields {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: var(--ui-space-2);
  }

  .main {
    display: flex;
    align-items: center;
    gap: var(--ui-space-2);
    font-size: var(--ui-text-sm);
  }

  .upload {
    align-self: flex-start;
    padding: var(--ui-space-2) var(--ui-space-3);
    border: 1px dashed var(--ui-border-strong);
    border-radius: var(--ui-radius-field);
    cursor: pointer;
  }

  .upload:focus-within {
    outline: 2px solid var(--ui-focus);
  }

  .upload input {
    position: absolute;
    width: 1px;
    height: 1px;
    opacity: 0;
  }

  .link {
    align-self: flex-start;
    background: none;
    border: 0;
    padding: 0;
    color: var(--ui-link);
    text-decoration: underline;
    cursor: pointer;
    font: inherit;
    font-size: var(--ui-text-sm);
  }
</style>
