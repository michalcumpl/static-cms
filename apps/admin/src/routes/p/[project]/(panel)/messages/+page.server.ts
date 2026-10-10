import { fail } from "@sveltejs/kit";
import { requireMember } from "$lib/server/access";
import { getDb } from "$lib/server/app";
import {
  deleteMessage,
  listMessages,
  messageFilter,
  messageForms,
  setHandled,
} from "$lib/server/messages";
import type { Actions, PageServerLoad } from "./$types";

/**
 * The project's contact form messages (contact-form spec, "Messages section"), newest first,
 * filtered by form and by unhandled. The membership check is the parent layout's.
 */
export const load: PageServerLoad = async ({ params, url, parent }) => {
  await parent();
  const filter = messageFilter(url);
  return {
    filter: { form: filter.form ?? "", unhandled: filter.unhandled === true },
    forms: messageForms(getDb(), params.project),
    messages: listMessages(getDb(), params.project, filter).map((m) => ({
      id: m.id,
      kind: m.kind,
      heading: m.heading,
      page: m.page,
      name: m.name,
      email: m.email,
      phone: m.phone,
      when: m.when,
      message: m.message,
      delivered: m.delivered,
      handled: m.handledAt !== null,
      createdAt: m.createdAt.toISOString(),
    })),
  };
};

/** The message an action is about, from the posted form's `id`. */
async function messageId(request: Request): Promise<string> {
  return String((await request.formData()).get("id") ?? "");
}

export const actions: Actions = {
  /** Marks a message handled. */
  handled: async (event) => {
    requireMember(event, event.params.project);
    const id = await messageId(event.request);
    if (!setHandled(getDb(), event.params.project, id, true)) return fail(404);
  },
  /** Marks a handled message not handled again. */
  unhandled: async (event) => {
    requireMember(event, event.params.project);
    const id = await messageId(event.request);
    if (!setHandled(getDb(), event.params.project, id, false)) return fail(404);
  },
  delete: async (event) => {
    requireMember(event, event.params.project);
    const id = await messageId(event.request);
    if (!deleteMessage(getDb(), event.params.project, id)) return fail(404);
  },
};
