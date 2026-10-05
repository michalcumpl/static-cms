import { json } from "@sveltejs/kit";
import { usedMediaFiles } from "@webmio/model";
import { notFound, requireMember } from "$lib/server/access";
import { getDb } from "$lib/server/app";
import { siteFontNames } from "$lib/server/fonts";
import { readLanguages } from "$lib/server/site-documents";
import type { RequestHandler } from "./$types";

/**
 * What the in-browser ZIP download exports: the published languages' saved documents (shared
 * fields applied), `[{ lang, primary, document }]`, and the media and font files they use.
 */
export const GET: RequestHandler = (event) => {
  requireMember(event, event.params.project, { api: true });
  const sites = readLanguages(getDb(), event.params.project, "published");
  if (sites.length === 0) notFound(event);
  const mediaFiles = [...new Set(sites.flatMap((site) => usedMediaFiles(site.document)))].sort();
  return json({
    languages: sites.map(({ lang, primary, document }) => ({ lang, primary, document })),
    mediaFiles,
    fontFiles: siteFontNames(sites),
  });
};
