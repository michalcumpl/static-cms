// The publish pipeline (safe-publishing): steps, the site's own links, outside links as
// warnings, verifying the live website, and going back when it fails. Webmio hosting is the
// folder fake; Netlify is the fake Netlify.
import { copyFileSync, mkdirSync, mkdtempSync, rmSync } from "node:fs";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { eq } from "drizzle-orm";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { projectHosting, publishes } from "$lib/server/db/schema";
import { demoSite } from "$lib/server/demo";
import { registerLegacyMedia } from "$lib/server/media";
import { connectWorkspace } from "$lib/server/publishing/connection";
import { type FakeNetlify, startFakeNetlify } from "$lib/server/publishing/fake-netlify";
import {
  type PublishOptions,
  publishesSettled,
  publishingState,
  startPublish,
} from "$lib/server/publishing/publish";
import { type FakeHosting, fakeHosting, serveFake } from "$lib/server/publishing/webmio-fake";
import { createProject } from "$lib/server/site-documents";
import { useTestProject } from "$lib/server/test-project";

const project = useTestProject();
const fast = { deadlineMs: 400, pollMs: 20, retryMs: 20 };
const encode = (text: string) => new TextEncoder().encode(text);
const decode = (bytes: Uint8Array) => new TextDecoder().decode(bytes);

let folder: string;
let hosting: FakeHosting;
beforeEach(() => {
  folder = mkdtempSync(join(tmpdir(), "safe-publishing-"));
  process.env.WEBMIO_HOSTING_FAKE_DIR = folder;
  hosting = fakeHosting(folder);
});
afterEach(async () => {
  await publishesSettled();
  delete process.env.WEBMIO_HOSTING_FAKE_DIR;
  rmSync(folder, { recursive: true, force: true });
});

async function publish(options: PublishOptions = {}, projectId = project().projectId) {
  const { db, owner } = project();
  const started = startPublish(db, projectId, owner.id, { verify: fast, ...options });
  if (!started.ok) throw new Error(JSON.stringify(started));
  await publishesSettled();
  return publishRow(started.publishId);
}

function publishRow(id: string) {
  return project().db.select().from(publishes).where(eq(publishes.id, id)).get();
}

async function visit(uri: string, host = "pekarna-u-lipy.webmio.site") {
  const response = await serveFake(folder, { host, uri });
  return { status: response.status, text: decode(response.body) };
}

/** Puts a heading into the exported home page. */
const withHeading = (heading: string) => (files: Map<string, Uint8Array>) => {
  const home = decode(files.get("index.html") as Uint8Array);
  files.set("index.html", encode(home.replace(/<h1>[^<]*<\/h1>/, `<h1>${heading}</h1>`)));
};

describe("steps", () => {
  it("Steps while publishing: checking, uploading, verifying, then published", async () => {
    const seen: (string | null | undefined)[] = [];
    const step = () => project().db.select({ step: publishes.step }).from(publishes).get()?.step;
    const putObject = hosting.putObject.bind(hosting);
    let uploading: string | null | undefined;
    hosting.putObject = async (...args) => {
      uploading ??= step();
      return putObject(...args);
    };
    process.env.WEBMIO_HOSTING_FAKE_DIR = folder;
    const row = await publish({
      webmio: hosting,
      alterExport: () => {
        seen.push(step());
      },
      fetchLive: async (url, init) => {
        if (seen.length === 1) seen.push(uploading, step());
        return hosting.fetchSite(url, init);
      },
    });
    expect(seen).toEqual(["checking", "uploading", "verifying"]);
    expect(row).toMatchObject({ state: "ready", step: null, warnings: null });
  });
});

