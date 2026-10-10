// Custom domains and deleting websites on Webmio hosting (own-hosting design.md decision 7),
// with the folder fake standing in for AWS and DNS answers made up per test.
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { eq } from "drizzle-orm";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { projectHosting } from "$lib/server/db/schema";
import { dns, probe } from "$lib/server/publishing/domains";
import { publishesSettled, startPublish } from "$lib/server/publishing/publish";
import { type FakeHosting, fakeHosting, serveFake } from "$lib/server/publishing/webmio-fake";
import { useTestProject } from "$lib/server/test-project";
import { POST as restore } from "../workspaces/[workspace]/deleted/[project]/restore/+server";
import { DELETE as remove } from "./[project]/+server";
import { PUT as connect, DELETE as disconnect } from "./[project]/domain/+server";
import { POST as check } from "./[project]/domain/check/+server";
import { GET as history } from "./[project]/publishes/+server";

let folder: string;
let hosting: FakeHosting;
let cnames: Record<string, string[]>;
const original = { ...dns };
const originalProbe = { ...probe };
const project = useTestProject(() => ({
  project: project().projectId,
  workspace: project().workspaceId,
}));

beforeEach(() => {
  folder = mkdtempSync(join(tmpdir(), "webmio-domains-"));
  process.env.WEBMIO_HOSTING_FAKE_DIR = folder;
  hosting = fakeHosting(folder);
  cnames = {};
  dns.resolveCname = (async (name: string) => cnames[name] ?? []) as typeof dns.resolveCname;
  dns.resolve4 = (async () => []) as typeof dns.resolve4;
  dns.resolve6 = (async () => []) as typeof dns.resolve6;
  probe.fetch = async () => {
    throw new Error("No redirect server in this test");
  };
});
afterEach(async () => {
  Object.assign(dns, original);
  Object.assign(probe, originalProbe);
  delete process.env.WEBMIO_REDIRECT_ADDRESS;
  await publishesSettled();
  delete process.env.WEBMIO_HOSTING_FAKE_DIR;
  rmSync(folder, { recursive: true, force: true });
});

const path = (suffix: string) => `/api/projects/${project().projectId}/${suffix}`;

async function publish() {
  const { db, projectId, owner } = project();
  expect(startPublish(db, projectId, owner.id)).toMatchObject({ ok: true });
  await publishesSettled();
}

/** A route's answer, returned or thrown (`error()` throws). */
async function answer(run: () => unknown): Promise<{ status: number; body: unknown }> {
  try {
    const response = (await run()) as Response;
    const text = await response.text();
    return { status: response.status, body: text ? JSON.parse(text) : null };
  } catch (thrown) {
    const { status, body } = thrown as { status: number; body: unknown };
    if (typeof status !== "number") throw thrown;
    return { status, body };
  }
}

const put = (domain: string) =>
  answer(() =>
    connect(
      project().event(path("domain"), project().owner, {
        method: "PUT",
        body: JSON.stringify({ domain }),
      }) as never,
    ),
  );
const checkNow = async () =>
  (
    (await answer(() =>
      check(project().event(path("domain/check"), project().owner, { method: "POST" }) as never),
    )) as { body: { state: string } }
  ).body.state;
const state = async () =>
  (await history(project().event(path("publishes"), project().owner) as never)).json();

async function visit(uri: string, host = "pekarna-u-lipy.webmio.site") {
  const response = await serveFake(folder, { host, uri });
  return { status: response.status, location: response.headers.location };
}

