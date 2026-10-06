import { redirect } from "@sveltejs/kit";

// The project's former tab addresses lead to their places in the panel (project-page spec, "Old
// addresses"), permanently, keeping the query.

/** Where an old tab address goes, with the query kept; `undefined` for anything else. */
export function newAddress(projectId: string, oldPath: string, search: URLSearchParams): string {
  const base = `/p/${projectId}/`;
  const query = search.toString() ? `?${search}` : "";
  const [tab, ...rest] = oldPath.split("/").filter(Boolean);
  switch (tab) {
    case "settings": {
      const focus = search.get("focus") ?? "";
      return `${base}${focus.startsWith("site-settings-") ? "website" : "business"}${query}`;
    }
    case "pages":
      return `${base}website/pages${query}`;
    case "languages":
      return `${base}website/languages${query}`;
    case "publishing":
      return `${base}publish${query}`;
    case "history":
      return `${base}publish/versions${rest.length ? `/${rest.join("/")}/` : ""}${query}`;
    default:
      return base;
  }
}

/** Redirects an old tab address (`event.url`) permanently. */
export function redirectOld(url: URL, projectId: string): never {
  const old = url.pathname.slice(`/p/${projectId}`.length);
  redirect(308, newAddress(projectId, old, url.searchParams));
}
