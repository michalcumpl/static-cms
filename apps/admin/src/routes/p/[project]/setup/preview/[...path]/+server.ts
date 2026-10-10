import { notFound, requireMember } from "$lib/server/access";
import { getDb } from "$lib/server/app";
import { servePreview } from "$lib/server/preview";
import { readSetup, setupSite } from "$lib/server/setup";
import { primaryLanguage } from "$lib/server/site-documents";
import type { RequestHandler } from "./$types";

// Rendered links end in a slash (`…/preview/kontakt/`); don't redirect them away.
export const trailingSlash = "ignore";

/**
 * The site a guided setup's answers make, served as it would be published, without saving it
 * (guided-setup spec, "Preview and finishing").
 */
export const GET: RequestHandler = async (event) => {
  const { params } = event;
  requireMember(event, params.project);
  const db = getDb();
  const setup = readSetup(db, params.project);
  if (!setup || setup.finished) notFound(event);
  const lang = primaryLanguage(db, params.project) ?? "cs";
  return servePreview(
    params.project,
    [{ lang, document: setupSite(db, params.project, setup, lang), primary: true }],
    {
      basePath: `/p/${params.project}/setup/preview/`,
      path: params.path,
      editHref: `/p/${params.project}/setup/6`,
    },
  );
};
