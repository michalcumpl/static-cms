<script lang="ts">
import type { PageProps } from "./$types";

let { form }: PageProps = $props();

const messages = {
  used: "This invitation was already accepted.",
  expired: "This invitation has expired. Ask for a new one.",
  cancelled: "This invitation was cancelled.",
  invalid: "This invitation link isn't valid.",
};
</script>

<svelte:head>
  <title>Invitation – Static CMS</title>
</svelte:head>

<main class="auth">
  <h1>Invitation</h1>
  {#if form?.reason}
    <p class="error" role="alert">{messages[form.reason]}</p>
    <p><a href="/signin">Sign in</a></p>
  {:else}
    <form method="POST">
      <p>You were invited to edit a website with Static CMS.</p>
      <button type="submit">Accept invitation</button>
    </form>
  {/if}
</main>

<style>
  .auth {
    max-width: 24rem;
    margin: 4rem auto;
    padding: 0 1rem;
    font-family: system-ui, sans-serif;
    line-height: 1.5;
  }

  button {
    font: inherit;
    padding: 0.5rem 1rem;
  }

  .error {
    color: #a3161a;
  }
</style>
