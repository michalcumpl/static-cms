<script lang="ts">
import { getI18n } from "$lib/i18n";
import Button from "$lib/ui/Button.svelte";
import Card from "$lib/ui/Card.svelte";
import Notice from "$lib/ui/Notice.svelte";
import Page from "$lib/ui/Page.svelte";
import PageHeader from "$lib/ui/PageHeader.svelte";
import type { PageProps } from "./$types";

let { data, form }: PageProps = $props();
const i18n = getI18n();
const isOwner = $derived(data.role === "owner");
const roleLabel = (role: "owner" | "editor") => i18n.t(`members.roles.${role}`);
const title = $derived(i18n.t("members.title", { workspace: data.workspace.name }));
</script>

<svelte:head>
  <title>{i18n.t("common.pageTitle", { page: title })}</title>
</svelte:head>

<Page>
  <PageHeader
    {title}
    breadcrumb={[{ href: "/", label: i18n.t("projects.title") }]}
    breadcrumbLabel={i18n.t("common.breadcrumb")}
  >
    {i18n.t("members.intro")}
  </PageHeader>

  {#if form?.change}
    <Notice kind="problem"><p>{i18n.t(`members.reason.${form.change.reason}`)}</p></Notice>
  {/if}

  <Card>
    <table>
      <thead>
        <tr>
          <th scope="col">{i18n.t("members.email")}</th>
          <th scope="col">{i18n.t("members.role")}</th>
          {#if isOwner}<th scope="col"><span class="visually-hidden">{i18n.t("members.actions")}</span></th>{/if}
        </tr>
      </thead>
      <tbody>
        {#each data.members as member (member.userId)}
          <tr>
            <td>{member.userId === data.user.id ? i18n.t("members.you", { email: member.email }) : member.email}</td>
            <td>
              {#if isOwner}
                <form method="POST" action="?/role" class="inline">
                  <input type="hidden" name="userId" value={member.userId} />
                  <label class="visually-hidden" for={`role-${member.userId}`}>{i18n.t("members.roleOf", { email: member.email })}</label>
                  <select id={`role-${member.userId}`} name="role" value={member.role}>
                    <option value="owner">{roleLabel("owner")}</option>
                    <option value="editor">{roleLabel("editor")}</option>
                  </select>
                  <Button type="submit" size="sm">{i18n.t("members.change")}</Button>
                </form>
              {:else}
                {roleLabel(member.role)}
              {/if}
            </td>
            {#if isOwner}
              <td class="end">
                <form method="POST" action="?/remove" class="inline">
                  <input type="hidden" name="userId" value={member.userId} />
                  <Button type="submit" kind="danger" size="sm" aria-label={i18n.t("members.removeMember", { email: member.email })}>
                    {i18n.t("common.remove")}
                  </Button>
                </form>
              </td>
            {/if}
          </tr>
        {/each}
      </tbody>
    </table>
  </Card>

  {#if isOwner}
    <Card title={i18n.t("members.invitations")} id="invitations">
      {#if data.invitations.length === 0}
        <p class="muted">{i18n.t("members.noInvitations")}</p>
      {:else}
        <ul class="invitations">
          {#each data.invitations as invitation (invitation.id)}
            <li>
              <span>
                {i18n.t("members.invitation", {
                  email: invitation.email,
                  role: roleLabel(invitation.role).toLowerCase(),
                  date: i18n.formatDate(invitation.expiresAt, "date"),
                })}
              </span>
              <form method="POST" action="?/cancel" class="inline">
                <input type="hidden" name="invitationId" value={invitation.id} />
                <Button type="submit" size="sm" aria-label={i18n.t("members.cancelInvitation", { email: invitation.email })}>
                  {i18n.t("common.cancel")}
                </Button>
              </form>
            </li>
          {/each}
        </ul>
      {/if}
    </Card>

    <Card title={i18n.t("members.invite")} id="invite">
      {#if form?.invited}
        <Notice kind="success"><p role="status">{i18n.t("members.invited", { email: form.invited })}</p></Notice>
      {/if}
      <form method="POST" action="?/invite" class="invite">
        <div class="field">
          <label for="invite-email">{i18n.t("signin.email")}</label>
          <input
            id="invite-email"
            name="email"
            type="email"
            required
            defaultValue={form?.invite?.email ?? ""}
            aria-invalid={form?.invite ? "true" : undefined}
            aria-describedby={form?.invite ? "invite-error" : undefined}
          />
        </div>
        <div class="field">
          <label for="invite-role">{i18n.t("members.role")}</label>
          <select id="invite-role" name="role">
            <option value="editor">{roleLabel("editor")}</option>
            <option value="owner">{roleLabel("owner")}</option>
          </select>
        </div>
        {#if form?.invite}
          <p id="invite-error" class="error" role="alert">
            {i18n.t(`members.reason.${form.invite.reason}`, { email: form.invite.email })}
          </p>
        {/if}
        <div><Button type="submit" kind="primary" icon="mail">{i18n.t("members.sendInvitation")}</Button></div>
      </form>
    </Card>
  {/if}
</Page>

<style>
  table {
    width: 100%;
    border-collapse: collapse;
  }

  th,
  td {
    padding: var(--ui-space-2) var(--ui-space-3);
    border-bottom: 1px solid var(--ui-border);
    text-align: left;
  }

  th {
    font-size: var(--ui-text-sm);
    color: var(--ui-muted);
    font-weight: 600;
  }

  tr:last-child td {
    border-bottom: 0;
  }

  .end {
    text-align: right;
  }

  .inline {
    display: inline-flex;
    align-items: center;
    gap: var(--ui-space-2);
    margin: 0;
  }

  select,
  input[type="email"] {
    min-height: var(--ui-control-sm);
    padding: 0 var(--ui-space-3);
    border: 1px solid var(--ui-border-strong);
    border-radius: var(--ui-radius-field);
    background: var(--ui-surface);
    font: var(--ui-text-sm) var(--ui-font);
    color: var(--ui-ink);
  }

  input[type="email"] {
    min-height: var(--ui-control);
  }

  .invitations {
    display: flex;
    flex-direction: column;
    gap: var(--ui-space-2);
    margin: 0;
    padding: 0;
    list-style: none;
  }

  .invitations li {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--ui-space-3);
  }

  .invite {
    display: flex;
    flex-direction: column;
    gap: var(--ui-space-3);
    max-width: 28rem;
  }

  .field {
    display: flex;
    flex-direction: column;
    gap: var(--ui-space-1);
  }

  label {
    font-size: var(--ui-text-sm);
    font-weight: 600;
  }

  .muted {
    margin: 0;
    color: var(--ui-muted);
  }

  .error {
    margin: 0;
    color: var(--ui-problem);
    font-size: var(--ui-text-sm);
  }

  .visually-hidden {
    position: absolute;
    width: 1px;
    height: 1px;
    overflow: hidden;
    clip-path: inset(50%);
  }
</style>
