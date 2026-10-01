import { error } from "@sveltejs/kit";
import { projectPaths } from "$lib/project-paths";
import { requireMember } from "$lib/server/access";
import { getDb } from "$lib/server/app";
import { servePreview } from "$lib/server/preview";
import { primaryLanguage } from "$lib/server/site-documents";
import { readVersion } from "$lib/server/versions";
import type { RequestHandler } from "./$types";

// Rendered links end in a slash; don't redirect them away.
export const trailingSlash = "ignore";

const savedAt = new Intl.DateTimeFormat("en-GB", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "Europe/Prague",
});

/**
 * A read-only preview of one saved version of a language (version-history design.md decision 2),
 * with a banner saying which version it is and a link back to the history.
 */
export const GET: RequestHandler = async (event) => {
  const { params } = event;
  requireMember(event, params.project);
  const version = readVersion(getDb(), params.project, params.version);
  if (!version) error(404, "Not found");
  const primary = primaryLanguage(getDb(), params.project);
  const paths = projectPaths(params.project, version.lang === primary ? undefined : version.lang);
  const banner = `<p class="version-banner" style="margin:0;padding:0.5rem 1rem;background:#fff1d6;color:#3d2b00;font:0.9rem system-ui,sans-serif">Version of ${savedAt.format(version.savedAt)} · read-only · <a href="${paths.history}" style="color:inherit">Back to history</a></p>`;
  return servePreview(
    params.project,
    [{ lang: version.lang, document: version.document, primary: true }],
    {
      basePath: paths.version(params.version),
      path: params.path,
      editHref: paths.history,
      banner,
    },
  );
};
