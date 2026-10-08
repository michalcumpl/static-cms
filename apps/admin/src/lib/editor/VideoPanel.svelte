<script lang="ts">
import { videoEmbed } from "@webmio/model";
import { getI18n } from "$lib/i18n";
import { handleTargets, selectionPath } from "./handles";
import type { EditorState } from "./state.svelte";
import { type ChosenImage, setImage, setVideoUrl } from "./transforms";

// The address of the video that is selected or holds the caret (video design decision 4):
// applied when it is a YouTube or Vimeo video, refused otherwise.
let { editor }: { editor: EditorState } = $props();
const i18n = getI18n();
const PROVIDERS = { youtube: "YouTube", vimeo: "Vimeo" } as const;

const video = $derived.by(() => {
  const path = selectionPath(editor.session);
  const item = path ? handleTargets(editor.session, path).item : undefined;
  return item?.type === "video"
    ? (editor.session.get(item.id) as { id: string; url: string; poster: { nodes: string[] } })
    : undefined;
});
const embed = $derived(video ? videoEmbed(video.url) : undefined);
let draft = $state("");
let error = $state("");
$effect.pre(() => {
  draft = video?.url ?? "";
  error = "";
});

let fetching = $state(false);

/**
 * Asks our server for the video's thumbnail from YouTube or Vimeo, which joins the library, and
 * makes it the poster; visitors then load it from the site, not from the provider.
 */
async function useThumbnail(videoId: string, url: string) {
  fetching = true;
  try {
    const response = await fetch(editor.paths.videoThumbnail, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ url }),
    });
    const body = (await response.json()) as ChosenImage & { message?: string };
    if (!response.ok) {
      error = body.message ?? i18n.t("editor.videoPanel.noThumbnail");
      return;
    }
    const current = editor.session.get(videoId) as { poster?: { nodes: string[] } } | undefined;
    if (!current || (current.poster?.nodes.length ?? 0) > 0) return;
    const tr = editor.session.tr;
    setImage(tr, videoId, body, { decorative: true });
    editor.session.apply(tr);
  } catch {
    error = i18n.t("editor.videoPanel.noThumbnail");
  } finally {
    fetching = false;
  }
}

function apply() {
  if (!video || draft.trim() === video.url) return;
  const tr = editor.session.tr;
  if (!setVideoUrl(tr, video.id, draft)) {
    error = i18n.t("editor.videoPanel.notVideo");
    return;
  }
  error = "";
  editor.session.apply(tr);
  // A new video gets its picture from the provider as its poster.
  if (video.poster.nodes.length === 0) void useThumbnail(video.id, draft.trim());
}
</script>

{#if video}
  <section class="panel" aria-labelledby="video-panel-title" data-history-keys>
    <h2 id="video-panel-title">{i18n.t("editor.videoPanel.title")}</h2>
    <label class="field">
      {i18n.t("editor.videoPanel.address")}
      <input
        type="url"
        data-i18n-ignore
        bind:value={draft}
        onchange={apply}
        onkeydown={(e) => e.key === "Enter" && apply()}
      />
    </label>
    {#if error}
      <p class="error" role="alert">{error}</p>
    {:else if embed}
      <p class="hint" role="status">
        {i18n.t("editor.videoPanel.recognised", { provider: PROVIDERS[embed.provider], id: embed.id })} ·
        <a href={embed.watchUrl} target="_blank" rel="noopener">{i18n.t("editor.videoPanel.open", { provider: PROVIDERS[embed.provider] })}</a>
      </p>
      {#if video.poster.nodes.length === 0}
        {@const current = video}
        <button type="button" class="thumbnail" disabled={fetching} onclick={() => useThumbnail(current.id, current.url)}>
          {i18n.t("editor.videoPanel.useThumbnail", { provider: PROVIDERS[embed.provider] })}
        </button>
      {/if}
    {:else}
      <p class="hint">{i18n.t("editor.videoPanel.missing")}</p>
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

  .field {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
    font-size: 0.9rem;
  }

  .thumbnail {
    margin-top: 0.5rem;
  }

  .hint,
  .error {
    margin: 0.5rem 0 0;
    font-size: 0.85rem;
  }

  .hint {
    color: var(--ui-muted);
  }

  .error {
    color: var(--ui-danger, #b42318);
  }
</style>
