import { describe, expect, it } from "vitest";
import { importRetries, imports } from "$lib/server/db/schema";
import { useTestProject } from "$lib/server/test-project";
import { GET } from "./+server";

type Event = Parameters<typeof GET>[0];
const project = useTestProject();

function call(user?: { id: string; email: string }) {
  const { projectId, event } = project();
  const request = event(`/api/projects/${projectId}/import-retry`, user);
  return GET({ ...request, params: { project: projectId } } as unknown as Event);
}

describe("GET /api/projects/[project]/import-retry", () => {
  it("gives members the last retry, and null before any", async () => {
    const { db, workspaceId, owner, projectId } = project();
    db.insert(imports)
      .values({
        id: "im_1",
        workspaceId,
        userId: owner.id,
        address: "https://pekarna-ulipy.cz/",
        state: "done",
        projectId,
        startedAt: new Date(),
      })
      .run();
    expect(await (await call(owner)).json()).toEqual({ retry: null });
    db.insert(importRetries)
      .values([
        { id: "rt_1", importId: "im_1", kind: "again", state: "done", startedAt: new Date(1) },
        {
          id: "rt_2",
          importId: "im_1",
          userId: owner.id,
          kind: "language",
          lang: "en",
          state: "running",
          progress: { phase: "pages", done: 3, total: 20 },
          startedAt: new Date(2),
        },
      ])
      .run();
    expect(await (await call(owner)).json()).toEqual({
      retry: {
        id: "rt_2",
        kind: "language",
        lang: "en",
        state: "running",
        progress: { phase: "pages", done: 3, total: 20 },
        error: null,
        added: null,
      },
    });
  });

  it("is refused to others, and asks to sign in without a session", async () => {
    const { outsider } = project();
    await expect(async () => call(outsider)).rejects.toMatchObject({ status: 404 });
    await expect(async () => call()).rejects.toMatchObject({ status: 401 });
  });
});
