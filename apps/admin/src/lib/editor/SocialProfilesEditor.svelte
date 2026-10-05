<script lang="ts">
import { socialKind } from "@webmio/model";
import { getI18n } from "$lib/i18n";
import {
  addSocialProfile,
  moveSocialProfile,
  normalizeSocialUrl,
  removeSocialProfile,
  setSocialUrl,
  socialProfiles,
} from "./business";
import type { EditorState } from "./state.svelte";

// The business's social profiles (business-collections, "Business settings"): shared by every
// language, so read-only outside the primary.
let { editor, disabled = false }: { editor: EditorState; disabled?: boolean } = $props();
const i18n = getI18n();
const profiles = $derived(socialProfiles(editor.session.doc));

function leave(id: string, value: string) {
  const url = normalizeSocialUrl(value);
  if (url !== value) setSocialUrl(editor.session, id, url);
}

function add() {
  const id = addSocialProfile(editor.session);
  queueMicrotask(() => document.getElementById(`social-${id}`)?.focus());
}
</script>

<fieldset class="social">
  <legend>{i18n.t("editor.business.social")}</legend>
  {#each profiles as profile, index (profile.id)}
    {@const kind = socialKind(profile.url).label}
    <div class="profile">
      <label for="social-{profile.id}">
        {i18n.t("editor.business.profile", { number: index + 1 })}{#if kind}: <strong>{kind}</strong>{/if}
      </label>
      <div class="row">
        <input
          id="social-{profile.id}"
          type="url"
          value={profile.url}
          placeholder={i18n.t("editor.business.profileExample")}
          {disabled}
          oninput={(e) => setSocialUrl(editor.session, profile.id, e.currentTarget.value)}
          onchange={(e) => leave(profile.id, e.currentTarget.value)}
        />
        {#if !disabled}
          <button
            type="button"
            aria-label={i18n.t("editor.business.moveProfileUp", { number: index + 1 })}
            disabled={index === 0}
            onclick={() => moveSocialProfile(editor.session, profile.id, -1)}>↑</button
          >
          <button
            type="button"
            aria-label={i18n.t("editor.business.moveProfileDown", { number: index + 1 })}
            disabled={index === profiles.length - 1}
            onclick={() => moveSocialProfile(editor.session, profile.id, 1)}>↓</button
          >
          <button
            type="button"
            aria-label={i18n.t("editor.business.removeProfile", { number: index + 1 })}
            onclick={() => removeSocialProfile(editor.session, profile.id)}>×</button
          >
        {/if}
      </div>
    </div>
  {/each}
  {#if !disabled}
    <button type="button" class="add" onclick={add}>{i18n.t("editor.business.addProfile")}</button>
  {/if}
</fieldset>

<style>
  .social {
    margin: 0.75rem 0 0;
    padding: 0;
    border: 0;
    display: flex;
    flex-direction: column;
    gap: 0.4rem;
  }

  legend {
    font-size: 0.9rem;
    margin-bottom: 0.25rem;
  }

  .profile label {
    font-size: 0.85rem;
  }

  .row {
    display: flex;
    gap: 0.25rem;
  }

  .row input {
    flex: 1;
    min-width: 0;
    font: inherit;
    padding: 0.3rem 0.4rem;
  }

  .add {
    align-self: flex-start;
  }
</style>