describe("custom domains on Webmio hosting", () => {
  it("Connect a bare domain: a CNAME for www to the website's own target, and forwarding", async () => {
    await publish();
    expect((await put("pekarna.cz")).status).toBe(200);
    expect(await state()).toMatchObject({
      domain: "pekarna.cz",
      domainState: "waiting-for-dns",
      dnsRecords: [
        { type: "CNAME", name: "www.pekarna.cz", value: "pekarna-u-lipy.sites.webmio.net" },
      ],
      forwardTo: "https://www.pekarna.cz",
    });
    expect(hosting.tenants()).toEqual([
      expect.objectContaining({ domain: "www.pekarna.cz", enabled: true }),
    ]);
  });

  it("Connect a subdomain: a CNAME for the subdomain itself, nothing to forward", async () => {
    await publish();
    await put("web.anideti.cz");
    expect(await state()).toMatchObject({
      dnsRecords: [
        { type: "CNAME", name: "web.anideti.cz", value: "pekarna-u-lipy.sites.webmio.net" },
      ],
      forwardTo: null,
    });
  });

  it("Domain becomes ready: the address, the sitemap and the free address follow", async () => {
    await publish();
    await put("pekarna.cz");
    expect(await checkNow()).toBe("waiting-for-dns");
    cnames["www.pekarna.cz"] = ["pekarna-u-lipy.sites.webmio.net."];
    expect(await checkNow()).toBe("issuing-certificate");
    hosting.setCertificate("www.pekarna.cz", "issued");
    expect(await checkNow()).toBe("ready");
    expect((await state()).address).toBe("https://www.pekarna.cz");
    expect(await visit("/menu/")).toEqual({
      status: 301,
      location: "https://www.pekarna.cz/menu/",
    });
    expect((await visit("/", "www.pekarna.cz")).status).toBe(200);

    await publish();
    const { publishes } = await state();
    expect(publishes[0].url).toBe("https://www.pekarna.cz");
    const sitemap = await serveFake(folder, { host: "www.pekarna.cz", uri: "/sitemap.xml" });
    expect(new TextDecoder().decode(sitemap.body)).toContain("<loc>https://www.pekarna.cz/</loc>");
  });

  it("connects before DNS is set, and creates the domain's tenant once DNS leads to it", async () => {
    await publish();
    hosting.setPointing("www.pekarna.cz", false);
    expect((await put("pekarna.cz")).status).toBe(200);
    expect(hosting.tenants()).toEqual([]);
    expect(await state()).toMatchObject({ domainState: "waiting-for-dns" });
    expect(await checkNow()).toBe("waiting-for-dns");
    expect(hosting.tenants()).toEqual([]);

    cnames["www.pekarna.cz"] = ["pekarna-u-lipy.sites.webmio.net"];
    hosting.setPointing("www.pekarna.cz", true);
    expect(await checkNow()).toBe("issuing-certificate");
    expect(hosting.tenants()).toEqual([
      expect.objectContaining({ domain: "www.pekarna.cz", enabled: true }),
    ]);
    hosting.setCertificate("www.pekarna.cz", "issued");
    expect(await checkNow()).toBe("ready");
  });

  it("Domain used elsewhere, found once DNS leads to Webmio: the check says so", async () => {
    await publish();
    hosting.setPointing("www.jinde.cz", false);
    await put("jinde.cz");
    hosting.setPointing("www.jinde.cz", true);
    hosting.holdElsewhere("www.jinde.cz");
    cnames["www.jinde.cz"] = ["pekarna-u-lipy.sites.webmio.net"];
    const response = await answer(() =>
      check(project().event(path("domain/check"), project().owner, { method: "POST" }) as never),
    );
    expect(response.status).toBe(502);
    expect((response.body as { message: string }).message).toContain(
      "www.jinde.cz is connected to another service",
    );
  });

  it("Pointing at another website's target: still waiting for DNS", async () => {
    await publish();
    await put("pekarna.cz");
    cnames["www.pekarna.cz"] = ["jina-pekarna.sites.webmio.net"];
    hosting.setCertificate("www.pekarna.cz", "issued");
    expect(await checkNow()).toBe("waiting-for-dns");
    expect((await state()).dnsRecords[0].value).toBe("pekarna-u-lipy.sites.webmio.net");
  });

  it("asks for a new certificate when the last request failed", async () => {
    await publish();
    await put("pekarna.cz");
    cnames["www.pekarna.cz"] = ["pekarna-u-lipy.sites.webmio.net"];
    hosting.setCertificate("www.pekarna.cz", "failed");
    expect(await checkNow()).toBe("issuing-certificate");
  });

  it("Domain used elsewhere: refused with a message", async () => {
    await publish();
    hosting.holdElsewhere("www.jinde.cz");
    const response = await put("jinde.cz");
    expect(response.status).toBe(409);
    expect((response.body as { message: string }).message).toBe(
      "www.jinde.cz is connected to another service. Remove it there first, then connect it here.",
    );
    expect((await state()).domain).toBeNull();
  });

  it("Domain disconnected: the free address serves the website again", async () => {
    await publish();
    await put("pekarna.cz");
    cnames["www.pekarna.cz"] = ["pekarna-u-lipy.sites.webmio.net"];
    hosting.setCertificate("www.pekarna.cz", "issued");
    await checkNow();
    const response = await answer(() =>
      disconnect(project().event(path("domain"), project().owner, { method: "DELETE" }) as never),
    );
    expect(response.status).toBe(204);
    expect((await visit("/")).status).toBe(200);
    expect((await visit("/", "www.pekarna.cz")).status).toBe(404);
    expect(hosting.tenants()).toEqual([]);
    expect((await state()).address).toBe("https://pekarna-u-lipy.webmio.site");
  });
});

