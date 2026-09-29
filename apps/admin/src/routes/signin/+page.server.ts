import { fail, redirect } from "@sveltejs/kit";
import { getDb, getMailer, getSignInLimiter } from "$lib/server/app";
import { requestSignIn, safeNext } from "$lib/server/auth";
import type { Actions, PageServerLoad } from "./$types";

export const load: PageServerLoad = ({ locals, url }) => {
  if (locals.user) redirect(303, safeNext(url.searchParams.get("next")));
  return {};
};

export const actions: Actions = {
  default: async ({ request, url, getClientAddress }) => {
    const email = String((await request.formData()).get("email") ?? "").trim();
    if (!email.includes("@")) return fail(400, { email, invalid: true });
    const result = await requestSignIn(getDb(), getMailer(), getSignInLimiter(), {
      email,
      clientAddress: getClientAddress(),
      origin: url.origin,
      next: url.searchParams.get("next"),
    });
    if (result === "rate-limited") return fail(429, { email, rateLimited: true });
    return { email, sent: true };
  },
};
