import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { type FakeNetlify, startFakeNetlify } from "./fake-netlify";
import { listTeams, netlifyTarget } from "./netlify";

let fake: FakeNetlify;
beforeEach(async () => {
  fake = await startFakeNetlify();
  fake.addToken("good", [
    { slug: "anideti", name: "Aniděti" },
    { slug: "jana", name: "Personal" },
  ]);
});
afterEach(() => fake.close());

const target = () =>
  netlifyTarget({ token: "good", account: "anideti", apiUrl: fake.url, pollDelays: [10, 10, 10] });
const files = (entries: Record<string, string>) =>
  new Map(Object.entries(entries).map(([path, text]) => [path, new TextEncoder().encode(text)]));
const visit = async (siteName: string, path: string) => {
  const response = await fetch(`${fake.url}/sites/${siteName}${path}`, { redirect: "manual" });
  return {
    status: response.status,
    text: await response.text(),
    location: response.headers.get("location"),
  };
};

describe("listTeams", () => {
  it("lists the teams a token can publish into", async () => {
    expect(await listTeams({ token: "good", apiUrl: fake.url })).toEqual([
      { slug: "anideti", name: "Aniděti" },
      { slug: "jana", name: "Personal" },
    ]);
  });

  it("refuses an unknown token", async () => {
    await expect(listTeams({ token: "bad", apiUrl: fake.url })).rejects.toMatchObject({
      kind: "unauthorized",
    });
  });
});

describe("netlifyTarget", () => {
  it("creates a site in the team, with its netlify.app address", async () => {
    const site = await target().createSite("sc-p1");
    expect(site).toMatchObject({ siteName: "sc-p1", defaultUrl: "https://sc-p1.netlify.app" });
    expect(fake.sites.get(site.siteId)?.account).toBe("anideti");
    await expect(target().createSite("sc-p1")).rejects.toMatchObject({ kind: "name-taken" });
  });

  it("deploys, uploading only files Netlify lacks, and serves the live deploy", async () => {
    const { siteId } = await target().createSite("sc-p1");
    await target().deploy(
      siteId,
      files({ "index.html": "<h1>A</h1>", "kontakt/index.html": "<h1>K</h1>" }),
    );
    expect(fake.uploads).toEqual(["/index.html", "/kontakt/index.html"]);
    expect((await visit("sc-p1", "/")).text).toBe("<h1>A</h1>");

    fake.uploads.length = 0;
    await target().deploy(
      siteId,
      files({ "index.html": "<h1>B</h1>", "kontakt/index.html": "<h1>K</h1>" }),
    );
    expect(fake.uploads).toEqual(["/index.html"]);
    expect((await visit("sc-p1", "/")).text).toBe("<h1>B</h1>");
    expect((await visit("sc-p1", "/kontakt/")).text).toBe("<h1>K</h1>");
  });

  it("serves _redirects", async () => {
    const { siteId } = await target().createSite("sc-p1");
    await target().deploy(
      siteId,
      files({
        "index.html": "x",
        "napiste-nam/index.html": "y",
        _redirects: "/kontakt/ /napiste-nam/ 301\n",
      }),
    );
    expect(await visit("sc-p1", "/kontakt/")).toMatchObject({
      status: 301,
      location: "/napiste-nam/",
    });
  });

  it("makes an earlier deploy live again", async () => {
    const { siteId } = await target().createSite("sc-p1");
    const first = await target().deploy(siteId, files({ "index.html": "old" }));
    await target().deploy(siteId, files({ "index.html": "new" }));
    await target().restore(siteId, first.deployId);
    expect((await visit("sc-p1", "/")).text).toBe("old");
  });

  it("connects a domain, reports the certificate, and disconnects it", async () => {
    const { siteId } = await target().createSite("sc-p1");
    await target().connectDomain(siteId, "anideti.cz", ["www.anideti.cz"]);
    expect(fake.sites.get(siteId)).toMatchObject({
      customDomain: "anideti.cz",
      aliases: ["www.anideti.cz"],
    });
    expect(await target().certificateIssued(siteId)).toBe(false);
    fake.issueCertificate("sc-p1");
    expect(await target().certificateIssued(siteId)).toBe(true);
    await target().disconnectDomain(siteId);
    expect(fake.sites.get(siteId)).toMatchObject({ customDomain: null, aliases: [] });
    expect(await target().certificateIssued(siteId)).toBe(false);
  });

  it("deletes a site with its deploys, and takes an already deleted site as done", async () => {
    const { siteId } = await target().createSite("sc-p1");
    await target().deploy(siteId, files({ "index.html": "live" }));
    await target().deleteSite(siteId);
    expect(fake.sites.has(siteId)).toBe(false);
    expect((await visit("sc-p1", "/")).status).toBe(404);
    await expect(target().deleteSite(siteId)).resolves.toBeUndefined();
  });

  it("doesn't delete a site while Netlify is down or the token is refused", async () => {
    const { siteId } = await target().createSite("sc-p1");
    fake.setDown(true);
    await expect(target().deleteSite(siteId)).rejects.toMatchObject({ kind: "unreachable" });
    fake.setDown(false);
    const revoked = netlifyTarget({ token: "revoked", account: "anideti", apiUrl: fake.url });
    await expect(revoked.deleteSite(siteId)).rejects.toMatchObject({ kind: "unauthorized" });
    expect(fake.sites.has(siteId)).toBe(true);
  });

  it("reports an unreachable service and a refused token", async () => {
    const { siteId } = await target().createSite("sc-p1");
    fake.setDown(true);
    await expect(target().deploy(siteId, files({ "index.html": "x" }))).rejects.toMatchObject({
      kind: "unreachable",
      message: "The hosting service (Netlify) couldn't be reached.",
    });
    fake.setDown(false);
    const revoked = netlifyTarget({ token: "revoked", account: "anideti", apiUrl: fake.url });
    await expect(revoked.deploy(siteId, files({ "index.html": "x" }))).rejects.toMatchObject({
      kind: "unauthorized",
    });
  });
});

describe("the live website", () => {
  it("is fetched at its netlify.app address, which the fake serves", async () => {
    const { siteId } = await target().createSite("sc-p1");
    await target().deploy(siteId, files({ "index.html": "<h1>A</h1>" }));
    const response = await target().fetchLive?.("https://sc-p1.netlify.app/");
    expect(response?.status).toBe(200);
    expect(await response?.text()).toBe("<h1>A</h1>");
  });

  it("goes offline as a whole after a failed first publish", async () => {
    const { siteId } = await target().createSite("sc-p1");
    await target().deploy(siteId, files({ "index.html": "<h1>A</h1>" }));
    const site = { siteId, siteName: "sc-p1", domain: null, domainRef: null };
    expect(await target().takeOffline?.(siteId, site)).toEqual({ siteDeleted: true });
    expect(fake.sites.size).toBe(0);
    expect((await visit("sc-p1", "/")).status).toBe(404);
  });
});
