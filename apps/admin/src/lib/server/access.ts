// Access checks for routes (specs/accounts: "Access to projects"). Not signed in: pages go to
// sign-in, APIs get 401. Signed in but not a member: 404, so project IDs reveal nothing.
import { error, redirect } from "@sveltejs/kit";
import { getDb } from "./app";
import type { SessionUser } from "./auth";
import { type ProjectAccess, projectAccess, roleIn } from "./members";

interface AccessEvent {
  locals: App.Locals;
  url: URL;
}

/** The signed-in user; otherwise redirects to sign-in (pages) or answers 401 (`api: true`). */
export function requireUser(event: AccessEvent, options: { api?: boolean } = {}): SessionUser {
  if (event.locals.user) return event.locals.user;
  if (options.api) error(401, "Sign in first.");
  const next = event.url.pathname + event.url.search;
  redirect(303, `/signin?next=${encodeURIComponent(next)}`);
}

export function requireMember(
  event: AccessEvent,
  projectId: string,
  options: { api?: boolean } = {},
): ProjectAccess & { user: SessionUser } {
  const user = requireUser(event, options);
  const access = projectAccess(getDb(), user.id, projectId);
  if (!access) error(404, "Not found");
  return { ...access, user };
}

/** An owner of the workspace; members who aren't owners get 403, others 404. */
export function requireOwner(
  event: AccessEvent,
  workspaceId: string,
  options: { api?: boolean } = {},
): SessionUser {
  const user = requireUser(event, options);
  const role = roleIn(getDb(), user.id, workspaceId);
  if (!role) error(404, "Not found");
  if (role !== "owner") error(403, "Only owners can do this.");
  return user;
}

/** A member of the workspace (any role); others get 404, like projects. */
export function requireWorkspaceMember(
  event: AccessEvent,
  workspaceId: string,
  options: { api?: boolean } = {},
): { user: SessionUser; role: "owner" | "editor" } {
  const user = requireUser(event, options);
  const role = roleIn(getDb(), user.id, workspaceId);
  if (!role) error(404, "Not found");
  return { user, role };
}
