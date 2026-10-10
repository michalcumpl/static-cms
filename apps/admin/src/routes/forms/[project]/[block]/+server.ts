import { error, redirect } from "@sveltejs/kit";
import { getDb, getMailer } from "$lib/server/app";
import { formPost, receiveMessage } from "$lib/server/contact-forms";
import type { RequestHandler } from "./$types";

/**
 * A website's contact form posts here (contact-form spec, "Form endpoint"): no sign-in, from
 * any origin (`hooks.server.ts` lets `/forms/` through). The visitor goes back to the page with
 * the confirmation or the reason; a form that doesn't exist gets 404.
 */
export const POST: RequestHandler = async (event) => {
  let form: FormData;
  try {
    form = await event.request.formData();
  } catch {
    error(400, "Expected a form.");
  }
  const received = await receiveMessage(getDb(), getMailer(), {
    projectId: event.params.project,
    blockId: event.params.block,
    post: formPost(form),
    origin: event.request.headers.get("origin"),
    clientAddress: event.getClientAddress(),
    adminOrigin: event.url.origin,
  });
  if (received.outcome === "missing" || !received.location) error(404, "No such form.");
  redirect(303, received.location);
};
