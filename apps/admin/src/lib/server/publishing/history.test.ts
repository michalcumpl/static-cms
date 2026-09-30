import { eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";
import { openDatabase } from "../db/index";
import { publishes, siteDocuments, users, workspaces } from "../db/schema";
import { demoSite } from "../demo";
import { newId } from "../ids";
import { createProject } from "../site-documents";
import { INTERRUPTED, markInterruptedPublishes } from "./history";

function setup() {
  const db = openDatabase(":memory:");
  const workspaceId = newId("w");
  const userId = newId("u");
  db.insert(workspaces).values({ id: workspaceId, name: "Pekárna", createdAt: new Date() }).run();
  db.insert(users).values({ id: userId, email: "jana@example.cz", createdAt: new Date() }).run();
  const projectId = createProject(db, workspaceId, "Pekárna", demoSite());
  const versionId =
    db
      .select({ id: siteDocuments.currentVersionId })
      .from(siteDocuments)
      .where(eq(siteDocuments.projectId, projectId))
      .get()?.id ?? "";
  return { db, projectId, versionId, userId };
}

describe("publishes", () => {
  it("marks running publishes failed on startup, and leaves the others", () => {
    const { db, projectId, versionId, userId } = setup();
    const row = (id: string, state: "running" | "ready" | "failed") => ({
      id,
      projectId,
      versionId,
      state,
      publishedBy: userId,
      startedAt: new Date(),
    });
    db.insert(publishes)
      .values([row("pb_1", "running"), row("pb_2", "ready"), row("pb_3", "failed")])
      .run();
    expect(markInterruptedPublishes(db)).toBe(1);
    const states = db
      .select({ id: publishes.id, state: publishes.state, error: publishes.error })
      .from(publishes)
      .all();
    expect(states).toEqual([
      { id: "pb_1", state: "failed", error: INTERRUPTED },
      { id: "pb_2", state: "ready", error: null },
      { id: "pb_3", state: "failed", error: null },
    ]);
  });

  it("refuses a publish of a project that doesn't exist", () => {
    const { db, versionId } = setup();
    expect(() =>
      db
        .insert(publishes)
        .values({
          id: "pb_x",
          projectId: "p_none",
          versionId,
          state: "running",
          startedAt: new Date(),
        })
        .run(),
    ).toThrow(/FOREIGN KEY/);
  });
});
