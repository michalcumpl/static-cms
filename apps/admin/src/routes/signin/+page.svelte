<script lang="ts">
import type { PageProps } from "./$types";

let { form }: PageProps = $props();
</script>

<svelte:head>
  <title>Sign in – Static CMS</title>
</svelte:head>

<main class="auth">
  <h1>Sign in</h1>
  {#if form?.sent}
    <p role="status">
      Check your email. If <strong>{form.email}</strong> has an account, we sent a sign-in link. It
      works once, for 15 minutes.
    </p>
  {:else}
    <form method="POST">
      <label for="email">Email address</label>
      <input
        id="email"
        name="email"
        type="email"
        autocomplete="email"
        required
        defaultValue={form?.email ?? ""}
        aria-invalid={form?.invalid ? "true" : undefined}
        aria-describedby={form?.invalid || form?.rateLimited ? "signin-error" : undefined}
      />
      {#if form?.invalid}
        <p id="signin-error" class="error" role="alert">Enter an email address.</p>
      {:else if form?.rateLimited}
        <p id="signin-error" class="error" role="alert">Too many attempts. Try again in 15 minutes.</p>
      {/if}
      <button type="submit">Email me a sign-in link</button>
    </form>
    <p class="note">Accounts are by invitation. Ask the site's owner to invite you.</p>
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

  label,
  input {
    display: block;
    width: 100%;
  }

  input {
    margin: 0.25rem 0 1rem;
    padding: 0.5rem;
    font: inherit;
  }

  button {
    font: inherit;
    padding: 0.5rem 1rem;
  }

  .error {
    color: #a3161a;
  }

  .note {
    color: #555;
    font-size: 0.9rem;
  }
</style>
