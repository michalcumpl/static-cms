<script lang="ts">
import {
  CONTRAST_PAIRS,
  contrastRatio,
  FONT_IDS,
  FONTS,
  fontPreviewCss,
  fontStack,
  MIN_CONTRAST,
  THEME_PRESETS,
  type ThemeColor,
} from "@static-cms/site";
import ImageSetting from "./ImageSetting.svelte";
import { themeFieldElementId } from "./locate";
import SharedNote from "./SharedNote.svelte";
import { siteSettings, slotImage } from "./site";
import type { EditorState } from "./state.svelte";
import {
  applyPreset,
  isHexColor,
  isPresetApplied,
  RADIUS_CHOICES,
  setHeaderShowName,
  setLogo,
  setThemeColor,
  setThemeFont,
  setThemeLength,
  type ThemeFont,
  type ThemeLength,
  themeSettings,
  WIDTH_CHOICES,
} from "./theme";

// The site's look (theme-and-branding design.md decision 7): everything here is part of the
// document, shared by every language, undoable, previewed and published like the pages.
let { editor }: { editor: EditorState } = $props();

const theme = $derived(themeSettings(editor.session.doc));
const site = $derived(siteSettings(editor.session.doc));
const hasLogo = $derived(slotImage(editor.session.doc, site.id, "logo") !== undefined);
const shared = $derived(editor.sharedReadOnly);

const COLORS: [ThemeColor, string][] = [
  ["color_primary", "Primary (links and buttons)"],
  ["color_secondary", "Secondary (panels and lines)"],
  ["color_background", "Background"],
  ["color_text", "Text"],
];

const FONT_ROLES: [ThemeFont, string][] = [
  ["font_heading", "Heading font"],
  ["font_body", "Body font"],
];

const LENGTHS: [ThemeLength, string, readonly { label: string; value: string }[]][] = [
  ["radius", "Corners", RADIUS_CHOICES],
  ["content_width", "Content width", WIDTH_CHOICES],
];

/** A colour picker only takes `#rrggbb`. */
const sixDigits = (hex: string) =>
  /^#[0-9a-f]{3}$/i.test(hex) ? `#${[...hex.slice(1)].map((c) => c + c).join("")}` : hex;

const contrast = $derived(
  CONTRAST_PAIRS.map((pair) => {
    const fg = theme[pair.fg];
    const bg = theme[pair.bg];
    const ratio = isHexColor(fg) && isHexColor(bg) ? contrastRatio(fg, bg) : undefined;
    return { ...pair, fg, bg, ratio, passes: ratio !== undefined && ratio >= MIN_CONTRAST };
  }),
);

const previewCss = `<style>${fontPreviewCss("/fonts/")}</style>`;
</script>

<svelte:head>{@html previewCss}</svelte:head>

