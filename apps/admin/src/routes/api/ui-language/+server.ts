import { error, json } from "@sveltejs/kit";
import { isLocale } from "$lib/i18n";
import { getDb } from "$lib/server/app";
import { LOCALE_COOKIE, setUserLocale } from "$lib/server/locale";
import type { RequestHandler } from "./$types";

/**
 * Chooses the interface language: remembered on this device, and on the account when signed in
 * (admin-interface spec, "Interface language"). Answers `{ language }`.
 */
export const POST: RequestHandler = async ({ request, cookies, locals }) => {
  const body = (await request.json().catch(() => ({}))) as { language?: unknown };
  if (!isLocale(body.language)) error(400, "Unknown language.");
  cookies.set(LOCALE_COOKIE, body.language, {
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
    sameSite: "lax",
    httpOnly: false,
  });
  if (locals.user) setUserLocale(getDb(), locals.user.id, body.language);
  return json({ language: body.language });
};