describe("bare domains with the redirect server", () => {
  const address = "203.0.113.7";
  let a: Record<string, string[]>;
  let aaaa: Record<string, string[]>;
  let probes: { url: string; redirect: RequestRedirect | undefined }[];
  let redirectServer: (url: string) => Promise<Response>;

  beforeEach(() => {
    process.env.WEBMIO_REDIRECT_ADDRESS = address;
    a = {};
    aaaa = {};
    probes = [];
    dns.resolve4 = (async (name: string) => a[name] ?? []) as typeof dns.resolve4;
    dns.resolve6 = (async (name: string) => aaaa[name] ?? []) as typeof dns.resolve6;
    // The redirect server as it answers once it has the domain's certificate.
    redirectServer = async (url) =>
      new Response(null, {
        status: 301,
        headers: { location: url.replace("https://", "https://www.") },
      });
    probe.fetch = async (url, init) => {
      probes.push({ url, redirect: init.redirect });
      return redirectServer(url);
    };
  });

  const apexState = async () => (await state()).apexState;

  it("Connect a bare domain: the CNAME for www and an A record for the redirect server", async () => {
    await publish();
    await put("pekarna.cz");
    expect(await state()).toMatchObject({
      domainState: "waiting-for-dns",
      apexState: "waiting-for-dns",
      dnsRecords: [
        { type: "CNAME", name: "www.pekarna.cz", value: "pekarna-u-lipy.sites.webmio.net" },
        { type: "A", name: "pekarna.cz", value: address },
      ],
      forwardTo: null,
    });
  });

  it("Bare domain redirecting: its own address only, and https:// sends visitors to www.", async () => {
    await publish();
    await put("pekarna.cz");
    a["pekarna.cz"] = [address];
    expect(await checkNow()).toBe("waiting-for-dns");
    expect(probes).toEqual([{ url: "https://pekarna.cz/", redirect: "manual" }]);
    expect(await apexState()).toBe("redirecting");
  });

  it("Bare domain with a leftover record: an A or AAAA record besides the server's", async () => {
    await publish();
    await put("pekarna.cz");
    a["pekarna.cz"] = [address, "62.109.151.80"];
    await checkNow();
    expect(await apexState()).toBe("waiting-for-dns");
    a["pekarna.cz"] = [address];
    aaaa["pekarna.cz"] = ["2a01:5e0::1"];
    await checkNow();
    expect(await apexState()).toBe("waiting-for-dns");
    expect(probes).toEqual([]);
  });

  it("issuing the certificate while the redirect server fails the handshake or doesn't answer in time", async () => {
    await publish();
    await put("pekarna.cz");
    a["pekarna.cz"] = [address];
    redirectServer = async () => {
      throw new TypeError("fetch failed");
    };
    await checkNow();
    expect(await apexState()).toBe("issuing-certificate");
    redirectServer = async () => {
      throw new DOMException("The operation was aborted due to timeout", "TimeoutError");
    };
    await checkNow();
    expect(await apexState()).toBe("issuing-certificate");
    redirectServer = async () => new Response("<h1>Parked</h1>", { status: 200 });
    await checkNow();
    expect(await apexState()).toBe("issuing-certificate");
  });

  it("Bare domain still forwarded at the registrar: the website is ready at www. regardless", async () => {
    await publish();
    await put("pekarna.cz");
    cnames["www.pekarna.cz"] = ["pekarna-u-lipy.sites.webmio.net"];
    hosting.setCertificate("www.pekarna.cz", "issued");
    a["pekarna.cz"] = ["62.109.151.80"];
    expect(await checkNow()).toBe("ready");
    expect(await state()).toMatchObject({
      address: "https://www.pekarna.cz",
      apexState: "waiting-for-dns",
    });
    expect(await visit("/menu/")).toEqual({
      status: 301,
      location: "https://www.pekarna.cz/menu/",
    });
  });

  it("Connect a subdomain: no A record and no state of its own", async () => {
    await publish();
    await put("web.anideti.cz");
    a["web.anideti.cz"] = [address];
    await checkNow();
    expect(await state()).toMatchObject({
      dnsRecords: [
        { type: "CNAME", name: "web.anideti.cz", value: "pekarna-u-lipy.sites.webmio.net" },
      ],
      apexState: null,
    });
    expect(probes).toEqual([]);
  });

  it("forgets the bare domain's state when the domain is disconnected", async () => {
    await publish();
    await put("pekarna.cz");
    a["pekarna.cz"] = [address];
    await checkNow();
    await answer(() =>
      disconnect(project().event(path("domain"), project().owner, { method: "DELETE" }) as never),
    );
    expect(await state()).toMatchObject({ domain: null, apexState: null, dnsRecords: [] });
  });
});

