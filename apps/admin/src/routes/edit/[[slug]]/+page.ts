import { error } from "@sveltejs/kit";
import type { Document } from "svedit";
import { sitePages } from "$lib/editor/state.svelte";
import type { PageLoad } from "./$types";

export const load: PageLoad = async ({ parent, params }) => {
  const { site } = await parent();
  const pageIndex = sitePages(site.document as Document).findIndex(
    (page) => page.slug === (params.slug ?? ""),
  );
  if (pageIndex < 0) error(404, "There is no such page.");
  return { pageIndex };
};
