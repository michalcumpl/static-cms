<script lang="ts">
import { getI18n } from "$lib/i18n";
import Button from "$lib/ui/Button.svelte";
import type { DesignSummary } from "./summary";

// The site's design at a glance, with "Change design", which opens the editor's Design tab
// (control-panel design decision 7). Design stays in the editor until templates arrive.
let {
  design,
  logoUrl,
  editHref,
}: { design: DesignSummary; logoUrl: string | undefined; editHref: string } = $props();
const i18n = getI18n();
</script>

<section class="design" aria-labelledby="design-card-title">
  <h2 id="design-card-title">{i18n.t("panel.design.title")}</h2>
  <div class="swatches" role="img" aria-label={i18n.t("panel.design.colors")}>
    {#each design.colors as color, index (index)}
      <span class="swatch" style="background: {color}"></span>
    {/each}
  </div>
  <p class="fonts">
    {i18n.t("panel.design.fonts", { heading: design.headingFont, body: design.bodyFont })}
  </p>
  {#if logoUrl}
    <img class="logo" src={logoUrl} alt={i18n.t("panel.design.logo")} />
  {/if}
  <Button href={editHref} icon="pencil">{i18n.t("panel.design.change")}</Button>
</section>

<style>
  .design {
    display: flex;
    flex-direction: column;
    gap: var(--ui-space-2);
    align-items: flex-start;
  }

  h2 {
    margin: 0;
    font-size: var(--ui-text-lg, 1.1rem);
  }

  .swatches {
    display: flex;
    gap: var(--ui-space-1);
  }

  .swatch {
    width: 1.75rem;
    height: 1.75rem;
    border-radius: 50%;
    border: 1px solid var(--ui-border-strong);
  }

  .fonts {
    margin: 0;
    color: var(--ui-muted);
    font-size: var(--ui-text-sm);
  }

  .logo {
    max-height: 2.5rem;
    max-width: 10rem;
  }
</style>
