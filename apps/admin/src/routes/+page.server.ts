import { requireUser } from "$lib/server/access";
import { getDb } from "$lib/server/app";
import { listWorkspaces } from "$lib/server/members";
import type { PageServerLoad } from "./$types";

/**
 * The signed-in member's workspaces and projects, or only one workspace's when the switcher
 * chose it (`?workspace=`); everyone else goes to sign-in.
 */
export const load: PageServerLoad = (event) => {
  const user = requireUser(event);
  const all = listWorkspaces(getDb(), user.id);
  const chosen = event.url.searchParams.get("workspace");
  const workspaces =
    chosen && all.some((w) => w.id === chosen) ? all.filter((w) => w.id === chosen) : all;
  return { user, workspaces };
};
