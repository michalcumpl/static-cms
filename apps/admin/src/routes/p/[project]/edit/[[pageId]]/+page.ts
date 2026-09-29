import type { Document } from "svedit";
import { resolvePage } from "$lib/editor/resolve-page";
import type { PageLoad } from "./$types";

export const load: PageLoad = async ({ parent, params }) => {
  const { site } = await parent();
  return { pageId: resolvePage(params.project, params.pageId, site.document as Document) };
};
