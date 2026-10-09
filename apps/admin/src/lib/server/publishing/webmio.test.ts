import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { exportSite } from "@webmio/export";
import { loadDemoMedia, loadDemoSite } from "@webmio/model/testing";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { HostedSite } from "./target";
import { webmioTarget } from "./webmio";
import { type FakeHosting, fakeHosting, serveFake } from "./webmio-fake";

let folder: string;
let hosting: FakeHosting;
let target: ReturnType<typeof webmioTarget>;

beforeEach(() => {
  folder = mkdtempSync(join(tmpdir(), "webmio-target-"));
  hosting = fakeHosting(folder);
  target = webmioTarget(hosting);
});

afterEach(() => {
  rmSync(folder, { recursive: true, force: true });
});

const encode = (text: string) => new TextEncoder().encode(text);
const decode = (bytes: Uint8Array) => new TextDecoder().decode(bytes);

function site(pages: Record<string, string>): Map<string, Uint8Array> {
  return new Map(Object.entries(pages).map(([path, text]) => [path, encode(text)]));
}

const first = site({
  "index.html": "<h1>Pekárna</h1>",
  "kontakt/index.html": "<h1>Kontakt</h1>",
  "assets/style.css": "h1{color:brown}",
  "404.html": "<h1>Nic tu není</h1>",
});

async function visit(uri: string, host = "pekarna-u-lipy.webmio.site") {
  const response = await serveFake(folder, { host, uri });
  return { ...response, text: decode(response.body) };
}

describe("createSite", () => {
  it("gives the website its free address", async () => {
    const created = await target.createSite("pekarna-u-lipy");
    expect(created).toEqual({
      siteId: expect.stringMatching(/^ws_/),
      siteName: "pekarna-u-lipy",
      defaultUrl: "https://pekarna-u-lipy.webmio.site",
    });
    expect(hosting.keys()).toEqual({ "h:pekarna-u-lipy.webmio.site": created.siteId });
  });

  it("refuses an address another website has", async () => {
    await target.createSite("pekarna-u-lipy");
    await expect(target.createSite("pekarna-u-lipy")).rejects.toMatchObject({
      kind: "name-taken",
    });
  });

  it("serves nothing until the first deploy", async () => {
    await target.createSite("pekarna-u-lipy");
    expect((await visit("/")).status).toBe(404);
  });
});

describe("deploy", () => {
  it("uploads the files with their types and makes the deploy live", async () => {
    const { siteId } = await target.createSite("pekarna-u-lipy");
    const { deployId } = await target.deploy(siteId, first);
    expect(hosting.keys()[`s:${siteId}`]).toBe(deployId);
    const page = await visit("/kontakt/");
    expect(page).toMatchObject({
      status: 200,
      text: "<h1>Kontakt</h1>",
      headers: {
        "content-type": "text/html; charset=utf-8",
        "cache-control": "public, max-age=0, must-revalidate",
      },
    });
    expect((await visit("/assets/style.css")).headers["content-type"]).toBe(
      "text/css; charset=utf-8",
    );
  });

  it("copies unchanged files from the live deploy and uploads only changed ones", async () => {
    const { siteId } = await target.createSite("pekarna-u-lipy");
    await target.deploy(siteId, first);
    const puts = vi.spyOn(hosting, "putObject");
    const copies = vi.spyOn(hosting, "copyObject");
    const second = new Map(first);
    second.set("index.html", encode("<h1>Pekárna U Lípy</h1>"));
    await target.deploy(siteId, second);
    const keys = puts.mock.calls.map(([key]) => key);
    const pages = keys.filter((key) => !key.endsWith(".manifest.json"));
    expect(pages.map((key) => key.split("/").slice(3).join("/"))).toEqual(["index.html"]);
    expect(keys.filter((key) => key.endsWith(".manifest.json"))).toHaveLength(1);
    expect(copies).toHaveBeenCalledTimes(3);
    expect((await visit("/")).text).toBe("<h1>Pekárna U Lípy</h1>");
    expect((await visit("/assets/style.css")).text).toBe("h1{color:brown}");
  });

  it("leaves no files and keeps the old deploy live when an upload fails", async () => {
    const { siteId } = await target.createSite("pekarna-u-lipy");
    const { deployId } = await target.deploy(siteId, first);
    const before = hosting.objectKeys();
    hosting.failUploads(/kontakt/);
    const changed = site({
      "index.html": "nové",
      "kontakt/index.html": "nový kontakt",
      "a.css": "a",
      "b.css": "b",
    });
    await expect(target.deploy(siteId, changed)).rejects.toMatchObject({ kind: "failed" });
    expect(hosting.objectKeys()).toEqual(before);
    expect(hosting.keys()[`s:${siteId}`]).toBe(deployId);
    expect((await visit("/")).text).toBe("<h1>Pekárna</h1>");
  });

  it("serves the publish's 404 page and redirects", async () => {
    const { siteId } = await target.createSite("pekarna-u-lipy");
    const files = new Map(first);
    files.set("_redirects", encode("/o-nas/ /kontakt/ 301\n"));
    await target.deploy(siteId, files);
    expect(await visit("/stara-stranka/")).toMatchObject({
      status: 404,
      text: "<h1>Nic tu není</h1>",
    });
    expect(await visit("/o-nas/")).toMatchObject({
      status: 301,
      headers: { location: "/kontakt/" },
    });
    expect((await visit("/_redirects")).status).toBe(404);
  });
});

