// What the redirect server asks before getting a bare domain's certificate
// (bare-domain-redirect design.md decision 4).
import { describe, expect, it } from "vitest";
import { projectHosting } from "$lib/server/db/schema";
import { demoSite } from "$lib/server/demo";
import { createProject } from "$lib/server/site-documents";
import { useTestProject } from "$lib/server/test-project";
import { GET } from "./+server";

const project = useTestProject();

const ask = async (query: string) => {
  const response = (await GET({
    url: new URL(`https://app.webmio.eu/hosting/bare-domain${query}`),
  } as Parameters<typeof GET>[0])) as Response;
  return { status: response.status, cacheControl: response.headers.get("cache-control") };
};

function host(
  domain: string,
  provider: "webmio" | "netlify" = "webmio",
  domainState: "waiting-for-dns" | "ready" = "waiting-for-dns",
) {
  const { db, workspaceId } = project();
  const projectId = createProject(db, workspaceId, domain, demoSite());
  db.insert(projectHosting)
    .values({
      projectId,
      provider,
      accountSlug: provider === "webmio" ? "webmio" : "pekarna",
      siteId: `site-${domain}`,
      siteName: domain.replace(/\./g, "-"),
      defaultUrl: `https://${domain.replace(/\./g, "-")}.webmio.site`,
      domain,
      domainState,
    })
    .run();
}

describe("GET /hosting/bare-domain", () => {
  it("allows a bare domain connected on Webmio hosting, in any state, without a session", async () => {
    host("pekarna.cz");
    host("kavarna.cz", "webmio", "ready");
    expect(await ask("?domain=pekarna.cz")).toEqual({ status: 200, cacheControl: "no-store" });
    expect((await ask("?domain=kavarna.cz")).status).toBe(200);
  });

  it("reads the domain as connecting does: any case, a trailing dot", async () => {
    host("pekarna.cz");
    expect((await ask("?domain=PEKARNA.cz.")).status).toBe(200);
  });

  it("refuses an unknown domain, a subdomain, a Netlify website's domain and no domain", async () => {
    host("web.anideti.cz");
    host("anideti.cz", "netlify");
    expect((await ask("?domain=cizi-domena.cz")).status).toBe(404);
    expect((await ask("?domain=web.anideti.cz")).status).toBe(404);
    expect((await ask("?domain=anideti.cz")).status).toBe(404);
    expect((await ask("")).status).toBe(404);
    expect((await ask("?domain=")).status).toBe(404);
  });
});
