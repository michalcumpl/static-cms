import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { connectWorkspace } from "$lib/server/publishing/connection";
import { type FakeNetlify, startFakeNetlify } from "$lib/server/publishing/fake-netlify";
import { publishesSettled, siteNameFor } from "$lib/server/publishing/publish";
import { addLanguage, readSite, saveSite, setLanguagePublished } from "$lib/server/site-documents";
import { useTestProject } from "$lib/server/test-project";
import { GET as preview } from "../../p/[project]/preview/[...path]/+server";
import { GET as exportInput } from "./[project]/export-input/+server";
import { POST as publish } from "./[project]/publish/+server";
import { GET as history } from "./[project]/publishes/+server";

// biome-ignore lint/suspicious/noExplicitAny: tests edit nodes freely.
type Doc = { nodes: Record<string, any> };

const TOKEN = "nfp_languages_token";
let fake: FakeNetlify;
let previewPath = "";
const project = useTestProject(() => ({ path: previewPath }));

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
  if (!result.ok) throw new Error(result.message);
}

/** Adds English (published or not) with "Kontakt" translated as "Contact" at `contact`. */
function addEnglish(published: boolean, slug = "contact") {
  const { db, projectId, owner } = project();
  addLanguage(db, projectId, "en", owner.id);
  setLanguagePublished(db, projectId, "en", published);
  editEnglish((doc) => {
    doc.nodes.page_contact.title = "Contact";
    doc.nodes.page_contact.slug = slug;
  });
}

function editEnglish(change: (doc: Doc) => void) {
  const { db, projectId, owner } = project();
  const site = readSite(db, projectId, "en");
  if (!site) throw new Error("no English");
  const doc = structuredClone(site.document) as Doc;
  change(doc);
  const result = saveSite(db, projectId, owner.id, doc, site.version, "en");
  if (!result.ok) throw new Error("save failed");
}

const path = (suffix: string) => `/api/projects/${project().projectId}/${suffix}`;
async function publishNow() {
  const response = await publish(
    project().event(path("publish"), project().owner, { method: "POST" }) as never,
  );
  expect(response.status).toBe(202);
  await publishesSettled();
}
async function visit(pathname: string) {
  const response = await fetch(`${fake.url}/sites/${siteNameFor(project().projectId)}${pathname}`, {
    redirect: "manual",
  });
  return {
    status: response.status,
    text: await response.text(),
    location: response.headers.get("location"),
  };
}

describe("the preview", () => {
  it("shows a hidden language under en/", async () => {
    addEnglish(false);
    previewPath = "en/contact/";
    const response = await preview(
      project().event(`/p/${project().projectId}/preview/en/contact/`, project().owner) as never,
    );
    const html = await response.text();
    expect(html).toContain('<html lang="en">');
    expect(html).toContain("Contact");
  });
});

describe("publishing languages", () => {
  it("deploys Czech at / and published English at /en/, with alternates", async () => {
    await connect();
    addEnglish(true);
    await publishNow();
    const english = await visit("/en/contact/");
    expect(english.status).toBe(200);
    expect(english.text).toContain('<html lang="en">');
    const czech = await visit("/kontakt/");
    expect(czech.text).toMatch(
      /<link rel="alternate" hreflang="en" href="https:\/\/[^"]+\/en\/contact\/">/,
    );
    const result = await (
      await history(project().event(path("publishes"), project().owner) as never)
    ).json();
    expect(result.publishes[0].languages).toEqual(["cs", "en"]);
  });

  it("leaves a hidden language out", async () => {
    await connect();
    addEnglish(false);
    await publishNow();
    expect((await visit("/en/contact/")).status).toBe(404);
    expect((await visit("/kontakt/")).text).not.toContain('hreflang="en"');
  });

  it("redirects an English page's earlier address", async () => {
    await connect();
    addEnglish(true, "kontakt");
    await publishNow();
    editEnglish((doc) => {
      doc.nodes.page_contact.slug = "contact";
    });
    await publishNow();
    const old = await visit("/en/kontakt/");
    expect(old.status).toBe(301);
    expect(old.location).toBe("/en/contact/");
  });
});

describe("the ZIP download's input", () => {
  it("holds only published languages", async () => {
    addEnglish(false);
    const hidden = await (
      await exportInput(project().event(path("export-input"), project().owner) as never)
    ).json();
    expect(hidden.languages.map((l: { lang: string }) => l.lang)).toEqual(["cs"]);
    setLanguagePublished(project().db, project().projectId, "en", true);
    const published = await (
      await exportInput(project().event(path("export-input"), project().owner) as never)
    ).json();
    expect(published.languages.map((l: { lang: string }) => l.lang)).toEqual(["cs", "en"]);
    expect(published.mediaFiles).toEqual(["hero.png-320.webp"]);
    expect(published.fontFiles).toEqual([]);
  });

  it("names the primary's font files", async () => {
    const { db, projectId, owner } = project();
    const site = readSite(db, projectId);
    if (!site) throw new Error("no site");
    const doc = structuredClone(site.document) as Doc;
    doc.nodes.theme_1.font_heading = "lora";
    saveSite(db, projectId, owner.id, doc, site.version);
    addEnglish(true);
    const input = await (
      await exportInput(project().event(path("export-input"), project().owner) as never)
    ).json();
    expect(input.fontFiles).toEqual([
      "lora-OFL.txt",
      "lora-latin-ext-normal.woff2",
      "lora-latin-normal.woff2",
    ]);
  });
});
