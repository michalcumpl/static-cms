import { json } from "@sveltejs/kit";
import { requireMember } from "$lib/server/access";
import { getDb } from "$lib/server/app";
import { projectRetry } from "$lib/server/import/retry";
import type { RequestHandler } from "./$types";

/**
 * The project's running retry of its import, or its last one, for the review's progress
 * (import-review-actions design decision 5): `{ retry }`, null when there was none.
 */
export const GET: RequestHandler = (event) => {
  requireMember(event, event.params.project, { api: true });
  const row = projectRetry(getDb(), event.params.project);
  return json({
    retry: row
      ? {
          id: row.id,
          kind: row.kind,
          state: row.state,
          progress: row.progress,
          error: row.error,
          added: row.added,
        }
      : null,
  });
};
