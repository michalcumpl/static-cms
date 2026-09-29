import type { Handle, ServerInit } from "@sveltejs/kit";
import { getDb } from "$lib/server/app";
import { getSessionUser } from "$lib/server/auth";
import { importWorkingCopy } from "$lib/server/import-working-copy";
import { SESSION_COOKIE } from "$lib/server/session-cookie";

/** Opens the database (applying migrations) and imports a Milestone 2 working copy once. */
export const init: ServerInit = () => {
  const projectId = importWorkingCopy(getDb());
  if (projectId)
    console.log(`[import] Imported data/site.json into the "Default" workspace (${projectId}).`);
};

const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

/**
 * Refuses API requests that change data from another origin. SvelteKit checks form posts
 * itself; JSON requests (the editor's saves) are checked here. See design.md decision 5.
 */
export function isForeignApiWrite(request: Request, url: URL): boolean {
  if (SAFE_METHODS.has(request.method) || !url.pathname.startsWith("/api/")) return false;
  return request.headers.get("origin") !== url.origin;
}

export const handle: Handle = async ({ event, resolve }) => {
  if (isForeignApiWrite(event.request, event.url)) {
    return new Response("Cross-site request refused.", { status: 403 });
  }
  const token = event.cookies.get(SESSION_COOKIE);
  event.locals.user = token ? getSessionUser(getDb(), token) : undefined;
  return resolve(event);
};
