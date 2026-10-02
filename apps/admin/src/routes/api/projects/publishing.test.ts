import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { connectWorkspace } from "$lib/server/publishing/connection";
import { type FakeNetlify, startFakeNetlify } from "$lib/server/publishing/fake-netlify";
import { publishesSettled, siteNameFor } from "$lib/server/publishing/publish";
import { readSite, saveSite } from "$lib/server/site-documents";
import { inCzech, thrownBy, useTestProject } from "$lib/server/test-project";
import { isForeignApiWrite } from "../../../hooks.server";
import { POST as publish } from "./[project]/publish/+server";
import { GET as history } from "./[project]/publishes/+server";
import { POST as restore } from "./[project]/publishes/[publish]/restore/+server";

type User = { id: string; email: string };
// biome-ignore lint/suspicious/noExplicitAny: tests edit nodes freely.
type Doc = { nodes: Record<string, any> };

const TOKEN = "nfp_publish_token";
let fake: FakeNetlify;
let publishId = "";
const project = useTestProject(() => ({ publish: publishId }));

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

async function connect() {
  const { db, workspaceId, owner } = project();
  const result = await connectWorkspace(db, workspaceId, owner.id, {
    token: TOKEN,
    account: "anideti",
  });
  if (!result.ok) throw new Error(JSON.stringify(result.message));
}
const path = (suffix: string) => `/api/projects/${project().projectId}/${suffix}`;
async function doPublish(user: User | null = project().owner) {
  return publish(project().event(path("publish"), user ?? undefined, { method: "POST" }) as never);
}
async function state(user: User | null = project().owner) {
  return (await history(project().event(path("publishes"), user ?? undefined) as never)).json();
}
function edit(change: (doc: Doc) => void) {
  const { db, projectId, owner } = project();
  const site = readSite(db, projectId);
  if (!site) throw new Error("no site");
  const doc = structuredClone(site.document) as Doc;
  change(doc);
  const result = saveSite(db, projectId, owner.id, doc, site.version);
  if (!result.ok) throw new Error("save failed");
}
const siteName = () => siteNameFor(project().projectId);
async function visit(pathname: string) {
  const response = await fetch(`${fake.url}/sites/${siteName()}${pathname}`, {
    redirect: "manual",
  });
  return {
    status: response.status,
    text: await response.text(),
    location: response.headers.get("location"),
  };
}

