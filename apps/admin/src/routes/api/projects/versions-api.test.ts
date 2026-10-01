import { eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";
import { siteDocuments, versions } from "$lib/server/db/schema";
import { newId } from "$lib/server/ids";
import { readSite, saveSite } from "$lib/server/site-documents";
import { thrownBy, useTestProject } from "$lib/server/test-project";
import { GET as list } from "./[project]/versions/+server";
import { POST as restore } from "./[project]/versions/[version]/restore/+server";

// biome-ignore lint/suspicious/noExplicitAny: tests edit nodes freely.
type Doc = { nodes: Record<string, any> };
type User = { id: string; email: string };

let version = "";
const project = useTestProject(() => ({ version }));
const base = () => `/api/projects/${project().projectId}`;

function saveHeading(heading: string) {
  const { db, projectId, owner } = project();
  const site = readSite(db, projectId);
  const doc = structuredClone(site?.document) as Doc;
  doc.nodes.hero_1.heading.content = heading;
  saveSite(db, projectId, owner.id, doc, site?.version ?? "");
  return readSite(db, projectId)?.versionId as string;
}
const getList = (query = "", user: User | null = project().owner) =>
  list(project().event(`${base()}/versions${query}`, user ?? undefined) as never);
function postRestore(id: string, body: unknown = {}, user: User | null = project().owner) {
  version = id;
  return restore(
    project().event(`${base()}/versions/${id}/restore`, user ?? undefined, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    }) as never,
  );
}

describe("GET versions", () => {
  it("lists the primary's versions, and pages with before", async () => {
    saveHeading("A");
    saveHeading("B");
    const all = await (await getList()).json();
    expect(all.versions).toHaveLength(3);
    expect(all.versions[0].current).toBe(true);
    const older = await (await getList(`?before=${all.versions[0].id}`)).json();
    expect(older.versions.map((v: { id: string }) => v.id)).toEqual(
      all.versions.slice(1).map((v: { id: string }) => v.id),
    );
  });

  it("answers 404 for a language the project doesn't have, and only to members", async () => {
    expect(await thrownBy(() => getList("?lang=de"))).toMatchObject({ status: 404 });
    expect(await thrownBy(() => getList("", null))).toMatchObject({ status: 401 });
    expect(await thrownBy(() => getList("", project().outsider))).toMatchObject({ status: 404 });
  });
});

describe("POST restore", () => {
  it("restores a version (200)", async () => {
    const versionA = saveHeading("A");
    saveHeading("B");
    const response = await postRestore(versionA);
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ lang: "cs" });
    const { db, projectId } = project();
    const current = readSite(db, projectId);
    if (!current) throw new Error("no site");
    expect((current.document as Doc).nodes.hero_1.heading.content).toBe("A");
  });

  it("answers 404 for an unknown version, 409 for a stale base, 422 for a broken one", async () => {
    const versionA = saveHeading("A");
    const stale = readSite(project().db, project().projectId)?.version;
    saveHeading("B");
    expect((await postRestore("v_nope")).status).toBe(404);
    expect((await postRestore(versionA, { baseVersion: stale })).status).toBe(409);

    const { db, projectId } = project();
    const docId = db
      .select({ id: siteDocuments.id })
      .from(siteDocuments)
      .where(eq(siteDocuments.projectId, projectId))
      .get()?.id as string;
    const broken = newId("v");
    db.insert(versions)
      .values({
        id: broken,
        documentId: docId,
        version: "x",
        document: { nodes: {} },
        createdAt: new Date(0),
      })
      .run();
    const response = await postRestore(broken);
    expect(response.status).toBe(422);
    expect((await response.json()).problems.length).toBeGreaterThan(0);
  });

  it("is only for members", async () => {
    const versionA = saveHeading("A");
    expect(await thrownBy(() => postRestore(versionA, {}, null))).toMatchObject({ status: 401 });
    expect(await thrownBy(() => postRestore(versionA, {}, project().outsider))).toMatchObject({
      status: 404,
    });
  });
});
