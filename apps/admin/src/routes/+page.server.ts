import { requireUser } from "$lib/server/access";
import { getDb } from "$lib/server/app";
import { listWorkspaces } from "$lib/server/members";
import { deletedProjects } from "$lib/server/project-deletion";
import { unfinishedSetups } from "$lib/server/setup";
import type { PageServerLoad } from "./$types";

/**
 * The signed-in member's workspaces and projects, or only one workspace's when the switcher
 * chose it (`?workspace=`); everyone else goes to sign-in. Owners also get their workspaces'
 * deleted projects, and `?deleted=` names the website just deleted (project-deletion decision 5).
 */
export const load: PageServerLoad = (event) => {
  const user = requireUser(event);
  const all = listWorkspaces(getDb(), user.id);
  const chosen = event.url.searchParams.get("workspace");
  const workspaces =
    chosen && all.some((w) => w.id === chosen) ? all.filter((w) => w.id === chosen) : all;
  return {
    user,
    workspaces: workspaces.map((w) => ({
      ...w,
      deleted: w.role === "owner" ? deletedProjects(getDb(), w.id) : [],
      // Owners' unfinished guided setups, by project: the step to go on with.
      setups:
        w.role === "owner"
          ? unfinishedSetups(
              getDb(),
              w.projects.map((p) => p.id),
            )
          : {},
    })),
    deletedName: event.url.searchParams.get("deleted"),
  };
};