describe("the site's own links", () => {
  it("A page links to a file the publish lacks: fails before uploading, the previous version stays", async () => {
    await publish();
    const before = hosting.objectKeys();
    const row = await publish({
      alterExport: (files) => {
        const home = decode(files.get("index.html") as Uint8Array);
        files.set("index.html", encode(`${home}<a href="/cenik/">Ceník</a>`));
      },
    });
    expect(row).toMatchObject({ state: "failed", deployId: null });
    expect(row?.error).toBe(
      "Publishing failed: Some links lead to addresses the website doesn't have: / links to /cenik/. Your previous version is still online.",
    );
    expect(hosting.objectKeys()).toEqual(before);
    expect((await visit("/")).status).toBe(200);
  });
});

describe("links to other websites", () => {
  it("An outside link doesn't answer: published, with a warning naming the page", async () => {
    const row = await publish({
      alterExport: (files) => {
        const page = decode(files.get("kontakt/index.html") as Uint8Array);
        files.set(
          "kontakt/index.html",
          encode(`${page}<a href="https://stary-eshop.example/">E-shop</a>`),
        );
      },
      outsideLinks: {
        fetch: async (input) =>
          String(input) === "https://stary-eshop.example/"
            ? Promise.reject(new TypeError("fetch failed"))
            : new Response(null, { status: 200 }),
      },
    });
    expect(row).toMatchObject({ state: "ready" });
    expect(row?.warnings).toEqual([
      { kind: "outside-link", page: "/kontakt/", url: "https://stary-eshop.example/" },
    ]);
    // What the Publish page reads.
    expect(publishingState(project().db, project().projectId).publishes[0]).toMatchObject({
      step: null,
      warnings: [{ kind: "outside-link", page: "/kontakt/", url: "https://stary-eshop.example/" }],
    });
  });

  it("Outside links answer: no warnings", async () => {
    const row = await publish({
      outsideLinks: { fetch: async () => new Response(null, { status: 200 }) },
    });
    expect(row).toMatchObject({ state: "ready", warnings: null });
  });
});

describe("verifying the live website", () => {
  it("The new version is served: published", async () => {
    expect(await publish()).toMatchObject({ state: "ready" });
  });

  it("Verification fails on a published website: the previous version is live again, the failed one's files go", async () => {
    const first = await publish({ alterExport: withHeading("První") });
    hosting.serveStale(true);
    const second = await publish({ alterExport: withHeading("Druhá") });
    hosting.serveStale(false);
    expect(second?.state).toBe("failed");
    expect(second?.error).toBe(
      "Publishing failed: The website didn't show the new version in time (/). Your previous version is still online.",
    );
    expect((await visit("/")).text).toContain("<h1>První</h1>");
    const state = publishingState(project().db, project().projectId);
    expect(state.publishes.map((p) => [p.state, p.live])).toEqual([
      ["failed", false],
      ["ready", true],
    ]);
    const siteId = state.publishes.length && hostingRow()?.siteId;
    const deploys = new Set(hosting.objectKeys(`sites/${siteId}/`).map((key) => key.split("/")[2]));
    expect(deploys).toEqual(new Set([first?.deployId, `${first?.deployId}.manifest.json`]));
  });

  it("Verification fails on a first publish: offline again, and Try again publishes it as a first publish", async () => {
    const failed = await publish({
      fetchLive: async () => new Response("Tady žádný web není", { status: 404 }),
    });
    expect(failed?.state).toBe("failed");
    expect(failed?.error).toBe(
      "Publishing failed: The website didn't show the new version in time (/). The website isn't online yet.",
    );
    expect((await visit("/")).status).toBe(404);
    const siteId = hostingRow()?.siteId;
    expect(hosting.keys()).toEqual({ "h:pekarna-u-lipy.webmio.site": siteId });
    expect(hosting.objectKeys(`sites/${siteId}/`)).toEqual([]);

    // Try again: the same as Publish.
    const again = await publish();
    expect(again?.state).toBe("ready");
    expect((await visit("/")).status).toBe(200);
    expect(hostingRow()?.defaultUrl).toBe("https://pekarna-u-lipy.webmio.site");
  });

  it("Provider unreachable: fails before the switch, the previous version stays", async () => {
    await publish();
    hosting.setUnreachable(true);
    const row = await publish();
    hosting.setUnreachable(false);
    expect(row?.error).toBe(
      "Publishing failed: The hosting service couldn't be reached. Your previous version is still online.",
    );
    expect((await visit("/")).status).toBe(200);
  });
});

