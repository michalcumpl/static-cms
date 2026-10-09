// Publishing to Webmio hosting (own-hosting design.md decisions 8 and 10), with the folder fake
// standing in for AWS, through the same routes members use.
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { eq } from "drizzle-orm";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { projectHosting, projects } from "$lib/server/db/schema";
import { demoSite } from "$lib/server/demo";
import { connectWorkspace, targetFor } from "$lib/server/publishing/connection";
import { type FakeNetlify, startFakeNetlify } from "$lib/server/publishing/fake-netlify";
import { publishesSettled, startPublish } from "$lib/server/publishing/publish";
import { fakeHosting, serveFake } from "$lib/server/publishing/webmio-fake";
import { createProject } from "$lib/server/site-documents";
import { useTestProject } from "$lib/server/test-project";
import { POST as publish } from "./[project]/publish/+server";
import { GET as history } from "./[project]/publishes/+server";
import { POST as restore } from "./[project]/publishes/[publish]/restore/+server";

type Summary = { id: string; state: string; url: string; live: boolean; restorable: boolean };

let folder: string;
let publishId = "";
const project = useTestProject(() => ({ publish: publishId }));

beforeEach(() => {
  folder = mkdtempSync(join(tmpdir(), "webmio-publishing-"));
  process.env.WEBMIO_HOSTING_FAKE_DIR = folder;
});
afterEach(async () => {
  await publishesSettled();
  delete process.env.WEBMIO_HOSTING_FAKE_DIR;
  rmSync(folder, { recursive: true, force: true });
});

const path = (suffix: string) => `/api/projects/${project().projectId}/${suffix}`;

async function doPublish() {
  const response = await publish(
    project().event(path("publish"), project().owner, { method: "POST" }) as never,
  );
  await publishesSettled();
  return response;
}

/** Publishes another project of the workspace. */
async function publishOther(name: string) {
  const { db, workspaceId, owner } = project();
  const projectId = createProject(db, workspaceId, name, demoSite());
  expect(startPublish(db, projectId, owner.id)).toMatchObject({ ok: true });
  await publishesSettled();
  return projectId;
}

async function state(): Promise<{ address: string; provider: string; publishes: Summary[] }> {
  return (await history(project().event(path("publishes"), project().owner) as never)).json();
}

async function visit(uri: string, host = "pekarna-u-lipy.webmio.site") {
  const response = await serveFake(folder, { host, uri });
  return { status: response.status, text: new TextDecoder().decode(response.body) };
}

function hostingRow(projectId = project().projectId) {
  return project()
    .db.select()
    .from(projectHosting)
    .where(eq(projectHosting.projectId, projectId))
    .get();
}

describe("publishing to Webmio hosting", () => {
  it("Nothing to connect with Webmio hosting: a never-published project can publish", async () => {
    expect(await state()).toMatchObject({
      canPublish: true,
      provider: "webmio",
      team: null,
      address: null,
    });
  });

  it("publishes a never-published project at its free address, without connecting anything", async () => {
    expect(targetFor(project().db, project().projectId)).toMatchObject({ ok: true });
    const response = await doPublish();
    expect(response.status).toBe(202);
    const { address, provider, publishes } = await state();
    expect(provider).toBe("webmio");
    expect(address).toBe("https://pekarna-u-lipy.webmio.site");
    expect(publishes).toEqual([
      expect.objectContaining({
        state: "ready",
        url: "https://pekarna-u-lipy.webmio.site",
        live: true,
        restorable: true,
      }),
    ]);
    const home = await visit("/");
    expect(home.status).toBe(200);
    expect(home.text).toContain('href="https://pekarna-u-lipy.webmio.site/"');
    const sitemap = await visit("/sitemap.xml");
    expect(sitemap.text).toContain("<loc>https://pekarna-u-lipy.webmio.site/</loc>");
  });

  it("keeps the address when the project is renamed", async () => {
    await doPublish();
    project()
      .db.update(projects)
      .set({ name: "Pekárna Na Rohu" })
      .where(eq(projects.id, project().projectId))
      .run();
    await doPublish();
    const { publishes } = await state();
    expect(publishes.map((p) => p.url)).toEqual([
      "https://pekarna-u-lipy.webmio.site",
      "https://pekarna-u-lipy.webmio.site",
    ]);
  });

  it("adds a number when another website has the name", async () => {
    await doPublish();
    const second = await publishOther("Pekárna u Lípy");
    // Created before its export (whose images only the test project has).
    expect(hostingRow(second)?.defaultUrl).toBe("https://pekarna-u-lipy-2.webmio.site");
  });

  it("skips names Webmio keeps for itself", async () => {
    const www = await publishOther("WWW");
    expect(hostingRow(www)?.defaultUrl).toBe("https://www-2.webmio.site");
  });

  it("refuses to publish a website on Webmio hosting when the server no longer has it", async () => {
    await doPublish();
    delete process.env.WEBMIO_HOSTING_FAKE_DIR;
    const response = await publish(
      project().event(path("publish"), project().owner, { method: "POST" }) as never,
    );
    expect(response.status).toBe(409);
    expect((await response.json()).message).toContain("Webmio hosting isn't set up");
  });
});