describe("restore and prune", () => {
  it("makes an earlier deploy live again without uploading", async () => {
    const { siteId } = await target.createSite("pekarna-u-lipy");
    const { deployId: one } = await target.deploy(siteId, first);
    await target.deploy(siteId, site({ "index.html": "druhá" }));
    const puts = vi.spyOn(hosting, "putObject");
    await target.restore(siteId, one);
    expect(puts).not.toHaveBeenCalled();
    expect((await visit("/")).text).toBe("<h1>Pekárna</h1>");
  });

  it("deletes every deploy but the kept ones and the live one", async () => {
    const { siteId } = await target.createSite("pekarna-u-lipy");
    const ids = [];
    for (let i = 0; i < 4; i++) {
      ids.push((await target.deploy(siteId, site({ "index.html": `v${i}` }))).deployId);
    }
    await target.restore(siteId, ids[0] as string);
    await target.prune(siteId, [ids[2] as string, ids[3] as string]);
    const kept = new Set(hosting.objectKeys(`sites/${siteId}/`).map((key) => key.split("/")[2]));
    expect(kept).toEqual(
      new Set([
        ids[0],
        `${ids[0]}.manifest.json`,
        ids[2],
        `${ids[2]}.manifest.json`,
        ids[3],
        `${ids[3]}.manifest.json`,
      ]),
    );
    await expect(target.restore(siteId, ids[1] as string)).rejects.toMatchObject({
      kind: "failed",
    });
    expect((await visit("/")).text).toBe("v0");
  });

  it("switches redirects along with pages on rollback", async () => {
    const { siteId } = await target.createSite("pekarna-u-lipy");
    const withRedirect = new Map(first);
    withRedirect.set("_redirects", encode("/kontakt/ /napiste-nam/ 301\n"));
    withRedirect.delete("kontakt/index.html");
    const { deployId: one } = await target.deploy(siteId, withRedirect);
    expect((await visit("/kontakt/")).status).toBe(301);
    await target.deploy(siteId, first);
    expect((await visit("/kontakt/")).status).toBe(200);
    await target.restore(siteId, one);
    expect((await visit("/kontakt/")).headers.location).toBe("/napiste-nam/");
  });
});

