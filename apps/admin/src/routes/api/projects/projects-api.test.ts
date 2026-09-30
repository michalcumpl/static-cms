import { describe, expect, it } from "vitest";
import { thrownBy, useTestProject } from "$lib/server/test-project";
import { GET as getSite, PUT as putSite } from "./[project]/site/+server";

type SiteEvent = Parameters<typeof putSite>[0];

const project = useTestProject();

const site = () => `/api/projects/${project().projectId}/site`;
const get = (user = project().owner) =>
  getSite(project().event(site(), user) as unknown as SiteEvent);
// `null` means not signed in (`undefined` would pick the default, the owner).
const put = (body: unknown, user: { id: string; email: string } | null = project().owner) =>
  putSite(
    project().event(site(), user ?? undefined, {
      method: "PUT",
      body: typeof body === "string" ? body : JSON.stringify(body),
    }) as unknown as SiteEvent,
  );
const read = async () => (await get()).json();

describe("GET /api/projects/[project]/site", () => {
  it("returns the document, its version and its problems to members", async () => {
    const response = await get();
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({
      document: { document_id: "site_1" },
      problems: [],
    });
  });

  it("answers 401 without a session and 404 to non-members", async () => {
    expect(
      await thrownBy(() => getSite(project().event(site()) as unknown as SiteEvent)),
    ).toMatchObject({
      status: 401,
    });
    expect(await thrownBy(() => get(project().outsider))).toMatchObject({ status: 404 });
  });
});

describe("PUT /api/projects/[project]/site", () => {
  it("saves and returns the new version and problems", async () => {
    const { document, version } = await read();
    document.nodes.sub_about.content.content = "";
    const response = await put({ document, baseVersion: version });
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.version).not.toBe(version);
    expect(body.problems.map((p: { code: string }) => p.code)).toEqual(["empty-heading"]);
  });

  it("answers 409 for an outdated base version", async () => {
    const { document, version } = await read();
    await put({ document, baseVersion: version });
    const response = await put({ document, baseVersion: version });
    expect(response.status).toBe(409);
    expect((await response.json()).message).toMatch(/changed elsewhere/);
  });

  it("answers 422 with the structural problems", async () => {
    const { document, version } = await read();
    document.nodes.page_home.blocks.nodes.push("services_9");
    const response = await put({ document, baseVersion: version });
    expect(response.status).toBe(422);
    expect((await response.json()).problems).toEqual([
      expect.objectContaining({ code: "missing-reference", category: "structure" }),
    ]);
  });

  it.each(["not json", { document: {} }, { baseVersion: "v" }, null])(
    "answers 400 for %j",
    async (body) => {
      expect(await thrownBy(() => put(body))).toMatchObject({ status: 400 });
    },
  );

  it("answers 401 without a session and 404 to non-members, changing nothing", async () => {
    const { document, version } = await read();
    expect(await thrownBy(() => put({ document, baseVersion: version }, null))).toMatchObject({
      status: 401,
    });
    expect(
      await thrownBy(() => put({ document, baseVersion: version }, project().outsider)),
    ).toMatchObject({
      status: 404,
    });
    expect((await read()).version).toBe(version);
  });
});