<section class="panel" aria-labelledby="theme-panel-title" data-history-keys>
  <h2 id="theme-panel-title">Theme</h2>
  {#if shared}<SharedNote {editor} tab="theme" />{/if}

  <fieldset disabled={shared}>
    <legend>Start from a preset</legend>
    <div class="presets">
      {#each THEME_PRESETS as preset (preset.name)}
        <button
          type="button"
          class="preset"
          aria-pressed={isPresetApplied(theme, preset)}
          style:background={preset.color_background}
          style:color={preset.color_text}
          style:border-radius={preset.radius}
          onclick={() => applyPreset(editor.session, preset)}
        >
          <span class="preset-name" style:font-family={fontStack(preset.font_heading)}>
            {preset.name}
          </span>
          <span class="swatches" aria-hidden="true">
            {#each [preset.color_primary, preset.color_secondary, preset.color_text] as color}
              <span class="swatch" style:background={color}></span>
            {/each}
          </span>
        </button>
      {/each}
    </div>
  </fieldset>

  <fieldset disabled={shared}>
    <legend>Colours</legend>
    {#each COLORS as [field, label] (field)}
      <div class="color">
        <label for={themeFieldElementId(field)}>{label}</label>
        <div class="color-inputs">
          <input
            type="color"
            aria-label="{label}: pick"
            value={sixDigits(theme[field])}
            oninput={(e) => setThemeColor(editor.session, field, e.currentTarget.value)}
          />
          <input
            id={themeFieldElementId(field)}
            type="text"
            class="hex"
            spellcheck="false"
            autocomplete="off"
            value={theme[field]}
            oninput={(e) => setThemeColor(editor.session, field, e.currentTarget.value)}
            onchange={(e) => (e.currentTarget.value = theme[field])}
          />
        </div>
      </div>
    {/each}
  </fieldset>

  <div class="contrast" aria-labelledby="theme-contrast-title" role="group">
    <h3 id="theme-contrast-title">Readability</h3>
    <ul>
      {#each contrast as pair (pair.name)}
        <li class:fails={!pair.passes}>
          <span class="sample" style:color={pair.fg} style:background={pair.bg} aria-hidden="true">
            Aa
          </span>
          <span class="pair-name">{pair.name}</span>
          <span class="ratio">
            {#if pair.ratio === undefined}
              –
            {:else}
              {pair.ratio.toFixed(2)}:1 · {pair.passes ? "Readable" : "Too low"}
            {/if}
          </span>
        </li>
      {/each}
    </ul>
    <p class="hint">Text needs a contrast of at least {MIN_CONTRAST}:1 to be easy to read.</p>
  </div>

  {#each FONT_ROLES as [field, label] (field)}
    <fieldset id={themeFieldElementId(field)} tabindex="-1" disabled={shared}>
      <legend>{label}</legend>
      {#each FONT_IDS as id (id)}
        <label class="choice font-choice">
          <input
            type="radio"
            name={field}
            value={id}
            checked={theme[field] === id}
            onchange={() => setThemeFont(editor.session, field, id)}
          />
          <span style:font-family={fontStack(id)}>{FONTS[id].name}</span>
          <span class="kind">{FONTS[id].kind === "serif" ? "serif" : "sans-serif"}</span>
        </label>
      {/each}
    </fieldset>
  {/each}

  {#each LENGTHS as [field, label, choices] (field)}
    <fieldset id={themeFieldElementId(field)} tabindex="-1" disabled={shared}>
      <legend>{label}</legend>
      <div class="row">
        {#each choices as choice (choice.value)}
          <label class="choice">
            <input
              type="radio"
              name={field}
              value={choice.value}
              checked={theme[field] === choice.value}
              onchange={() => setThemeLength(editor.session, field, choice.value)}
            />
            {choice.label}
          </label>
        {/each}
        {#if !choices.some((choice) => choice.value === theme[field])}
          <label class="choice">
            <input type="radio" name={field} checked disabled />
            Custom ({theme[field]})
          </label>
        {/if}
      </div>
    </fieldset>
  {/each}

  <ImageSetting
    {editor}
    ownerId={site.id}
    slot="logo"
    label="Logo (shown in the header)"
    fieldId={themeFieldElementId("logo")}
    locked={shared}
    emptyNote="No logo: the header shows the site name."
    set={(image) => setLogo(editor.session, image)}
  />
  <label class="check">
    <input
      id={themeFieldElementId("header_show_name")}
      type="checkbox"
      checked={!hasLogo || site.header_show_name}
      disabled={shared || !hasLogo}
      aria-describedby="theme-show-name-hint"
      onchange={(e) => setHeaderShowName(editor.session, e.currentTarget.checked)}
    />
    Show the site name next to the logo
  </label>
  <p class="hint" id="theme-show-name-hint">
    {hasLogo
      ? "When it's off, the logo stands alone and the site name describes it."
      : "Without a logo the header always shows the site name."}
  </p>
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

  h3 {
    margin: 0 0 0.25rem;
    font-size: 0.9rem;
  }

  fieldset {
    margin: 0.5rem 0 0;
    padding: 0.4rem 0.6rem 0.6rem;
    border: 1px solid #ddd;
    border-radius: 0.3rem;
  }

  legend {
    font-size: 0.9rem;
  }

  label {
    font-size: 0.9rem;
  }

  .presets {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 0.4rem;
  }

  .preset {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: 0.3rem;
    padding: 0.4rem 0.5rem;
    border: 1px solid #bbb;
    font: inherit;
    cursor: pointer;
  }

  .preset[aria-pressed="true"] {
    outline: 2px solid #1f5a8a;
    outline-offset: 1px;
  }

  .preset-name {
    font-weight: 700;
  }

  .swatches {
    display: flex;
    gap: 0.2rem;
  }

  .swatch {
    width: 0.9rem;
    height: 0.9rem;
    border-radius: 50%;
    border: 1px solid rgb(0 0 0 / 0.2);
  }

  .color {
    display: flex;
    flex-direction: column;
    margin-top: 0.3rem;
  }

  .color-inputs {
    display: flex;
    gap: 0.4rem;
    align-items: center;
  }

  input[type="color"] {
    width: 2.2rem;
    height: 1.8rem;
    padding: 0;
    border: 1px solid #bbb;
  }

  .hex {
    font: inherit;
    width: 6rem;
    padding: 0.3rem 0.4rem;
    font-family: ui-monospace, monospace;
  }

  .contrast {
    margin-top: 0.75rem;
  }

  .contrast ul {
    margin: 0;
    padding: 0;
    list-style: none;
  }

  .contrast li {
    display: grid;
    grid-template-columns: 2.2rem 1fr;
    column-gap: 0.5rem;
    align-items: center;
    padding: 0.2rem 0;
    font-size: 0.85rem;
  }

  .sample {
    grid-row: span 2;
    padding: 0.2rem 0;
    border: 1px solid #ccc;
    text-align: center;
    font-weight: 700;
  }

  .ratio {
    color: #2b6a2b;
  }

  .fails .ratio {
    color: #a32020;
    font-weight: 700;
  }

  .choice {
    display: flex;
    gap: 0.4rem;
    align-items: baseline;
    margin-top: 0.2rem;
  }

  .font-choice span:first-of-type {
    font-size: 1.05rem;
  }

  .kind {
    margin-left: auto;
    font-size: 0.75rem;
    color: #666;
  }

  .row {
    display: flex;
    flex-wrap: wrap;
    gap: 0 0.8rem;
  }

  .check {
    display: flex;
    gap: 0.4rem;
    align-items: center;
    margin-top: 0.5rem;
  }

  .hint {
    margin: 0;
    font-size: 0.85rem;
    color: #555;
  }
</style>
