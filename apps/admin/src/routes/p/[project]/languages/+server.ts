import { redirectOld } from "$lib/server/old-addresses";
import type { RequestHandler } from "./$types";

/** A former tab's address (project-page spec, "Old addresses"). */
export const GET: RequestHandler = ({ url, params }) => redirectOld(url, params.project);
