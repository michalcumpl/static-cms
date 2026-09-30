import { and, eq } from "drizzle-orm";
import type { Db } from "../db/index";
import { publishes } from "../db/schema";

export const INTERRUPTED = "The publish was interrupted by a server restart. Publish again.";

/**
 * Marks publishes still "running" as failed: the process that ran them is gone. Called on
 * startup; the site keeps showing its previous deploy, since deploys are atomic.
 */
export function markInterruptedPublishes(db: Db): number {
  return db
    .update(publishes)
    .set({ state: "failed", error: INTERRUPTED, finishedAt: new Date() })
    .where(and(eq(publishes.state, "running")))
    .run().changes;
}
