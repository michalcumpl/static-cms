<script lang="ts">
import type { Snippet } from "svelte";
import LanguageLinks from "./LanguageLinks.svelte";

// The centred card of the pages people see before signing in.
let { title, children }: { title: string; children: Snippet } = $props();
</script>

<main class="auth">
  <section class="panel" aria-labelledby="auth-title">
    <h1 id="auth-title">{title}</h1>
    {@render children()}
    <footer><LanguageLinks /></footer>
  </section>
</main>

<style>
  footer {
    padding-top: var(--ui-space-3);
    border-top: 1px solid var(--ui-border);
  }

  .auth {
    display: flex;
    justify-content: center;
    padding: var(--ui-space-7) var(--ui-space-4);
  }

  .panel {
    display: flex;
    flex-direction: column;
    gap: var(--ui-space-4);
    width: min(26rem, 100%);
    padding: var(--ui-space-6);
    border: 1px solid var(--ui-border);
    border-radius: var(--ui-radius-card);
    background: var(--ui-surface);
    box-shadow: var(--ui-shadow);
    box-sizing: border-box;
  }

  h1 {
    margin: 0;
    font-size: var(--ui-text-xl);
  }

  .panel :global(p) {
    margin: 0;
  }

  .panel :global(form) {
    display: flex;
    flex-direction: column;
    gap: var(--ui-space-4);
  }
</style>
