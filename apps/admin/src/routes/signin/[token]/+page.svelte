<script lang="ts">
import type { PageProps } from "./$types";

let { form }: PageProps = $props();

const messages = {
  used: "This sign-in link was already used.",
  expired: "This sign-in link has expired.",
  invalid: "This sign-in link isn't valid.",
};
</script>

<svelte:head>
  <title>Sign in – Static CMS</title>
</svelte:head>

<main class="auth">
  <h1>Sign in</h1>
  {#if form?.reason}
    <p class="error" role="alert">{messages[form.reason]}</p>
    <p><a href="/signin">Request a new link</a></p>
  {:else}
    <form method="POST">
      <p>Continue to sign in to Static CMS.</p>
      <button type="submit">Continue</button>
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
