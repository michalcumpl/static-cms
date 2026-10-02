<script lang="ts">
import { getI18n, LOCALES } from "$lib/i18n";
import { chooseLanguage } from "./language";

// Before signing in there's no account menu: the language is chosen here, for a browser that
// sends the wrong one. Each language is named in itself.
const i18n = getI18n();
</script>

<nav class="ui-language-links" aria-label={i18n.t("shell.interfaceLanguage")}>
  {#each LOCALES as locale, i (locale)}
    {#if i > 0}<span aria-hidden="true">·</span>{/if}
    <button
      type="button"
      lang={locale}
      aria-current={i18n.locale === locale ? "true" : undefined}
      onclick={() => locale !== i18n.locale && chooseLanguage(locale)}
    >
      {i18n.t(`common.language.${locale}`)}
    </button>
  {/each}
</nav>

<style>
  .ui-language-links {
    display: flex;
    justify-content: center;
    align-items: center;
    gap: var(--ui-space-2);
    color: var(--ui-muted);
    font-size: var(--ui-text-sm);
  }

  button {
    padding: 0.25rem;
    border: 0;
    background: none;
    color: var(--ui-link);
    font: inherit;
    text-decoration: underline;
    cursor: pointer;
  }

  button[aria-current="true"] {
    color: var(--ui-ink);
    font-weight: 600;
    text-decoration: none;
    cursor: default;
  }
</style>
