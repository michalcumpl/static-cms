import { error, fail, redirect } from "@sveltejs/kit";
import { SETUP_TYPES, STANDARD, setupType, TEMPLATES, templateById } from "@webmio/templates";
import { sayIn } from "$lib/i18n";
import { projectPaths } from "$lib/project-paths";
import { notFound, requireMember } from "$lib/server/access";
import { getDb } from "$lib/server/app";
import { mediaItem } from "$lib/server/media";
import { finishSetup, readSetup, SETUP_STEPS, saveStep } from "$lib/server/setup";
import { PHONE_COUNTRIES, stepInput } from "$lib/server/setup-forms";
import { primaryLanguage, versionCount } from "$lib/server/site-documents";
import type { Actions, PageServerLoad } from "./$types";

// The guided setup's steps 1 to 7 once the project exists (guided-setup design decision 4): one
// form each, owners only; a step not reached yet leads to the one reached, a finished setup to
// the Overview.

const stepOf = (value: string, locals: App.Locals) => {
  const step = Number(value);
  if (!Number.isInteger(step) || step < 1 || step > SETUP_STEPS) notFound({ locals });
  return step;
};

export const load: PageServerLoad = async (event) => {
  const { project, role } = await event.parent();
  if (role !== "owner") error(403, "Only the workspace's owners can set up its websites.");
  const step = stepOf(event.params.step, event.locals);
  const db = getDb();
  const setup = readSetup(db, project.id);
  if (!setup || setup.finished) redirect(303, projectPaths(project.id).dashboard);
  if (step > setup.step) redirect(303, `/p/${project.id}/setup/${setup.step}`);
  const lang = primaryLanguage(db, project.id) ?? "cs";
  const pick = (text: { cs: string; en: string }) => (lang === "cs" ? text.cs : text.en);
  const type = setupType(setup.answers.type);
  const typeName = type.name.en.toLowerCase();
  return {
    step,
    total: SETUP_STEPS,
    answers: setup.answers,
    back: step > 1 ? `/p/${project.id}/setup/${step - 1}` : undefined,
    // The preview step: the answers' site, and whether finishing replaces the owner's edits.
    preview: `/p/${project.id}/setup/preview/`,
    edited: step === SETUP_STEPS && versionCount(db, project.id) > 1,
    types: SETUP_TYPES.map((t) => ({ id: t.id, name: pick(t.name) })),
    // The contact step: the type's typical hours until the owner gives theirs, and phone prefixes.
    typicalHours: type.hours,
    phoneCountries: PHONE_COUNTRIES,
    // The design step: the templates suiting the type first (spec, "Design step").
    templates: [...TEMPLATES]
      .sort(
        (a, b) =>
          Number(b.trades.some((t) => t.en === typeName)) -
          Number(a.trades.some((t) => t.en === typeName)),
      )
      .map((t, i) => ({
        id: t.id,
        name: pick(t.name),
        description: pick(t.description),
        suggested: i === 0,
      })),
    // The pages step: the template's layouts, the type's ticked (spec, "Pages step").
    layouts: (templateById(setup.answers.template ?? STANDARD.id) ?? STANDARD).layouts.map((l) => ({
      id: l.id,
      name: pick(l.name),
      suggested: type.pages.includes(l.id),
    })),
    // The photos step: each photo's width, for its thumbnail.
    widths: Object.fromEntries(
      [setup.answers.logo, ...(setup.answers.photos ?? [])].flatMap((photo) => {
        const item = photo ? mediaItem(db, project.id, photo.key) : undefined;
        return item ? [[item.key, item.width]] : [];
      }),
    ),
  };
};

export const actions: Actions = {
  default: async (event) => {
    const { project, role, user } = requireMember(event, event.params.project);
    if (role !== "owner") error(403, "Only the workspace's owners can set up its websites.");
    const step = stepOf(event.params.step, event.locals);
    const db = getDb();
    if (step === SETUP_STEPS) {
      const finished = finishSetup(db, project.id, user.id);
      if (!finished.ok) redirect(303, projectPaths(project.id).dashboard);
      redirect(303, projectPaths(project.id).dashboard);
    }
    const input = stepInput(step, await event.request.formData());
    if (!input) notFound({ locals: event.locals });
    const saved = saveStep(db, project.id, input, primaryLanguage(db, project.id) ?? "cs");
    if (!saved.ok) {
      const errors = Object.fromEntries(
        Object.entries(saved.errors).map(([field, message]) => [
          field,
          sayIn(event.locals.locale, message),
        ]),
      );
      return fail(400, { values: input, errors });
    }
    redirect(303, `/p/${project.id}/setup/${step + 1}`);
  },
};
