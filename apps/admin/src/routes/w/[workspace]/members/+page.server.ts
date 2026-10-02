import { fail } from "@sveltejs/kit";
import { eq } from "drizzle-orm";
import { notFound, requireOwner, requireUser } from "$lib/server/access";
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
  if (!role) notFound(event);
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

export const actions: Actions = {
  invite: async (event) => {
    const user = requireOwner(event, event.params.workspace);
    const form = await event.request.formData();
    const email = String(form.get("email") ?? "");
    const role = asRole(form.get("role"));
    // Failures carry a reason; the page says it in the interface language.
    if (!role) return fail(400, { invite: { email, reason: "choose-role" as const } });
    const result = await invite(getDb(), getMailer(), {
      actorId: user.id,
      workspaceId: event.params.workspace,
      email,
      role,
      origin: event.url.origin,
      locale: event.locals.locale,
    });
    if (!result.ok) {
      const reason = result.reason === "forbidden" ? ("forbidden-invite" as const) : result.reason;
      return fail(400, { invite: { email, reason } });
    }
    return { invited: email.trim().toLowerCase() };
  },

  role: async (event) => {
    const user = requireOwner(event, event.params.workspace);
    const form = await event.request.formData();
    const role = asRole(form.get("role"));
    if (!role) return fail(400, { change: { reason: "choose-role" as const } });
    const result = changeRole(
      getDb(),
      user.id,
      event.params.workspace,
      String(form.get("userId")),
      role,
    );
    if (!result.ok) return fail(400, { change: { reason: result.reason } });
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
    if (!result.ok) return fail(400, { change: { reason: result.reason } });
    return { removed: true };
  },

  cancel: async (event) => {
    const user = requireOwner(event, event.params.workspace);
    const form = await event.request.formData();
    cancelInvitation(getDb(), user.id, event.params.workspace, String(form.get("invitationId")));
    return { cancelled: true };
  },
};
