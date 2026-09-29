import { requireUser } from "$lib/server/access";
import { getDb } from "$lib/server/app";
import { listWorkspaces } from "$lib/server/members";
import type { PageServerLoad } from "./$types";

/** The signed-in member's workspaces and projects; everyone else goes to sign-in. */
export const load: PageServerLoad = (event) => {
  const user = requireUser(event);
  return { user, workspaces: listWorkspaces(getDb(), user.id) };
};
