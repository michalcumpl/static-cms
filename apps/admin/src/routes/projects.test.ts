import { describe, expect, it } from "vitest";
import { importsSettled } from "$lib/server/import/job";
import { addMember, listWorkspaces } from "$lib/server/members";
import { readSite } from "$lib/server/site-documents";
import { defined, thrownBy, useTestProject } from "$lib/server/test-project";
import { load as listLoad } from "./+page.server";
import { actions as newActions, load as newLoad } from "./w/[workspace]/new/+page.server";

type ListEvent = Parameters<typeof listLoad>[0];
type NewEvent = Parameters<typeof newLoad>[0];

let workspace = "";
const project = useTestProject(() => ({ workspace }));

const create = defined(newActions.empty);

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
    // A new site only lacks a description, which the owner adds while editing.
    expect(site?.problems.map((p) => p.code)).toEqual(["no-description"]);
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

describe("/w/[workspace]/new: start from your current website (site-import)", () => {
  const start = defined(newActions.import);
  function importEvent(fields: Record<string, string>, user = project().owner) {
    workspace = project().workspaceId;
    const body = new FormData();
    for (const [key, value] of Object.entries(fields)) body.set(key, value);
    return project().event(`/w/${workspace}/new`, user, {
      method: "POST",
      body,
    }) as unknown as Parameters<typeof start>[0];
  }

  it("No confirmation: says so, keeping the address", async () => {
    expect(await start(importEvent({ address: "pekarna-ulipy.cz" }))).toMatchObject({
      status: 400,
      data: {
        address: "pekarna-ulipy.cz",
        importError: "Confirm that you may use this website's content.",
      },
    });
  });

  it("Not a web address: refused", async () => {
    expect(
      await start(importEvent({ address: "http://192.168.1.10/", confirm: "on" })),
    ).toMatchObject({
      status: 400,
      data: { importError: "Only public web addresses can be imported, such as pekarna.cz." },
    });
  });

  it("starts the import and shows its progress", async () => {
    const thrown = await thrownBy(() =>
      start(importEvent({ address: "pekarna-ulipy.cz", confirm: "on" })),
    );
    expect(thrown?.status).toBe(303);
    expect(thrown?.location).toMatch(new RegExp(`^/w/${project().workspaceId}/imports/im_`));
    await importsSettled();
  });

  it("is only for owners", async () => {
    const { db, workspaceId, outsider } = project();
    addMember(db, workspaceId, outsider.id, "editor");
    const event = importEvent({ address: "pekarna-ulipy.cz", confirm: "on" }, outsider);
    expect(await thrownBy(() => start(event))).toMatchObject({ status: 403 });
  });
});
