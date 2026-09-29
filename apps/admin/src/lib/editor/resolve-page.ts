import { error } from "@sveltejs/kit";
import type { Document } from "svedit";
import { projectPaths } from "../project-paths";
import { activeEditor, sitePages } from "./state.svelte";

/**
 * The page an editor URL shows: the given page, or home when none is given. Checked against the
 * open editor's document when there is one, so pages added since loading (unsaved) are found.
 * Throws a 404 for a page that isn't in the site.
 */
export function resolvePage(project: string, pageId: string | undefined, loaded: Document): string {
  const editor = activeEditor(project);
  const pages = editor ? editor.pages : sitePages(loaded, projectPaths(project));
  const homeId = editor ? editor.homeId : pages.find((page) => page.isHome)?.id;
  const id = pageId ?? homeId;
  if (id === undefined || !pages.some((page) => page.id === id)) {
    error(404, "There is no such page.");
  }
  return id;
}
