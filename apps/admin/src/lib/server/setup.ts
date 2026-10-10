import type { HoursInput, Weekday } from "@webmio/model";
import {
  type MediaSizes,
  SETUP_TYPES,
  SETUP_WEEKDAYS,
  type SetupAnswers,
  type SetupPhoto,
  STANDARD,
  siteFromSetup,
  TEMPLATES,
  templateById,
} from "@webmio/templates";
import { and, eq, inArray, isNull } from "drizzle-orm";
import { type Locale, type Said, said } from "$lib/i18n";
import type { Db } from "./db/index";
import { projectSetups, projects } from "./db/schema";
import { starterSite } from "./demo";
import { mediaItem } from "./media";
import { createProject, readSite, type SaveResult, saveSite } from "./site-documents";

// The guided setup (guided-setup spec): the answers kept with the project step by step, checked as
// the control panel checks them, and the site built from them when the owner finishes.

/** The setup's steps: the business, design, contact, services, photos, pages, preview. */
export const SETUP_STEPS = 7;
/** Services and photos the setup takes, at most. */
export const MAX_SETUP_ITEMS = 12;

/** What a step's form gave, by field; a message per field that is wrong. */
export type StepErrors = Record<string, Said>;
export type StepResult = { ok: true } | { ok: false; errors: StepErrors };

export interface Setup {
  answers: SetupAnswers;
  /** The next step to show. */
  step: number;
  finished: boolean;
}

const PHONE = /^\+[1-9][0-9]{6,14}$/;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const TIME = /^([01]\d|2[0-3]):[0-5]\d$/;

/** A phone as stored: no spaces or dashes, `+420` before a Czech number without a country code. */
export function setupPhone(input: string, lang: string): string {
  const compact = input.replace(/[\s().-]/g, "");
  if (lang === "cs" && /^\d{9}$/.test(compact)) return `+420${compact}`;
  return compact.replace(/^00/, "+");
}

/** A project's setup, or undefined for projects made another way. */
export function readSetup(db: Db, projectId: string): Setup | undefined {
  const row = db.select().from(projectSetups).where(eq(projectSetups.projectId, projectId)).get();
  return row
    ? { answers: row.answers, step: row.step, finished: row.finishedAt !== null }
    : undefined;
}

/** The unfinished setups among projects: each one's next step, by project ID. */
export function unfinishedSetups(db: Db, projectIds: readonly string[]): Record<string, number> {
  if (projectIds.length === 0) return {};
  const rows = db
    .select()
    .from(projectSetups)
    .where(and(inArray(projectSetups.projectId, [...projectIds]), isNull(projectSetups.finishedAt)))
    .all();
  return Object.fromEntries(rows.map((row) => [row.projectId, row.step]));
}

/** Whether a project's setup is still open: the Overview and the projects page lead to it. */
export function setupUnfinished(db: Db, projectId: string): boolean {
  const setup = readSetup(db, projectId);
  return setup !== undefined && !setup.finished;
}

/** Step 1: the business's type, name and sentence make the project, holding the starter site. */
export function createSetup(
  db: Db,
  start: {
    workspaceId: string;
    userId: string;
    locale: Locale;
    type: string;
    name: string;
    sentence: string;
  },
): { ok: true; projectId: string } | { ok: false; errors: StepErrors } {
  const errors: StepErrors = {};
  const name = start.name.trim();
  if (!SETUP_TYPES.some((t) => t.id === start.type)) errors.type = said("setup.errors.type");
  if (!name) errors.name = said("setup.errors.name");
  if (Object.keys(errors).length > 0) return { ok: false, errors };
  const starter = starterSite(name) as {
    document_id: string;
    nodes: Record<string, { lang?: string }>;
  };
  const siteNode = starter.nodes[starter.document_id];
  if (siteNode) siteNode.lang = start.locale;
  const projectId = createProject(db, start.workspaceId, name, starter, start.userId, start.locale);
  const sentence = start.sentence.trim();
  db.insert(projectSetups)
    .values({
      projectId,
      answers: { type: start.type, name, ...(sentence ? { sentence } : {}) },
      step: 2,
      updatedAt: new Date(),
    })
    .run();
  return { ok: true, projectId };
}

/** What a step answers, as its form gives it (the routes read the forms). */
export type StepInput =
  | { step: 1; type: string; name: string; sentence: string }
  | { step: 2; template: string }
  | {
      step: 3;
      phone: string;
      email: string;
      street: string;
      postal_code: string;
      city: string;
      /** By weekday: `[opens, closes]` per range, `""` for a day left empty. */
      hours: Partial<Record<Weekday, [string, string][]>>;
    }
  | { step: 4; services: { name: string; description: string; price: string }[] }
  | { step: 5; logo?: SetupPhoto; photos: SetupPhoto[] }
  | { step: 6; pages: string[] };

