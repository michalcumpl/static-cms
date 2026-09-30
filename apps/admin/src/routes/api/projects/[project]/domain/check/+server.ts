import { json } from "@sveltejs/kit";
import { requireMember } from "$lib/server/access";
import { getDb } from "$lib/server/app";
import { checkDomain } from "$lib/server/publishing/domains";
import { PublishError } from "$lib/server/publishing/target";
import type { RequestHandler } from "./$types";

/** Checks the domain's DNS and certificate now: `{ state }` (null without a domain). */
export const POST: RequestHandler = async (event) => {
  requireMember(event, event.params.project, { api: true });
  try {
    return json({ state: (await checkDomain(getDb(), event.params.project)) ?? null });
  } catch (err) {
    if (err instanceof PublishError) return json({ message: err.message }, { status: 502 });
    throw err;
  }
};
