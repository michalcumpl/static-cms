import { eq } from "drizzle-orm";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { projectHosting, users } from "$lib/server/db/schema";
import { newId } from "$lib/server/ids";
import { addMember } from "$lib/server/members";
import { connectWorkspace } from "$lib/server/publishing/connection";
import { type FakeNetlify, startFakeNetlify } from "$lib/server/publishing/fake-netlify";
import { publishesSettled, startPublish } from "$lib/server/publishing/publish";
import { useTestProject } from "$lib/server/test-project";
import { DELETE as purge } from "../workspaces/[workspace]/deleted/[project]/+server";
import { POST as restore } from "../workspaces/[workspace]/deleted/[project]/restore/+server";
import { DELETE as remove } from "./[project]/+server";
import { GET as site } from "./[project]/site/+server";

// Deleting, restoring and removing a website through the API (project-deletion decisions 3–4).

const TOKEN = "nfp_delete_token";
let fake: FakeNetlify;
const project = useTestProject(() => ({
  project: project().projectId,
  workspace: project().workspaceId,
}));

beforeEach(async () => {
  fake = await startFakeNetlify();
  fake.addToken(TOKEN, [{ slug: "anideti", name: "Aniděti" }]);
  process.env.NETLIFY_API_URL = fake.url;
  process.env.SECRET_KEY = "k".repeat(40);
});
afterEach(async () => {
  await publishesSettled();
  delete process.env.NETLIFY_API_URL;
  delete process.env.SECRET_KEY;
  await fake.close();
});

type User = { id: string; email: string };

/** A route's answer, returned or thrown (`error()` throws), as a status and a JSON reader. */
async function answer(run: () => unknown): Promise<{ status: number; json(): Promise<unknown> }> {
  try {
    const response = (await run()) as Response;
    return { status: response.status, json: () => response.json() };
  } catch (thrown) {
    const { status, body } = thrown as { status: number; body: unknown };
    if (typeof status !== "number") throw thrown;
    return { status, json: async () => body };
  }
}
const owner = () => project().owner;
function editor(): User {
  const { db, workspaceId } = project();
  const id = newId("u");
  db.insert(users).values({ id, email: "petr@example.cz", createdAt: new Date() }).run();
  addMember(db, workspaceId, id, "editor");
  return { id, email: "petr@example.cz" };
}

async function published() {
  const { db, workspaceId, projectId } = project();
  await connectWorkspace(db, workspaceId, owner().id, { token: TOKEN, account: "anideti" });
  const result = startPublish(db, projectId, owner().id);
  if (!result.ok) throw new Error(JSON.stringify(result));
  await publishesSettled();
  db.update(projectHosting)
    .set({ domain: "pekarnaulipy.cz" })
    .where(eq(projectHosting.projectId, projectId))
    .run();
}

const apiPath = () => `/api/projects/${project().projectId}`;
const deletedPath = (suffix = "") =>
  `/api/workspaces/${project().workspaceId}/deleted/${project().projectId}${suffix}`;
async function deleteAs(user: User, name = "Pekárna U Lípy") {
  const event = project().event(apiPath(), user, {
    method: "DELETE",
    body: JSON.stringify({ name }),
  });
  return answer(() => remove(event as never));
}
const restoreAs = (user: User) =>
  answer(() =>
    restore(project().event(deletedPath("/restore"), user, { method: "POST" }) as never),
  );
const purgeAs = (user: User) =>
  answer(() => purge(project().event(deletedPath(), user, { method: "DELETE" }) as never));
const readSiteStatus = async () =>
  (await answer(() => site(project().event(`${apiPath()}/site`, owner()) as never))).status;

describe("deleting a website", () => {
  it("Delete a website: 204, and its site API answers not found", async () => {
    expect((await deleteAs(owner())).status).toBe(204);
    expect(await readSiteStatus()).toBe(404);
  });

  it("Editor can't delete", async () => {
    expect((await deleteAs(editor())).status).toBe(403);
    expect(await readSiteStatus()).toBe(200);
  });

  it("Wrong name: nothing is deleted", async () => {
    for (const name of ["pekárna u lípy", "Pekarna U Lipy", ""]) {
      expect((await deleteAs(owner(), name)).status, name).toBe(422);
    }
    expect((await deleteAs(owner(), "  Pekárna U Lípy ")).status).toBe(204);
  });

  it("answers not found to someone else", async () => {
    expect((await deleteAs(project().outsider)).status).toBe(404);
  });

  it("Offline at once: deletes the Netlify site and frees the domain", async () => {
    await published();
    expect(fake.sites.size).toBe(1);
    expect((await deleteAs(owner())).status).toBe(204);
    expect(fake.sites.size).toBe(0);
    const { db } = project();
    expect(
      db.select().from(projectHosting).where(eq(projectHosting.domain, "pekarnaulipy.cz")).all(),
    ).toEqual([]);
  });

  it("Netlify down: the website isn't deleted and stays online", async () => {
    await published();
    fake.setDown(true);
    const response = await deleteAs(owner());
    expect(response.status).toBe(502);
    expect(((await response.json()) as { message: string }).message).toBe(
      "The hosting service (Netlify) couldn't be reached.",
    );
    fake.setDown(false);
    expect(fake.sites.size).toBe(1);
    expect(await readSiteStatus()).toBe(200);
  });

  it("not connected any more: deleted, and the Netlify site left as it is", async () => {
    await published();
    const { db, workspaceId } = project();
    const { disconnectWorkspace } = await import("$lib/server/publishing/connection");
    disconnectWorkspace(db, workspaceId);
    expect((await deleteAs(owner())).status).toBe(204);
    expect(fake.sites.size).toBe(1);
  });
});

describe("restoring and removing", () => {
  it("Publish after restoring: back, unpublished, and a new site when published", async () => {
    await published();
    await deleteAs(owner());
    expect((await restoreAs(owner())).status).toBe(204);
    expect(await readSiteStatus()).toBe(200);
    const { db, projectId } = project();
    expect(
      db.select().from(projectHosting).where(eq(projectHosting.projectId, projectId)).all(),
    ).toEqual([]);
    const result = startPublish(db, projectId, owner().id);
    expect(result.ok).toBe(true);
    await publishesSettled();
    expect(fake.sites.size).toBe(1);
  });

  it("Delete now removes it for good; it can't be restored after", async () => {
    await deleteAs(owner());
    expect((await purgeAs(owner())).status).toBe(204);
    expect((await restoreAs(owner())).status).toBe(404);
  });

  it("refuses editors, and projects that aren't deleted", async () => {
    expect((await restoreAs(owner())).status).toBe(404);
    expect((await purgeAs(owner())).status).toBe(404);
    expect(await readSiteStatus()).toBe(200);
    await deleteAs(owner());
    const petr = editor();
    expect((await restoreAs(petr)).status).toBe(403);
    expect((await purgeAs(petr)).status).toBe(403);
  });
});