describe("deleting a website on Webmio hosting", () => {
  const deleteIt = () =>
    answer(() =>
      remove(
        project().event(`/api/projects/${project().projectId}`, project().owner, {
          method: "DELETE",
          body: JSON.stringify({ name: "Pekárna U Lípy" }),
        }) as never,
      ),
    );

  it("Offline at once on Webmio hosting: addresses answer No website here, the domain is free", async () => {
    await publish();
    await put("pekarnaulipy.cz");
    expect((await deleteIt()).status).toBe(204);
    expect((await visit("/")).status).toBe(404);
    expect((await visit("/", "www.pekarnaulipy.cz")).status).toBe(404);
    expect(hosting.keys()).toEqual({});
    expect(hosting.tenants()).toEqual([]);
    expect(hosting.objectKeys("sites/")).toEqual([]);
    const { db } = project();
    expect(
      db.select().from(projectHosting).where(eq(projectHosting.domain, "pekarnaulipy.cz")).all(),
    ).toEqual([]);
  });

  it("takes over the domain's tenant while CloudFront is still deleting it", async () => {
    await publish();
    hosting.setSlowTenantDeletion(true);
    await put("pekarnaulipy.cz");
    await deleteIt();
    expect(hosting.tenants()).toEqual([expect.objectContaining({ enabled: false })]);
    await answer(() =>
      restore(
        project().event(
          `/api/workspaces/${project().workspaceId}/deleted/${project().projectId}/restore`,
          project().owner,
          { method: "POST" },
        ) as never,
      ),
    );
    await publish();
    expect((await put("pekarnaulipy.cz")).status).toBe(200);
    expect(hosting.tenants()).toEqual([expect.objectContaining({ enabled: true })]);
  });

  it("Webmio hosting down: the website isn't deleted and stays online", async () => {
    await publish();
    hosting.setUnreachable(true);
    const response = await deleteIt();
    expect(response.status).toBe(502);
    expect((response.body as { message: string }).message).toBe(
      "The hosting service couldn't be reached.",
    );
    hosting.setUnreachable(false);
    expect((await visit("/")).status).toBe(200);
  });

  it("Publish after restoring: a new website on Webmio hosting", async () => {
    await publish();
    const before = project()
      .db.select()
      .from(projectHosting)
      .where(eq(projectHosting.projectId, project().projectId))
      .get();
    await deleteIt();
    await answer(() =>
      restore(
        project().event(
          `/api/workspaces/${project().workspaceId}/deleted/${project().projectId}/restore`,
          project().owner,
          { method: "POST" },
        ) as never,
      ),
    );
    await publish();
    const after = project()
      .db.select()
      .from(projectHosting)
      .where(eq(projectHosting.projectId, project().projectId))
      .get();
    expect(after?.provider).toBe("webmio");
    expect(after?.siteId).not.toBe(before?.siteId);
    expect(after?.defaultUrl).toBe("https://pekarna-u-lipy.webmio.site");
    expect((await visit("/")).status).toBe(200);
  });
});
