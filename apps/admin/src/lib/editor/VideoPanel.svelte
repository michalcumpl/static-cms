<script lang="ts">
import { videoEmbed } from "@webmio/model";
import { getI18n } from "$lib/i18n";
import { handleTargets, selectionPath } from "./handles";
import type { EditorState } from "./state.svelte";
import { setVideoUrl } from "./transforms";

// The address of the video that is selected or holds the caret (video design decision 4):
// applied when it is a YouTube or Vimeo video, refused otherwise.
let { editor }: { editor: EditorState } = $props();
const i18n = getI18n();
const PROVIDERS = { youtube: "YouTube", vimeo: "Vimeo" } as const;

const video = $derived.by(() => {
  const path = selectionPath(editor.session);
  const item = path ? handleTargets(editor.session, path).item : undefined;
  return item?.type === "video"
    ? (editor.session.get(item.id) as { id: string; url: string })
    : undefined;
});
const embed = $derived(video ? videoEmbed(video.url) : undefined);
let draft = $state("");
let error = $state("");
$effect.pre(() => {
  draft = video?.url ?? "";
  error = "";
});

function apply() {
  if (!video || draft.trim() === video.url) return;
  const tr = editor.session.tr;
  if (!setVideoUrl(tr, video.id, draft)) {
    error = i18n.t("editor.videoPanel.notVideo");
    return;
  }
  error = "";
  editor.session.apply(tr);
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
