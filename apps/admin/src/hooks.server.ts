import type { Handle, ServerInit } from "@sveltejs/kit";
import { getDb } from "$lib/server/app";
import { getSessionUser } from "$lib/server/auth";
import { pruneMessages } from "$lib/server/contact-forms";
import { importWorkingCopy } from "$lib/server/import-working-copy";
import { LOCALE_COOKIE, resolveLocale } from "$lib/server/locale";
import { bodySizeWarning, registerAllLegacyMedia } from "$lib/server/media";
import { markInterruptedPublishes } from "$lib/server/publishing/history";
import { SESSION_COOKIE } from "$lib/server/session-cookie";

/**
 * Opens the database (applying migrations), imports a Milestone 2 working copy once, and
 * registers image files from before the media library.
 */
export const init: ServerInit = async () => {
  const projectId = importWorkingCopy(getDb());
  if (projectId)
    console.log(`[import] Imported data/site.json into the "Default" workspace (${projectId}).`);
  const interrupted = markInterruptedPublishes(getDb());
  if (interrupted > 0)
    console.warn(`[publish] Marked ${interrupted} interrupted publish(es) as failed.`);
  const pruned = pruneMessages(getDb());
  if (pruned > 0) console.log(`[forms] Deleted ${pruned} message(s) older than 12 months.`);
  const warning = bodySizeWarning(process.env);
  if (warning) console.warn(`[media] ${warning}`);
  for (const [project, keys] of await registerAllLegacyMedia(getDb())) {
    console.log(`[media] Registered ${keys.join(", ")} in project ${project}.`);
  }
};

const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

/**
 * Refuses API requests that change data from another origin; JSON requests (the editor's saves)
 * included. See design.md decision 5. Form posts are checked by `isForeignFormPost`.
 */
export function isForeignApiWrite(request: Request, url: URL): boolean {
  if (SAFE_METHODS.has(request.method) || !url.pathname.startsWith("/api/")) return false;
  return request.headers.get("origin") !== url.origin;
}

/** The content types a browser posts a form with, which another site can send. */
const FORM_TYPES = new Set([
  "application/x-www-form-urlencoded",
  "multipart/form-data",
  "text/plain",
]);

/**
 * Refuses form posts from another origin, as SvelteKit's own check did before `svelte.config.js`
 * trusted every origin for the websites' contact forms (contact-form design decision 6): those
 * post to `/forms/` from the websites, everything else only from the admin itself.
 */
export function isForeignFormPost(request: Request, url: URL): boolean {
  if (SAFE_METHODS.has(request.method) || url.pathname.startsWith("/forms/")) return false;
  const type = (request.headers.get("content-type") ?? "").split(";")[0]?.trim().toLowerCase();
  return FORM_TYPES.has(type ?? "") && request.headers.get("origin") !== url.origin;
}

export const handle: Handle = async ({ event, resolve }) => {
  if (isForeignApiWrite(event.request, event.url) || isForeignFormPost(event.request, event.url)) {
    return new Response("Cross-site request refused.", { status: 403 });
  }
  const token = event.cookies.get(SESSION_COOKIE);
  event.locals.user = token ? getSessionUser(getDb(), token) : undefined;
  event.locals.locale = resolveLocale({
    user: event.locals.user,
    cookie: event.cookies.get(LOCALE_COOKIE),
    acceptLanguage: event.request.headers.get("accept-language"),
  });
  const lang = event.locals.locale;
  // The page's language before any script runs (app.html has `lang="%lang%"`).
  return resolve(event, {
    transformPageChunk: ({ html }) => html.replace('lang="%lang%"', `lang="${lang}"`),
  });
};
