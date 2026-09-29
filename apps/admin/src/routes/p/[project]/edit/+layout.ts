import { error } from "@sveltejs/kit";
import type { SiteData } from "$lib/editor/state.svelte";
import { projectPaths } from "$lib/project-paths";
import type { LayoutLoad } from "./$types";

// contenteditable and the selection only exist in the browser.
export const ssr = false;
export const trailingSlash = "always";

export const load: LayoutLoad = async ({ fetch, params }) => {
  const response = await fetch(projectPaths(params.project).api);
  if (!response.ok) error(response.status, "Could not load the site.");
  return { site: (await response.json()) as SiteData };
};
