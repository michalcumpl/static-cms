import { error, fail } from "@sveltejs/kit";
import { eq } from "drizzle-orm";
import { requireOwner, requireUser } from "$lib/server/access";
import { getDb, getMailer } from "$lib/server/app";
import { type Role, roles, workspaces } from "$lib/server/db/schema";
import { cancelInvitation, invite, pendingInvitations } from "$lib/server/invitations";
import { changeRole, listMembers, removeMember, roleIn } from "$lib/server/members";
import type { Actions, PageServerLoad } from "./$types";

/** Members see the list; only owners can change it (the actions check that). */
export const load: PageServerLoad = (event) => {
  const user = requireUser(event);
  const db = getDb();
  const workspaceId = event.params.workspace;
  const role = roleIn(db, user.id, workspaceId);
  if (!role) error(404, "Not found");
  const workspace = db.select().from(workspaces).where(eq(workspaces.id, workspaceId)).get();
  return {
    user,
    role,
    workspace: { id: workspaceId, name: workspace?.name ?? "" },
    members: listMembers(db, workspaceId),
    invitations: role === "owner" ? pendingInvitations(db, workspaceId) : [],
  };
};

function asRole(value: FormDataEntryValue | null): Role | undefined {
  return roles.find((r) => r === value);
}

const changeMessages = {
  forbidden: "Only owners can change members.",
  "not-found": "That person isn't a member any more.",
  "last-owner": "A workspace needs at least one owner. Make someone else an owner first.",
};

export const actions: Actions = {
  invite: async (event) => {
    const user = requireOwner(event, event.params.workspace);
    const form = await event.request.formData();
    const email = String(form.get("email") ?? "");
    const role = asRole(form.get("role"));
    if (!role) return fail(400, { invite: { email, message: "Choose a role." } });
    const result = await invite(getDb(), getMailer(), {
      actorId: user.id,
      workspaceId: event.params.workspace,
      email,
      role,
      origin: event.url.origin,
    });
    if (!result.ok) {
      const message = {
        forbidden: "Only owners can invite.",
        "already-member": `${email} is already a member.`,
        "invalid-email": "Enter an email address.",
      }[result.reason];
      return fail(400, { invite: { email, message } });
    }
    return { invited: email.trim().toLowerCase() };
  },

  role: async (event) => {
    const user = requireOwner(event, event.params.workspace);
    const form = await event.request.formData();
    const role = asRole(form.get("role"));
    if (!role) return fail(400, { change: { message: "Choose a role." } });
    const result = changeRole(
      getDb(),
      user.id,
      event.params.workspace,
      String(form.get("userId")),
      role,
    );
    if (!result.ok) return fail(400, { change: { message: changeMessages[result.reason] } });
    return { changed: true };
  },

  remove: async (event) => {
    const user = requireOwner(event, event.params.workspace);
    const form = await event.request.formData();
    const result = removeMember(
      getDb(),
      user.id,
      event.params.workspace,
      String(form.get("userId")),
    );
    if (!result.ok) return fail(400, { change: { message: changeMessages[result.reason] } });
    return { removed: true };
  },

  cancel: async (event) => {
    const user = requireOwner(event, event.params.workspace);
    const form = await event.request.formData();
    cancelInvitation(getDb(), user.id, event.params.workspace, String(form.get("invitationId")));
    return { cancelled: true };
  },
};
