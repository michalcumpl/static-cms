import { redirect } from "@sveltejs/kit";
import { getDb } from "$lib/server/app";
import { deleteSession } from "$lib/server/auth";
import { clearSessionCookie, SESSION_COOKIE } from "$lib/server/session-cookie";
import type { RequestHandler } from "./$types";

export const POST: RequestHandler = ({ cookies }) => {
  const token = cookies.get(SESSION_COOKIE);
  if (token) deleteSession(getDb(), token);
  clearSessionCookie(cookies);
  redirect(303, "/signin");
};
