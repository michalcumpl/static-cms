<script lang="ts">
import { getI18n } from "$lib/i18n";
import ImageSetting from "./ImageSetting.svelte";
import { siteFieldElementId } from "./locate";
import SharedNote from "./SharedNote.svelte";
import { setAiSearch, setAiTraining, setSiteDescription, setSiteName, siteSettings } from "./site";
import type { EditorState } from "./state.svelte";

// The site as a whole (seo-and-metadata design.md decision 8): everything here is part of the
// document, so it's undoable, previewed and published like the pages.
let { editor }: { editor: EditorState } = $props();
const i18n = getI18n();

const site = $derived(siteSettings(editor.session.doc));
</script>

<section class="panel" aria-labelledby="site-panel-title" data-history-keys>
  <h2 id="site-panel-title">{i18n.t("editor.site.title")}</h2>
  {#if editor.sharedReadOnly}<SharedNote {editor} tab="site" />{/if}

  <label for={siteFieldElementId("name")}>{i18n.t("editor.site.name")}</label>
  <input
    id={siteFieldElementId("name")}
    type="text"
    value={site.name}
    oninput={(e) => setSiteName(editor.session, e.currentTarget.value)}
  />

  <label for={siteFieldElementId("description")}>{i18n.t("editor.site.description")}</label>
  <textarea
    id={siteFieldElementId("description")}
    rows="3"
    value={site.description}
    aria-describedby="site-description-hint"
    oninput={(e) => setSiteDescription(editor.session, e.currentTarget.value)}
  ></textarea>
  <p class="hint" id="site-description-hint">{i18n.t("editor.site.descriptionHint")}</p>

  <ImageSetting
    {editor}
    ownerId={site.id}
    slot="favicon"
    label={i18n.t("editor.site.favicon")}
    fieldId={siteFieldElementId("favicon")}
    locked={editor.sharedReadOnly}
    square
    emptyNote={i18n.t("editor.site.faviconNone")}
  />

  <ImageSetting
    {editor}
    ownerId={site.id}
    slot="share_image"
    label={i18n.t("editor.site.shareImage")}
    fieldId={siteFieldElementId("share_image")}
    locked={editor.sharedReadOnly}
    altFieldId={siteFieldElementId("share_image_alt")}
    emptyNote={i18n.t("editor.site.shareNone")}
  />

  <fieldset>
    <legend>{i18n.t("editor.site.ai")}</legend>
    <label class="check">
      <input
        type="checkbox"
        checked={site.allow_ai_search}
        disabled={editor.sharedReadOnly}
        aria-describedby="site-ai-search-hint"
        onchange={(e) => setAiSearch(editor.session, e.currentTarget.checked)}
      />
      {i18n.t("editor.site.aiSearch")}
    </label>
    <p class="hint" id="site-ai-search-hint">
      {i18n.t("editor.site.aiSearchHint")}
    </p>
    <label class="check">
      <input
        type="checkbox"
        checked={site.allow_ai_training}
        disabled={editor.sharedReadOnly}
        aria-describedby="site-ai-training-hint"
        onchange={(e) => setAiTraining(editor.session, e.currentTarget.checked)}
      />
      {i18n.t("editor.site.aiTraining")}
    </label>
    <p class="hint" id="site-ai-training-hint">
      {i18n.t("editor.site.aiTrainingHint")}
    </p>
  </fieldset>
</section>

<style>
  .panel {
    padding: 1rem;
    border-bottom: 1px solid var(--ui-border);
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
  }

  h2 {
    margin: 0 0 0.5rem;
    font-size: 0.8rem;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: var(--ui-muted);
  }

  label {
    margin-top: 0.5rem;
    font-size: 0.9rem;
  }

  input[type="text"],
  textarea {
    font: inherit;
    padding: 0.3rem 0.4rem;
  }

  fieldset {
    margin: 0.75rem 0 0;
    padding: 0.5rem 0.75rem 0.75rem;
    border: 1px solid var(--ui-border);
    border-radius: 0.3rem;
  }

  legend {
    font-size: 0.9rem;
  }

  .check {
    display: flex;
    gap: 0.4rem;
    align-items: center;
  }

  .hint {
    margin: 0;
    font-size: 0.85rem;
    color: var(--ui-muted);
  }
</style>
