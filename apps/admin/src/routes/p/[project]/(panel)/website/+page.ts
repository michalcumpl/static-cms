import { loadSection } from "$lib/editor/section-load";
import { projectPaths } from "$lib/project-paths";
import type { PageLoad } from "./$types";

/**
 * The site settings' document; the address and domain for the Domain link's summary and, with the
 * free address and whether its hosting is reachable, for the Delete website confirmation.
 */
export const load: PageLoad = async ({ fetch, params, parent, url }) => {
  const { lang, primaryLang } = await parent();
  const [section, publishing] = await Promise.all([
    loadSection({ fetch, projectId: params.project, lang, primaryLang, url }),
    fetch(projectPaths(params.project).publishes).then((r) => (r.ok ? r.json() : null)),
  ]);
  return {
    ...section,
    domain: (publishing?.domain as string | null) ?? null,
    address: (publishing?.address as string | null) ?? null,
    defaultUrl: (publishing?.defaultUrl as string | null) ?? null,
    canPublish: Boolean(publishing?.canPublish),
    onNetlify: publishing?.provider === "netlify",
  };
};