/** A step's answers checked and turned into what the setup keeps. */
function checked(input: StepInput, lang: string): StepResult & { answers?: Partial<SetupAnswers> } {
  const errors: StepErrors = {};
  const filled = (value: string) => value.trim() !== "";
  switch (input.step) {
    case 1: {
      if (!SETUP_TYPES.some((t) => t.id === input.type)) errors.type = said("setup.errors.type");
      if (!filled(input.name)) errors.name = said("setup.errors.name");
      const sentence = input.sentence.trim();
      return Object.keys(errors).length > 0
        ? { ok: false, errors }
        : { ok: true, answers: { type: input.type, name: input.name.trim(), sentence } };
    }
    case 2: {
      if (!templateById(input.template)) errors.template = said("setup.errors.template");
      return Object.keys(errors).length > 0
        ? { ok: false, errors }
        : { ok: true, answers: { template: input.template } };
    }
    case 3: {
      const phone = filled(input.phone) ? setupPhone(input.phone, lang) : "";
      if (phone && !PHONE.test(phone)) errors.phone = said("setup.errors.phone");
      const email = input.email.trim();
      if (email && !EMAIL.test(email)) errors.email = said("setup.errors.email");
      const hours: HoursInput = {};
      for (const day of SETUP_WEEKDAYS) {
        const ranges = (input.hours[day] ?? []).filter(
          ([opens, closes]) => filled(opens) || filled(closes),
        );
        for (const [opens, closes] of ranges) {
          if (!TIME.test(opens) || !TIME.test(closes))
            errors[`hours.${day}`] = said("setup.errors.time");
          else if (closes <= opens) errors[`hours.${day}`] = said("setup.errors.closing");
        }
        if (ranges.length > 0) hours[day] = ranges;
      }
      if (Object.keys(errors).length > 0) return { ok: false, errors };
      return {
        ok: true,
        answers: {
          contact: {
            phone,
            email,
            street: input.street.trim(),
            postal_code: input.postal_code.trim(),
            city: input.city.trim(),
            hours,
          },
        },
      };
    }
    case 4: {
      const services = input.services
        .map((s) => ({
          name: s.name.trim(),
          description: s.description.trim(),
          price: s.price.trim(),
        }))
        .filter((s) => s.name || s.description || s.price);
      services.forEach((s, i) => {
        if (!s.name) errors[`services.${i}.name`] = said("setup.errors.serviceName");
      });
      if (services.length > MAX_SETUP_ITEMS) errors.services = said("setup.errors.tooMany");
      if (Object.keys(errors).length > 0) return { ok: false, errors };
      return {
        ok: true,
        answers: {
          services: services.map((s) => ({
            name: s.name,
            ...(s.description ? { description: s.description } : {}),
            ...(s.price ? { price: s.price } : {}),
          })),
        },
      };
    }
    case 5: {
      if (input.photos.length > MAX_SETUP_ITEMS) errors.photos = said("setup.errors.tooMany");
      if (Object.keys(errors).length > 0) return { ok: false, errors };
      const clean = (p: SetupPhoto) => ({
        key: p.key,
        alt: p.decorative ? "" : p.alt.trim(),
        ...(p.decorative ? { decorative: true } : {}),
      });
      return {
        ok: true,
        answers: {
          logo: input.logo ? clean(input.logo) : undefined,
          photos: input.photos.map(clean),
        },
      };
    }
    case 6: {
      const known = new Set(TEMPLATES.flatMap((t) => t.layouts.map((l) => l.id)));
      if (input.pages.some((p) => !known.has(p))) errors.pages = said("setup.errors.pages");
      if (Object.keys(errors).length > 0) return { ok: false, errors };
      return { ok: true, answers: { pages: ["home", ...input.pages.filter((p) => p !== "home")] } };
    }
  }
}

/**
 * Saves a step's answers (spec, "Resuming a setup"), or says what is wrong; the next step to show
 * moves on past it. A finished setup takes nothing more.
 */
export function saveStep(db: Db, projectId: string, input: StepInput, lang: string): StepResult {
  const setup = readSetup(db, projectId);
  if (!setup || setup.finished)
    return { ok: false, errors: { step: said("setup.errors.finished") } };
  const result = checked(input, lang);
  if (!result.ok) return result;
  // The business's name is the project's too.
  if (result.answers?.name) {
    db.update(projects).set({ name: result.answers.name }).where(eq(projects.id, projectId)).run();
  }
  db.update(projectSetups)
    .set({
      answers: { ...setup.answers, ...result.answers },
      step: Math.max(setup.step, Math.min(input.step + 1, SETUP_STEPS)),
      updatedAt: new Date(),
    })
    .where(eq(projectSetups.projectId, projectId))
    .run();
  return { ok: true };
}

/** The site a setup's answers make, with the sizes of the photos they name. */
export function setupSite(db: Db, projectId: string, setup: Setup, lang: string) {
  const template = templateById(setup.answers.template ?? STANDARD.id) ?? STANDARD;
  const sizes: MediaSizes = new Map(
    [setup.answers.logo, ...(setup.answers.photos ?? [])].flatMap((photo) => {
      const item = photo ? mediaItem(db, projectId, photo.key) : undefined;
      return item ? [[item.key, { width: item.width, height: item.height }] as const] : [];
    }),
  );
  return siteFromSetup(setup.answers, template, lang, sizes);
}

/**
 * Finishing (spec, "Preview and finishing"): the site built from the answers saved as one new
 * version over what the project holds, and the setup closed.
 */
export function finishSetup(
  db: Db,
  projectId: string,
  userId: string,
): SaveResult | { ok: false; reason: "finished" } {
  const setup = readSetup(db, projectId);
  const current = readSite(db, projectId);
  if (!setup || setup.finished || !current) return { ok: false, reason: "finished" };
  const lang = String(
    (current.document as { document_id: string; nodes: Record<string, { lang?: string }> }).nodes[
      (current.document as { document_id: string }).document_id
    ]?.lang ?? "cs",
  );
  const result = saveSite(
    db,
    projectId,
    userId,
    setupSite(db, projectId, setup, lang),
    current.version,
  );
  if (result.ok) {
    db.update(projectSetups)
      .set({ finishedAt: new Date(), updatedAt: new Date() })
      .where(eq(projectSetups.projectId, projectId))
      .run();
  }
  return result;
}
