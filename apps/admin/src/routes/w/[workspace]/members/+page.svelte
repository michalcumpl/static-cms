<script lang="ts">
import type { PageProps } from "./$types";

let { data, form }: PageProps = $props();
const isOwner = $derived(data.role === "owner");
const roleLabel = { owner: "Owner", editor: "Editor" } as const;
</script>

<svelte:head>
  <title>Members of {data.workspace.name} – Static CMS</title>
</svelte:head>

<main>
  <p><a href="/">← Projects</a></p>
  <h1>Members of {data.workspace.name}</h1>
  <p class="hint">
    Owners manage members and projects. Editors edit and save the workspace's projects.
  </p>

  {#if form?.change}
    <p class="error" role="alert">{form.change.message}</p>
  {/if}

  <table>
    <thead>
      <tr><th scope="col">Email</th><th scope="col">Role</th>{#if isOwner}<th scope="col"><span class="visually-hidden">Actions</span></th>{/if}</tr>
    </thead>
    <tbody>
      {#each data.members as member (member.userId)}
        <tr>
          <td>{member.email}{member.userId === data.user.id ? " (you)" : ""}</td>
          <td>
            {#if isOwner}
              <form method="POST" action="?/role" class="inline">
                <input type="hidden" name="userId" value={member.userId} />
                <label class="visually-hidden" for={`role-${member.userId}`}>Role of {member.email}</label>
                <select id={`role-${member.userId}`} name="role" value={member.role}>
                  <option value="owner">Owner</option>
                  <option value="editor">Editor</option>
                </select>
                <button type="submit">Change</button>
              </form>
            {:else}
              {roleLabel[member.role]}
            {/if}
          </td>
          {#if isOwner}
            <td>
              <form method="POST" action="?/remove" class="inline">
                <input type="hidden" name="userId" value={member.userId} />
                <button type="submit" aria-label={`Remove ${member.email}`}>Remove</button>
              </form>
            </td>
          {/if}
        </tr>
      {/each}
    </tbody>
  </table>

  {#if isOwner}
    <h2>Invitations</h2>
    {#if data.invitations.length === 0}
      <p>No pending invitations.</p>
    {:else}
      <ul>
        {#each data.invitations as invitation (invitation.id)}
          <li>
            {invitation.email} as {roleLabel[invitation.role].toLowerCase()}, until
            {invitation.expiresAt.toLocaleDateString()}
            <form method="POST" action="?/cancel" class="inline">
              <input type="hidden" name="invitationId" value={invitation.id} />
              <button type="submit" aria-label={`Cancel the invitation for ${invitation.email}`}>Cancel</button>
            </form>
          </li>
        {/each}
      </ul>
    {/if}

    <h2>Invite someone</h2>
    {#if form?.invited}
      <p role="status">Invitation sent to {form.invited}. The link works once, for 7 days.</p>
    {/if}
    <form method="POST" action="?/invite">
      <label for="invite-email">Email address</label>
      <input
        id="invite-email"
        name="email"
        type="email"
        required
        defaultValue={form?.invite?.email ?? ""}
        aria-invalid={form?.invite ? "true" : undefined}
        aria-describedby={form?.invite ? "invite-error" : undefined}
      />
      <label for="invite-role">Role</label>
      <select id="invite-role" name="role">
        <option value="editor">Editor</option>
        <option value="owner">Owner</option>
      </select>
      {#if form?.invite}
        <p id="invite-error" class="error" role="alert">{form.invite.message}</p>
      {/if}
      <button type="submit">Send invitation</button>
    </form>
  {/if}
</main>

<style>
  main {
    max-width: 48rem;
    margin: 0 auto;
    padding: 1rem;
    font-family: system-ui, sans-serif;
    line-height: 1.5;
  }

  table {
    border-collapse: collapse;
    width: 100%;
  }

  th,
  td {
    text-align: left;
    padding: 0.4rem 0.5rem;
    border-bottom: 1px solid #eee;
  }

  .inline {
    display: inline-flex;
    gap: 0.4rem;
    margin: 0;
  }

  label {
    display: block;
    margin-top: 0.75rem;
  }

  input[type="email"],
  select {
    font: inherit;
    padding: 0.3rem;
  }

  button {
    font: inherit;
  }

  .hint {
    color: #555;
  }

  .error {
    color: #a3161a;
  }

  .visually-hidden {
    position: absolute;
    width: 1px;
    height: 1px;
    overflow: hidden;
    clip-path: inset(50%);
  }
</style>