describe("publishing", () => {
  it("publishes a never-published project: creates its site and records the publish", async () => {
    await connect();
    const response = await doPublish();
    expect(response.status).toBe(202);
    await publishesSettled();
    const result = await state();
    const address = `https://${siteName()}.netlify.app`;
    expect(result).toMatchObject({ connected: true, team: "Aniděti", address, domain: null });
    expect(result.publishes).toEqual([
      expect.objectContaining({
        state: "ready",
        url: address,
        live: true,
        publishedBy: "jana@example.cz",
      }),
    ]);
    expect([...fake.sites.values()][0]).toMatchObject({ name: siteName(), account: "anideti" });
    const home = await visit("/");
    expect(home.text).toContain("<title>Pekárna U Lípy</title>");
    expect(home.text).toContain(`<link rel="canonical" href="${address}/">`);
    expect((await visit("/sitemap.xml")).text).toContain(`<loc>${address}/kontakt/</loc>`);
  });

  it("deploys the theme's webfonts and their licence", async () => {
    await connect();
    edit((doc) => {
      doc.nodes.theme_1.font_heading = "lora";
    });
    await doPublish();
    await publishesSettled();
    const font = await fetch(
      `${fake.url}/sites/${siteName()}/assets/fonts/lora-latin-normal.woff2`,
    );
    expect(font.status).toBe(200);
    expect(new TextDecoder().decode((await font.arrayBuffer()).slice(0, 4))).toBe("wOF2");
    expect((await visit("/assets/fonts/lora-OFL.txt")).text).toContain("Open Font License");
  });

  it("refuses a site with errors, listing them, and deploys nothing", async () => {
    await connect();
    edit((doc) => {
      doc.nodes.image_hero.alt = "";
    });
    const response = await doPublish();
    expect(response.status).toBe(422);
    expect((await response.json()).problems).toEqual([
      expect.objectContaining({ code: "missing-alt" }),
    ]);
    expect(fake.sites.size).toBe(0);
    expect((await state()).publishes).toEqual([]);
  });

  it("uploads only what changed on the next publish", async () => {
    await connect();
    await doPublish();
    await publishesSettled();
    fake.uploads.length = 0;
    edit((doc) => {
      doc.nodes.hero_1.heading.content = "Nový chléb";
    });
    await doPublish();
    await publishesSettled();
    expect(fake.uploads).toEqual(["/index.html"]);
    expect((await visit("/")).text).toContain("<h1>Nový chléb</h1>");
  });

  it("redirects a changed address", async () => {
    await connect();
    await doPublish();
    await publishesSettled();
    edit((doc) => {
      doc.nodes.page_contact.slug = "napiste-nam";
    });
    await doPublish();
    await publishesSettled();
    expect(await visit("/kontakt/")).toMatchObject({ status: 301, location: "/napiste-nam/" });
  });

  it("fails readably when Netlify can't be reached, keeping the previous publish live", async () => {
    await connect();
    await doPublish();
    await publishesSettled();
    edit((doc) => {
      doc.nodes.hero_1.heading.content = "Nedosažitelné";
    });
    fake.setDown(true);
    await doPublish();
    await publishesSettled();
    fake.setDown(false);
    const [latest, previous] = (await state()).publishes;
    expect(latest).toMatchObject({
      state: "failed",
      error: "The hosting service (Netlify) couldn't be reached.",
      live: false,
    });
    expect(previous).toMatchObject({ state: "ready", live: true });
    expect((await visit("/")).text).not.toContain("Nedosažitelné");
  });

  it("records a failure in the language of the person who published", async () => {
    await connect();
    fake.setDown(true);
    const event = project().event(path("publish"), project().owner, { method: "POST" });
    await publish(inCzech(event) as never);
    await publishesSettled();
    fake.setDown(false);
    expect((await state()).publishes[0]).toMatchObject({
      state: "failed",
      error: "Hostingová služba (Netlify) není dostupná.",
    });
  });

  it("refuses an unconnected workspace in the person's language", async () => {
    const event = project().event(path("publish"), project().owner, { method: "POST" });
    const response = await publish(inCzech(event) as never);
    expect(response.status).toBe(409);
    expect((await response.json()).message).toMatch(/^Tento pracovní prostor ještě není připojený/);
  });

  it("asks an owner to reconnect when the token was revoked", async () => {
    await connect();
    fake.revokeToken(TOKEN);
    await doPublish();
    await publishesSettled();
    expect((await state()).publishes[0]).toMatchObject({
      state: "failed",
      error: "Netlify refused the workspace's token. An owner needs to reconnect Netlify.",
    });
  });

  it("refuses to publish when the workspace isn't connected", async () => {
    const response = await doPublish();
    expect(response.status).toBe(409);
    expect(await response.json()).toMatchObject({ reason: "not-connected" });
    expect((await state()).connected).toBe(false);
  });

  it("runs one publish at a time per project", async () => {
    await connect();
    const first = await doPublish();
    const second = await doPublish();
    expect(first.status).toBe(202);
    expect(second.status).toBe(409);
    expect(await second.json()).toMatchObject({ reason: "running" });
  });

  it("makes an earlier publish live again without changing the saved document", async () => {
    await connect();
    await doPublish();
    await publishesSettled();
    edit((doc) => {
      doc.nodes.hero_1.heading.content = "Druhá verze";
    });
    await doPublish();
    await publishesSettled();
    const [, first] = (await state()).publishes;
    publishId = first.id;
    const response = await restore(
      project().event(path(`publishes/${first.id}/restore`), project().owner, {
        method: "POST",
      }) as never,
    );
    expect(response.status).toBe(200);
    expect((await visit("/")).text).not.toContain("Druhá verze");
    const after = await state();
    expect(after.publishes.map((p: { live: boolean }) => p.live)).toEqual([false, true]);
    const saved = readSite(project().db, project().projectId)?.document as Doc;
    expect(saved.nodes.hero_1.heading.content).toBe("Druhá verze");
  });

  it("is only for members, and refuses cross-site requests", async () => {
    await connect();
    expect(await thrownBy(() => doPublish(null))).toMatchObject({ status: 401 });
    expect(await thrownBy(() => doPublish(project().outsider))).toMatchObject({ status: 404 });
    expect(await thrownBy(() => state(project().outsider))).toMatchObject({ status: 404 });
    const url = new URL(`https://admin.example.cz${path("publish")}`);
    const foreign = new Request(url, {
      method: "POST",
      headers: { origin: "https://evil.example" },
    });
    expect(isForeignApiWrite(foreign, url)).toBe(true);
  });
});
