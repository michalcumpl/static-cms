<script lang="ts">
import ImageSetting from "./ImageSetting.svelte";
import { siteFieldElementId } from "./locate";
import { setAiSearch, setAiTraining, setSiteDescription, setSiteName, siteSettings } from "./site";
import type { EditorState } from "./state.svelte";

// The site as a whole (seo-and-metadata design.md decision 8): everything here is part of the
// document, so it's undoable, previewed and published like the pages.
let { editor }: { editor: EditorState } = $props();

const site = $derived(siteSettings(editor.session.doc));
</script>

<section class="panel" aria-labelledby="site-panel-title" data-history-keys>
  <h2 id="site-panel-title">Site</h2>

  <label for={siteFieldElementId("name")}>Name</label>
  <input
    id={siteFieldElementId("name")}
    type="text"
    value={site.name}
    oninput={(e) => setSiteName(editor.session, e.currentTarget.value)}
  />

  <label for={siteFieldElementId("description")}>Description for search engines</label>
  <textarea
    id={siteFieldElementId("description")}
    rows="3"
    value={site.description}
    aria-describedby="site-description-hint"
    oninput={(e) => setSiteDescription(editor.session, e.currentTarget.value)}
  ></textarea>
  <p class="hint" id="site-description-hint">Used by pages without a description of their own.</p>

  <ImageSetting
    {editor}
    ownerId={site.id}
    slot="favicon"
    label="Favicon (the icon in browser tabs)"
    fieldId={siteFieldElementId("favicon")}
    square
    emptyNote="No favicon: browsers show a blank page icon."
  />

  <ImageSetting
    {editor}
    ownerId={site.id}
    slot="share_image"
    label="Share image (shown when a link is shared)"
    fieldId={siteFieldElementId("share_image")}
    altFieldId={siteFieldElementId("share_image_alt")}
    emptyNote="No share image: links are shared with their title and description only."
  />

  <fieldset>
    <legend>AI services</legend>
    <label class="check">
      <input
        type="checkbox"
        checked={site.allow_ai_search}
        aria-describedby="site-ai-search-hint"
        onchange={(e) => setAiSearch(editor.session, e.currentTarget.checked)}
      />
      AI search and answers
    </label>
    <p class="hint" id="site-ai-search-hint">
      AI assistants and AI search, such as ChatGPT, Claude and Perplexity, may read and quote the
      site. Switching this off asks them not to; some still fetch a page when a user asks for it.
    </p>
    <label class="check">
      <input
        type="checkbox"
        checked={site.allow_ai_training}
        aria-describedby="site-ai-training-hint"
        onchange={(e) => setAiTraining(editor.session, e.currentTarget.checked)}
      />
      AI training
    </label>
    <p class="hint" id="site-ai-training-hint">
      AI companies may use the site's text to train their models. Switching this off asks them not
      to. Google and Bing search are not affected either way.
    </p>
  </fieldset>
</section>

<style>
  .panel {
    padding: 1rem;
    border-bottom: 1px solid #ddd;
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
  }

  h2 {
    margin: 0 0 0.5rem;
    font-size: 0.8rem;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: #555;
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
    border: 1px solid #ddd;
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
    color: #555;
  }
</style>