describe("a website already on Netlify", () => {
  let fake: FakeNetlify;
  beforeEach(async () => {
    fake = await startFakeNetlify();
    fake.addToken("nfp_token", [{ slug: "anideti", name: "Aniděti" }]);
    process.env.NETLIFY_API_URL = fake.url;
    process.env.SECRET_KEY = "k".repeat(40);
  });
  afterEach(async () => {
    delete process.env.NETLIFY_API_URL;
    delete process.env.SECRET_KEY;
    await fake.close();
  });

  it("keeps publishing to Netlify", async () => {
    const { db, workspaceId, owner, projectId } = project();
    await connectWorkspace(db, workspaceId, owner.id, { token: "nfp_token", account: "anideti" });
    // Published before the server had Webmio hosting.
    const before = startPublish(db, projectId, owner.id, { webmio: null });
    expect(before.ok).toBe(true);
    await publishesSettled();
    expect(hostingRow()?.provider).toBe("netlify");
    await doPublish();
    const { provider, publishes } = await state();
    expect(provider).toBe("netlify");
    expect(publishes).toHaveLength(2);
    expect(publishes[0]).toMatchObject({ state: "ready", live: true });
    expect(publishes[0]?.url).toMatch(/netlify\.app$/);
    expect(fakeHosting(folder).keys()).toEqual({});
  });
});

describe("keeping publishes", () => {
  it("keeps the files of the 10 newest publishes and the live one", async () => {
    for (let i = 0; i < 12; i++) await doPublish();
    const { publishes } = await state();
    expect(publishes).toHaveLength(12);
    expect(publishes.map((p) => p.restorable)).toEqual([
      ...Array<boolean>(10).fill(true),
      false,
      false,
    ]);
    const hosting = fakeHosting(folder);
    const siteId = hostingRow()?.siteId;
    const deploys = new Set(
      hosting
        .objectKeys(`sites/${siteId}/`)
        .map((key) => key.split("/")[2]?.replace(".manifest.json", "")),
    );
    expect(deploys.size).toBe(10);

    const oldest = publishes.at(-1) as Summary;
    publishId = oldest.id;
    const refused = await restore(
      project().event(path(`publishes/${oldest.id}/restore`), project().owner, {
        method: "POST",
      }) as never,
    );
    expect(refused.status).toBe(404);
    expect((await refused.json()).message).toBe("That publish can't be made live again.");
  });

  it("never deletes the files of the live publish", async () => {
    for (let i = 0; i < 10; i++) await doPublish();
    const oldest = (await state()).publishes.at(-1) as Summary;
    publishId = oldest.id;
    const response = await restore(
      project().event(path(`publishes/${oldest.id}/restore`), project().owner, {
        method: "POST",
      }) as never,
    );
    expect(response.status).toBe(200);
    for (let i = 0; i < 10; i++) {
      await doPublish();
      const { publishes } = await state();
      expect(publishes[0]).toMatchObject({ live: true, restorable: true });
      expect((await visit("/")).status).toBe(200);
    }
  });
});
