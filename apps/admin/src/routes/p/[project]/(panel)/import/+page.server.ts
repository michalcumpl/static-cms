import { fail, redirect } from "@sveltejs/kit";
import { languageName } from "@webmio/render";
import { said, sayIn } from "$lib/i18n";
import { groupProblems, problemHref } from "$lib/panel/problems";
import { projectPaths } from "$lib/project-paths";
import { notFound, requireMember } from "$lib/server/access";
import { getDb } from "$lib/server/app";
import { fixHeadingLevels, headingLevelFixes } from "$lib/server/heading-levels";
import {
  markImportedImagesDecorative,
  undescribedImportedByLanguage,
} from "$lib/server/import/decorative";
import { dismissReview, projectImport } from "$lib/server/import/job";
import { projectRetry, retryOffers, startRetry } from "$lib/server/import/retry";
import { testHosts } from "$lib/server/import/test-hosts";
import {
  primaryLanguage,
  projectLanguages,
  readLanguages,
  readSite,
} from "$lib/server/site-documents";
import type { Actions, PageServerLoad } from "./$types";

/**
 * The review of the import that made the project (site-import spec, "Import review"): what was
 * imported and left out, and the saved site's problems, each with where it is fixed.
 */
export const load: PageServerLoad = async ({ params, locals, parent }) => {
  await parent();
  const row = projectImport(getDb(), params.project);
  const site = readSite(getDb(), params.project);
  if (!row?.report || !site) notFound({ locals });
  const retry = projectRetry(getDb(), params.project);
  // Other languages to import: those the old site has and the project doesn't (import-languages).
  const has = new Set(projectLanguages(getDb(), params.project).map((l) => l.lang));
  const languages = row.reviewDismissed
    ? []
    : (row.retryState?.languages ?? [])
        .filter((l) => !has.has(l.lang))
        .map((l) => ({ ...l, name: languageName(l.lang) }));
  const primary = primaryLanguage(getDb(), params.project) ?? "";
  const languageSites = readLanguages(getDb(), params.project, "all");
  const several = languageSites.length > 1;
  const named = new Set([
    primary,
    ...row.report.pages.flatMap((p) => p.lang ?? []),
    ...row.report.leftOut.flatMap((l) => l.lang ?? []),
  ]);
  return {
    report: row.report,
    primaryLang: primary,
    /** Each language the report names, by its own name (English, Deutsch). */
    languageNames: Object.fromEntries([...named].map((lang) => [lang, languageName(lang)])),
    dismissed: row.reviewDismissed,
    // What a retry can do (import-review-actions spec, "Retrying what was left out").
    offers: {
      ...(row.reviewDismissed ? { again: false, next: 0 } : retryOffers(row.retryState)),
      languages,
    },
    retry: retry
      ? {
          kind: retry.kind,
          lang: retry.lang,
          state: retry.state,
          progress: retry.progress,
          error: retry.error,
          added: retry.added,
        }
      : null,
    decorative: undescribedImportedByLanguage(getDb(), params.project).reduce(
      (count, l) => count + l.ids.length,
      0,
    ),
    headingLevels: headingLevelFixes(getDb(), params.project),
    // The same problem on many pages is one item (import-review-actions), each language's on
    // their own, leading into that language (import-languages design decision 7).
    problems: languageSites.flatMap((language) => {
      const lang = language.primary ? undefined : language.lang;
      const where = projectPaths(params.project, lang);
      // biome-ignore lint/suspicious/noExplicitAny: the saved document, read to locate problems.
      const document = language.document as any;
      const name = several ? languageName(language.lang) : undefined;
      return groupProblems(
        where,
        document,
        language.problems.map((problem) => ({
          ...problem,
          message: name ? `${name}: ${problem.message}` : problem.message,
          href: problemHref(where, document, problem),
        })),
      ).map((group) => (name ? { ...group, language: name } : group));
    }),
  };
};

export const actions: Actions = {
  /** The owner has seen the review: the Overview stops linking to it. */
  dismiss: (event) => {
    requireMember(event, event.params.project);
    dismissReview(getDb(), event.params.project);
    redirect(303, projectPaths(event.params.project).dashboard);
  },
  /** Starts a retry: `kind` "again" or "next". */
  retry: async (event) => {
    const { user } = requireMember(event, event.params.project);
    const form = await event.request.formData();
    const kind = form.get("kind") === "next" ? "next" : "again";
    const started = startRetry(getDb(), event.params.project, user.id, kind, {
      locale: event.locals.locale,
      allowHosts: testHosts(),
    });
    if (!started.ok) return fail(409, { message: sayIn(event.locals.locale, started.message) });
    return { started: true };
  },
  /** Starts importing another language version of the old site: `lang`. */
  importLanguage: async (event) => {
    const { user } = requireMember(event, event.params.project);
    const form = await event.request.formData();
    const lang = String(form.get("lang") ?? "");
    const started = startRetry(
      getDb(),
      event.params.project,
      user.id,
      "language",
      { locale: event.locals.locale, allowHosts: testHosts() },
      lang,
    );
    if (!started.ok) return fail(409, { message: sayIn(event.locals.locale, started.message) });
    return { started: true };
  },
  /** Marks the imported images without a description decorative. */
  decorative: (event) => {
    const { user } = requireMember(event, event.params.project);
    const result = markImportedImagesDecorative(getDb(), event.params.project, user.id);
    if (!result.ok && result.reason === "conflict") {
      return fail(409, {
        message: sayIn(event.locals.locale, said("server.import.savedMeanwhile")),
      });
    }
    return { marked: result.ok };
  },
  /** Makes each page's first smaller subheading before any main one a main subheading. */
  headings: (event) => {
    const { user } = requireMember(event, event.params.project);
    const result = fixHeadingLevels(getDb(), event.params.project, user.id);
    if (!result.ok && result.reason === "conflict") {
      return fail(409, {
        message: sayIn(event.locals.locale, said("server.import.savedMeanwhile")),
      });
    }
    return { fixed: result.ok };
  },
};