describe("on Netlify", () => {
  let fake: FakeNetlify;
  beforeEach(async () => {
    delete process.env.WEBMIO_HOSTING_FAKE_DIR;
    fake = await startFakeNetlify();
    fake.addToken("nfp_safe", [{ slug: "anideti", name: "Aniděti" }]);
    process.env.NETLIFY_API_URL = fake.url;
    process.env.SECRET_KEY = "k".repeat(40);
    const { db, workspaceId, owner } = project();
    await connectWorkspace(db, workspaceId, owner.id, { token: "nfp_safe", account: "anideti" });
  });
  afterEach(async () => {
    await publishesSettled();
    delete process.env.NETLIFY_API_URL;
    delete process.env.SECRET_KEY;
    await fake.close();
  });

  it("Verification fails on Netlify: the previous deploy is live again", async () => {
    const first = await publish({ alterExport: withHeading("První") });
    expect(first?.state).toBe("ready");
    const second = await publish({
      alterExport: withHeading("Druhá"),
      fetchLive: async () => new Response("<h1>První</h1>"),
    });
    expect(second?.state).toBe("failed");
    const site = [...fake.sites.values()][0];
    expect(site?.liveDeploy).toBe(first?.deployId);
    const state = publishingState(project().db, project().projectId);
    expect(state.publishes.map((p) => p.live)).toEqual([false, true]);
  });

  it("a failed first publish deletes the new Netlify site, and the next one creates it again", async () => {
    const failed = await publish({ fetchLive: async () => new Response("", { status: 404 }) });
    expect(failed?.error).toContain("The website isn't online yet.");
    expect(fake.sites.size).toBe(0);
    expect(hostingRow()).toBeUndefined();
    expect((await publish())?.state).toBe("ready");
    expect(fake.sites.size).toBe(1);
  });
});

describe("publishing beside each other", () => {
  it("one project's verification waits while another project publishes", async () => {
    const { db, workspaceId, owner } = project();
    const other = createProject(db, workspaceId, "Kavárna", demoSite());
    // The other project gets the demo image, as the test project does.
    const require = createRequire(import.meta.url);
    const demoMedia = join(
      dirname(require.resolve("@webmio/model/fixtures/demo-site.json")),
      "media",
    );
    const media = process.env.MEDIA_DIR as string;
    mkdirSync(join(media, other), { recursive: true });
    copyFileSync(join(demoMedia, "hero.png"), join(media, other, "hero.png"));
    await registerLegacyMedia(db, other, media);

    let release = () => {};
    const held = new Promise<void>((resolve) => {
      release = resolve;
    });
    const slow = startPublish(db, project().projectId, owner.id, {
      verify: fast,
      fetchLive: async (url, init) => {
        await held;
        return hosting.fetchSite(url, init);
      },
    });
    const quick = startPublish(db, other, owner.id, { verify: fast });
    if (!slow.ok || !quick.ok) throw new Error("not started");
    for (let i = 0; i < 100 && publishRow(quick.publishId)?.state === "running"; i++) {
      await new Promise((resolve) => setTimeout(resolve, 20));
    }
    expect(publishRow(quick.publishId)?.state).toBe("ready");
    expect(publishRow(slow.publishId)?.state).toBe("running");
    release();
    await publishesSettled();
    expect(publishRow(slow.publishId)?.state).toBe("ready");
  });
});

function hostingRow() {
  return project()
    .db.select()
    .from(projectHosting)
    .where(eq(projectHosting.projectId, project().projectId))
    .get();
}
