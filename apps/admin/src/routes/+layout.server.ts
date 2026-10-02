import { getDb } from "$lib/server/app";
import { listWorkspaces } from "$lib/server/members";
import type { LayoutServerLoad } from "./$types";

/**
 * What the app shell needs on every page (admin-foundation design.md decision 4): the interface
 * language, and for a signed-in person their email, their workspaces and the current one.
 */
export const load: LayoutServerLoad = ({ locals, params, url }) => {
  const user = locals.user;
  if (!user) return { locale: locals.locale, user: null, workspaces: [], currentWorkspaceId: null };
  const workspaces = listWorkspaces(getDb(), user.id);
  const projectId = "project" in params ? params.project : undefined;
  const currentWorkspaceId =
    ("workspace" in params ? params.workspace : undefined) ??
    url.searchParams.get("workspace") ??
    workspaces.find((w) => w.projects.some((p) => p.id === projectId))?.id ??
    null;
  return {
    locale: locals.locale,
    user: { email: user.email },
    workspaces: workspaces.map(({ id, name }) => ({ id, name })),
    currentWorkspaceId,
  };
};
