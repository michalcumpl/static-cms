import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { connectWorkspace } from "$lib/server/publishing/connection";
import { dns, normalizeDomain } from "$lib/server/publishing/domains";
import { type FakeNetlify, startFakeNetlify } from "$lib/server/publishing/fake-netlify";
import { publishesSettled, siteNameFor, startPublish } from "$lib/server/publishing/publish";
import { createProject, readSite } from "$lib/server/site-documents";
import { inCzech, useTestProject } from "$lib/server/test-project";
import { PUT as connect, DELETE as disconnect } from "./[project]/domain/+server";
import { POST as check } from "./[project]/domain/check/+server";
import { GET as history } from "./[project]/publishes/+server";

const TOKEN = "nfp_domain_token";
let fake: FakeNetlify;
let dnsAnswers: { a: Record<string, string[]>; cname: Record<string, string[]> };
const original = { ...dns };
// Routes read the project from their parameters; a test can point them at another project.
let routeProject = "";
const project = useTestProject(
  (): Record<string, string> => (routeProject ? { project: routeProject } : {}),
);

beforeEach(async () => {
  fake = await startFakeNetlify();
  fake.addToken(TOKEN, [{ slug: "anideti", name: "Aniděti" }]);
  process.env.NETLIFY_API_URL = fake.url;
  process.env.SECRET_KEY = "k".repeat(40);
  dnsAnswers = { a: {}, cname: {} };
  dns.resolve4 = (async (name: string) => dnsAnswers.a[name] ?? []) as typeof dns.resolve4;
  dns.resolveCname = (async (name: string) =>
    dnsAnswers.cname[name] ?? []) as typeof dns.resolveCname;
});
afterEach(async () => {
  Object.assign(dns, original);
  await publishesSettled();
  delete process.env.NETLIFY_API_URL;
  delete process.env.SECRET_KEY;
  await fake.close();
});

async function published(projectId = project().projectId) {
  const { db, workspaceId, owner } = project();
  await connectWorkspace(db, workspaceId, owner.id, { token: TOKEN, account: "anideti" });
  const result = startPublish(db, projectId, owner.id);
  if (!result.ok) throw new Error(JSON.stringify(result));
  await publishesSettled();
}
const path = (suffix: string, projectId = project().projectId) =>
  `/api/projects/${projectId}/${suffix}`;
const put = (domain: string, projectId = project().projectId) => {
  routeProject = projectId === project().projectId ? "" : projectId;
  return connect(
    project().event(path("domain", projectId), project().owner, {
      method: "PUT",
      body: JSON.stringify({ domain }),
    }) as never,
  );
};
const state = async () =>
  (await history(project().event(path("publishes"), project().owner) as never)).json();
const checkNow = async () =>
  (
    await (
      await check(
        project().event(path("domain/check"), project().owner, { method: "POST" }) as never,
      )
    ).json()
  ).state;

describe("normalizeDomain", () => {
  it("accepts domain names and refuses addresses", () => {
    expect(normalizeDomain(" Anideti.CZ. ")).toBe("anideti.cz");
    expect(normalizeDomain("web.anideti.cz")).toBe("web.anideti.cz");
    for (const bad of ["https://anideti.cz/kontakt", "anideti", "anideti .cz", "-a.cz"]) {
      expect(normalizeDomain(bad), bad).toBeUndefined();
    }
  });
});

describe("custom domains", () => {
  it("connects a bare domain with www, and shows the DNS records to set", async () => {
    await published();
    expect((await put("anideti.cz")).status).toBe(200);
    const site = siteNameFor(project().projectId);
    const result = await state();
    expect(result).toMatchObject({ domain: "anideti.cz", domainState: "waiting-for-dns" });
    expect(result.dnsRecords).toEqual([
      { type: "A", name: "anideti.cz", value: "75.2.60.5" },
      { type: "CNAME", name: "www.anideti.cz", value: `${site}.netlify.app` },
    ]);
    expect([...fake.sites.values()][0]).toMatchObject({
      customDomain: "anideti.cz",
      aliases: ["www.anideti.cz"],
    });
  });

  it("becomes ready once DNS points at Netlify and the certificate is issued", async () => {
    await published();
    await put("anideti.cz");
    expect(await checkNow()).toBe("waiting-for-dns");
    dnsAnswers.a["anideti.cz"] = ["75.2.60.5"];
    expect(await checkNow()).toBe("issuing-certificate");
    fake.issueCertificate(siteNameFor(project().projectId));
    expect(await checkNow()).toBe("ready");
    expect((await state()).address).toBe("https://anideti.cz");
  });

  it("uses the domain for the sitemap and canonical links only once it is ready", async () => {
    await published();
    await put("web.anideti.cz");
    const site = siteNameFor(project().projectId);
    expect((await state()).address).toBe(`https://${site}.netlify.app`);
    dnsAnswers.cname["web.anideti.cz"] = [`${site}.netlify.app`];
    fake.issueCertificate(site);
    await checkNow();
    const { db, owner, projectId } = project();
    startPublish(db, projectId, owner.id);
    await publishesSettled();
    const home = await (await fetch(`${fake.url}/sites/${site}/`)).text();
    expect(home).toContain('<link rel="canonical" href="https://web.anideti.cz/">');
  });

  it("refuses something that isn't a domain name", async () => {
    await published();
    const response = await put("https://anideti.cz/kontakt");
    expect(response.status).toBe(400);
    expect((await response.json()).message).toMatch(/domain name only, such as anideti.cz/);
  });

  it("refuses something that isn't a domain name in the person's language", async () => {
    await published();
    const event = project().event(path("domain"), project().owner, {
      method: "PUT",
      body: JSON.stringify({ domain: "https://anideti.cz/kontakt" }),
    });
    const response = await connect(inCzech(event) as never);
    expect((await response.json()).message).toBe(
      "Zadejte jen název domény, například anideti.cz nebo web.anideti.cz.",
    );
  });

  it("refuses a domain connected to another project", async () => {
    await published();
    await put("anideti.cz");
    const { db, workspaceId, owner } = project();
    const other = createProject(db, workspaceId, "Druhý web");
    await published(other);
    expect(readSite(db, other)).toBeDefined();
    const response = await put("anideti.cz", other);
    routeProject = "";
    expect(response.status).toBe(409);
    expect(await response.json()).toMatchObject({ reason: "taken" });
    expect(owner).toBeDefined();
  });

  it("disconnects the domain", async () => {
    await published();
    await put("anideti.cz");
    const response = await disconnect(
      project().event(path("domain"), project().owner, { method: "DELETE" }) as never,
    );
    expect(response.status).toBe(204);
    expect(await state()).toMatchObject({ domain: null, domainState: null, dnsRecords: [] });
    expect([...fake.sites.values()][0]).toMatchObject({ customDomain: null });
  });
});
