import { fail, redirect } from "@sveltejs/kit";
import { getDb } from "$lib/server/app";
import { consumeLoginToken, createSession, safeNext } from "$lib/server/auth";
import { setSessionCookie } from "$lib/server/session-cookie";
import type { Actions } from "./$types";

// Opening the link only shows a button: mail scanners open links on their own, and
// using the single-use token on GET would sign nobody in and waste the link.

export const actions: Actions = {
  default: async ({ params, url, cookies }) => {
    const db = getDb();
    const result = consumeLoginToken(db, params.token);
    if (!result.ok) return fail(400, { reason: result.reason });
    setSessionCookie(cookies, createSession(db, result.userId), url);
    redirect(303, safeNext(url.searchParams.get("next")));
  },
};
