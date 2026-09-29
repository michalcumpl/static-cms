import { describe, expect, it } from "vitest";
import { addMember, listWorkspaces } from "$lib/server/members";
import { readSite } from "$lib/server/site-documents";
import { defined, thrownBy, useTestProject } from "$lib/server/test-project";
import { load as listLoad } from "./+page.server";
import { actions as newActions, load as newLoad } from "./w/[workspace]/new/+page.server";

type ListEvent = Parameters<typeof listLoad>[0];
type NewEvent = Parameters<typeof newLoad>[0];

let workspace = "";
const project = useTestProject(() => ({ workspace }));

const create = defined(newActions.default);

function createEvent(name: string, user = project().owner) {
  workspace = project().workspaceId;
  const body = new FormData();
  body.set("name", name);
  return project().event(`/w/${workspace}/new`, user, {
    method: "POST",
    body,
  }) as unknown as Parameters<typeof create>[0];
}

describe("/ (projects)", () => {
  it("sends people who aren't signed in to sign-in", async () => {
    expect(
      await thrownBy(() => listLoad(project().event("/") as unknown as ListEvent)),
    ).toMatchObject({
      status: 303,
      location: "/signin?next=%2F",
    });
  });

  it("lists the member's own workspaces and projects", () => {
    const data = listLoad(project().event("/", project().owner) as unknown as ListEvent);
    expect(data).toMatchObject({
      user: project().owner,
      workspaces: [
        { name: "Pekárna U Lípy", role: "owner", projects: [{ name: "Pekárna U Lípy" }] },
      ],
    });
  });
});

describe("/w/[workspace]/new", () => {
  it("lets an owner create a project from the starter site and opens its editor", async () => {
    const thrown = await thrownBy(() => create(createEvent("Kadeřnictví Eva")));
    expect(thrown?.status).toBe(303);
    const projectId = /^\/p\/(p_[^/]+)\/edit\/$/.exec(thrown?.location ?? "")?.[1] ?? "";
    const site = readSite(project().db, projectId);
    expect(site?.problems).toEqual([]);
    const names = listWorkspaces(project().db, project().owner.id)[0]?.projects.map((p) => p.name);
    expect(names).toEqual(["Kadeřnictví Eva", "Pekárna U Lípy"]);
  });

  it("asks for a name", async () => {
    expect(await create(createEvent("  "))).toMatchObject({ status: 400, data: { missing: true } });
  });

  it("is only for owners", async () => {
    const { db, workspaceId, outsider } = project();
    addMember(db, workspaceId, outsider.id, "editor");
    expect(await thrownBy(() => create(createEvent("X", outsider)))).toMatchObject({ status: 403 });
    workspace = workspaceId;
    const event = project().event(`/w/${workspaceId}/new`, outsider) as unknown as NewEvent;
    expect(await thrownBy(() => newLoad(event))).toMatchObject({ status: 403 });
  });
});