describe("domains", () => {
  async function published(): Promise<HostedSite> {
    const created = await target.createSite("pekarna-u-lipy");
    await target.deploy(created.siteId, first);
    return { siteId: created.siteId, siteName: created.siteName, domain: null, domainRef: null };
  }

  it("serves a bare domain at www, through its own tenant", async () => {
    const hosted = await published();
    const tenantId = await target.connectDomain(hosted.siteId, "pekarna.cz", []);
    expect(hosting.tenants()).toEqual([
      expect.objectContaining({ id: tenantId, domain: "www.pekarna.cz", enabled: true }),
    ]);
    expect((await visit("/", "www.pekarna.cz")).text).toBe("<h1>Pekárna</h1>");
    expect(target.servedHost("pekarna.cz")).toBe("www.pekarna.cz");
    expect(target.servedHost("web.anideti.cz")).toBe("web.anideti.cz");
  });

  it("serves a subdomain as itself", async () => {
    const hosted = await published();
    await target.connectDomain(hosted.siteId, "web.anideti.cz", []);
    expect(hosting.tenants()[0]?.domain).toBe("web.anideti.cz");
  });

  it("refuses a domain another service holds", async () => {
    const hosted = await published();
    hosting.holdElsewhere("www.jinde.cz");
    await expect(target.connectDomain(hosted.siteId, "jinde.cz", [])).rejects.toMatchObject({
      kind: "domain-in-use",
    });
    expect(hosting.keys()["h:www.jinde.cz"]).toBeUndefined();
  });

  it("reports the certificate, and asks again after a failed request", async () => {
    const hosted = await published();
    const domainRef = (await target.connectDomain(hosted.siteId, "pekarna.cz", [])) ?? null;
    const withDomain = { ...hosted, domain: "pekarna.cz", domainRef };
    expect(await target.certificateIssued(hosted.siteId, withDomain)).toBe(false);
    hosting.setCertificate("www.pekarna.cz", "failed");
    const renew = vi.spyOn(hosting, "renewCertificate");
    expect(await target.certificateIssued(hosted.siteId, withDomain)).toBe(false);
    expect(renew).toHaveBeenCalledWith(domainRef);
    hosting.setCertificate("www.pekarna.cz", "issued");
    expect(await target.certificateIssued(hosted.siteId, withDomain)).toBe(true);
  });

  it("redirects the free address to the ready domain, and back when disconnected", async () => {
    const hosted = await published();
    const domainRef = (await target.connectDomain(hosted.siteId, "pekarna.cz", [])) ?? null;
    const withDomain = { ...hosted, domain: "pekarna.cz", domainRef };
    await target.setRedirectHost(withDomain, "www.pekarna.cz");
    expect(await visit("/menu/")).toMatchObject({
      status: 301,
      headers: { location: "https://www.pekarna.cz/menu/" },
    });
    expect((await visit("/menu/", "www.pekarna.cz")).status).not.toBe(301);
    await target.disconnectDomain(hosted.siteId, withDomain);
    await target.setRedirectHost(hosted, null);
    expect((await visit("/")).text).toBe("<h1>Pekárna</h1>");
    expect((await visit("/", "www.pekarna.cz")).status).toBe(404);
    expect(hosting.tenants()).toEqual([]);
  });

  it("deletes everything of a website, offline first", async () => {
    const hosted = await published();
    const domainRef = (await target.connectDomain(hosted.siteId, "pekarna.cz", [])) ?? null;
    await target.deleteSite(hosted.siteId, { ...hosted, domain: "pekarna.cz", domainRef });
    expect(hosting.keys()).toEqual({});
    expect(hosting.tenants()).toEqual([]);
    expect(hosting.objectKeys(`sites/${hosted.siteId}/`)).toEqual([]);
    expect((await visit("/")).status).toBe(404);
  });
});

describe("an exported site", () => {
  it("publishes, serves its pages, redirects and 404 page, and rolls back", async () => {
    const media = loadDemoMedia();
    media.set("hero.png-share.jpg", new Uint8Array([1]));
    const redirects = [{ from: "/stara-adresa/", to: "/" }];
    const exported = exportSite(loadDemoSite(), media, {
      siteUrl: "https://demo.webmio.site",
      redirects,
    });
    if (!exported.ok) throw new Error(JSON.stringify(exported.problems));
    const { siteId } = await target.createSite("demo");
    const { deployId: one } = await target.deploy(siteId, exported.files);

    const pages = [...exported.files.keys()].filter((path) => path.endsWith("index.html"));
    for (const path of pages) {
      const uri = `/${path.slice(0, -"index.html".length)}`;
      const page = await visit(uri, "demo.webmio.site");
      expect(page.status, uri).toBe(200);
      expect(page.text).toBe(decode(exported.files.get(path) as Uint8Array));
    }
    expect(await visit("/stara-adresa/", "demo.webmio.site")).toMatchObject({
      status: 301,
      headers: { location: "/" },
    });
    expect(await visit("/neni/", "demo.webmio.site")).toMatchObject({
      status: 404,
      text: decode(exported.files.get("404.html") as Uint8Array),
    });

    const changed = new Map(exported.files);
    changed.set("index.html", encode("<h1>Nová verze</h1>"));
    changed.delete("_redirects");
    await target.deploy(siteId, changed);
    expect((await visit("/", "demo.webmio.site")).text).toBe("<h1>Nová verze</h1>");
    expect((await visit("/stara-adresa/", "demo.webmio.site")).status).toBe(404);
    await target.restore(siteId, one);
    expect((await visit("/", "demo.webmio.site")).text).toBe(
      decode(exported.files.get("index.html") as Uint8Array),
    );
    expect((await visit("/stara-adresa/", "demo.webmio.site")).status).toBe(301);
  });
});
