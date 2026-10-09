<script lang="ts">
import { openAfterSaving } from "$lib/editor/screen.svelte";
import { getEditor } from "$lib/editor/state.svelte";
import { setBlockHidden } from "$lib/editor/visibility";
import { getI18n } from "$lib/i18n";
import { homeSections } from "./home-sections";

// The home page's blocks with their "Show on website" switches (project-page, "Home page
// sections"). It edits the section's working copy, so the section's Save saves the switches.
const editor = getEditor();
const i18n = getI18n();
const sections = $derived(homeSections(editor.session.doc as never));
const editHome = $derived(editor.paths.edit(editor.homeId));
</script>

<section class="home-sections" aria-labelledby="home-sections-title">
  <h2 id="home-sections-title">{i18n.t("panel.homeSections.title")}</h2>
  {#if sections.length === 0}
    <p class="empty">{i18n.t("panel.homeSections.empty")}</p>
  {:else}
    <ul>
      {#each sections as section (section.id)}
        {@const name = i18n.t("editor.handles.block", {
          name: i18n.t(`editor.blocks.${section.type}.name`),
        })}
        <li class:hidden={section.hidden}>
          <label>
            <input
              type="checkbox"
              role="switch"
              checked={!section.hidden}
              aria-describedby="home-sections-switch"
              onchange={(e) => setBlockHidden(editor.session, section.id, !e.currentTarget.checked)}
            />
            <span>{section.heading ? `${name} · ${section.heading}` : name}</span>
          </label>
        </li>
      {/each}
    </ul>
    <p id="home-sections-switch" class="hint">{i18n.t("panel.homeSections.hint")}</p>
  {/if}
  <a
    href={editHome}
    onclick={(event) => {
      event.preventDefault();
      void openAfterSaving(editor, i18n.t("panel.homeSections.saveFirst"), editHome);
    }}>{i18n.t("panel.homeSections.edit")}</a
  >
</section>

<style>
  .home-sections {
    display: flex;
    flex-direction: column;
    gap: var(--ui-space-2);
    align-items: flex-start;
  }

  h2 {
    margin: 0;
    font-size: var(--ui-text-lg, 1.1rem);
  }

  ul {
    display: flex;
    flex-direction: column;
    gap: var(--ui-space-1);
    margin: 0;
    padding: 0;
    list-style: none;
  }

  label {
    display: flex;
    gap: var(--ui-space-2);
    align-items: center;
    font-size: var(--ui-text-sm);
    cursor: pointer;
  }

  .hidden span {
    color: var(--ui-muted);
  }

  .hint,
  .empty {
    margin: 0;
    color: var(--ui-muted);
    font-size: var(--ui-text-sm);
  }
</style>
