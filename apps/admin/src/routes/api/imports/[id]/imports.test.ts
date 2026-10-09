import { describe, expect, it } from "vitest";
import { imports } from "$lib/server/db/schema";
import { useTestProject } from "$lib/server/test-project";
import { GET } from "./+server";

type Event = Parameters<typeof GET>[0];
const project = useTestProject();

function call(id: string, user?: { id: string; email: string }) {
  const event = project().event(`/api/imports/${id}`, user);
  return GET({ ...event, params: { id } } as unknown as Event);
}

describe("GET /api/imports/[id]", () => {
  it("gives its owner the import's state, and the review once done", async () => {
    const { db, workspaceId, owner, projectId } = project();
    db.insert(imports)
      .values({
        id: "im_1",
        workspaceId,
        userId: owner.id,
        address: "https://pekarna-ulipy.cz/",
        state: "done",
        progress: { phase: "building", done: 1, total: 1 },
        projectId,
        startedAt: new Date(),
      })
      .run();
    const response = await call("im_1", owner);
    expect(await response.json()).toEqual({
      state: "done",
      progress: { phase: "building", done: 1, total: 1 },
      error: null,
      review: `/p/${projectId}/import`,
    });
  });

  it("is not found for anyone else, and asks to sign in without a session", async () => {
    const { db, workspaceId, owner, outsider } = project();
    db.insert(imports)
      .values({
        id: "im_2",
        workspaceId,
        userId: owner.id,
        address: "https://x.cz/",
        state: "running",
        startedAt: new Date(),
      })
      .run();
    await expect(async () => call("im_2", outsider)).rejects.toMatchObject({ status: 404 });
    await expect(async () => call("im_2")).rejects.toMatchObject({ status: 401 });
  });
});
