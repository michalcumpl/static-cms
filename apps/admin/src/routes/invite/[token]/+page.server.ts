import { fail, redirect } from "@sveltejs/kit";
import { getDb } from "$lib/server/app";
import { createSession } from "$lib/server/auth";
import { acceptInvitation } from "$lib/server/invitations";
import { setSessionCookie } from "$lib/server/session-cookie";
import type { Actions } from "./$types";

// Like sign-in links: opening the link only shows a button, so mail scanners that open
// links on their own don't use up the invitation.

export const actions: Actions = {
  default: async ({ params, url, cookies }) => {
    const db = getDb();
    const result = acceptInvitation(db, params.token);
    if (!result.ok) return fail(400, { reason: result.reason });
    setSessionCookie(cookies, createSession(db, result.userId), url);
    redirect(303, "/");
  },
};
