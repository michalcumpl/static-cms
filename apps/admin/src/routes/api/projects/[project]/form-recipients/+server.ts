import { json } from "@sveltejs/kit";
import { requireMember } from "$lib/server/access";
import { getDb } from "$lib/server/app";
import { recipientStates } from "$lib/server/contact-forms";
import type { RequestHandler } from "./$types";

/**
 * The addresses the project's contact forms have named, and whether each confirmed
 * (contact-form spec, "Recipient address"), for the editor's Contact form panel.
 */
export const GET: RequestHandler = (event) => {
  requireMember(event, event.params.project, { api: true });
  return json(recipientStates(getDb(), event.params.project));
};
