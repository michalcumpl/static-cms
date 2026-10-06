import { i18n } from "$lib/i18n";
import { projectPaths } from "$lib/project-paths";
import { notFound, requireMember } from "$lib/server/access";
import { getDb } from "$lib/server/app";
import { servePreview } from "$lib/server/preview";
import { primaryLanguage } from "$lib/server/site-documents";
import { readVersion } from "$lib/server/versions";
import type { RequestHandler } from "./$types";

// Rendered links end in a slash; don't redirect them away.
export const trailingSlash = "ignore";

/**
 * A read-only preview of one saved version of a language (version-history design.md decision 2),
 * with a banner saying which version it is and a link back to the history.
 */
export const GET: RequestHandler = async (event) => {
  const { params } = event;
  requireMember(event, params.project);
  const version = readVersion(getDb(), params.project, params.version);
  if (!version) notFound(event);
  const primary = primaryLanguage(getDb(), params.project);
  const paths = projectPaths(params.project, version.lang === primary ? undefined : version.lang);
  const { t, formatDate } = i18n(event.locals.locale);
  const date = formatDate(version.savedAt, "datetime", "Europe/Prague");
  const banner = `<p class="version-banner" style="margin:0;padding:0.5rem 1rem;background:#fff1dc;color:#3d2b00;font:0.9rem system-ui,sans-serif">${escapeHtml(t("history.banner", { date }))} · <a href="${paths.versionsPage}" style="color:inherit">${escapeHtml(t("history.backToHistory"))}</a></p>`;
  return servePreview(
    params.project,
    [{ lang: version.lang, document: version.document, primary: true }],
    {
      basePath: paths.version(params.version),
      path: params.path,
      editHref: paths.versionsPage,
      banner,
    },
  );
};

const ESCAPES: Record<string, string> = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" };
const escapeHtml = (text: string) => text.replace(/[&<>"]/g, (c) => ESCAPES[c] ?? c);
