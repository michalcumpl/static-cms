import { fail, redirect } from "@sveltejs/kit";
import { SETUP_TYPES } from "@webmio/templates";
import { sayIn } from "$lib/i18n";
import { requireOwner } from "$lib/server/access";
import { getDb } from "$lib/server/app";
import { createSetup, SETUP_STEPS } from "$lib/server/setup";
import type { Actions, PageServerLoad } from "./$types";

// The guided setup's first step, before the project exists (guided-setup spec, "Setup steps"):
// the business's type, name and sentence make the project.

export const load: PageServerLoad = (event) => {
  requireOwner(event, event.params.workspace);
  const lang = event.locals.locale;
  return {
    total: SETUP_STEPS,
    types: SETUP_TYPES.map((t) => ({ id: t.id, name: lang === "cs" ? t.name.cs : t.name.en })),
  };
};

export const actions: Actions = {
  default: async (event) => {
    const user = requireOwner(event, event.params.workspace);
    const form = await event.request.formData();
    const values = {
      type: String(form.get("type") ?? ""),
      name: String(form.get("name") ?? ""),
      sentence: String(form.get("sentence") ?? ""),
    };
    const created = createSetup(getDb(), {
      workspaceId: event.params.workspace,
      userId: user.id,
      locale: event.locals.locale,
      ...values,
    });
    if (!created.ok) {
      const errors = Object.fromEntries(
        Object.entries(created.errors).map(([field, message]) => [
          field,
          sayIn(event.locals.locale, message),
        ]),
      );
      return fail(400, { values, errors });
    }
    redirect(303, `/p/${created.projectId}/setup/2`);
  },
};
