import { describe, expect, it } from "vitest";
import { memberships } from "$lib/server/db/schema";
import { finishSetup, readSetup } from "$lib/server/setup";
import { readSite, saveSite, versionCount } from "$lib/server/site-documents";
import { thrownBy, useTestProject } from "$lib/server/test-project";
import { load as projectsLoad } from "../../../+page.server";
import { actions as startActions } from "../../../w/[workspace]/setup/+page.server";
import { load as overviewLoad } from "../(panel)/+page.server";
import { actions, load } from "./[step]/+page.server";
import { GET as previewGET } from "./preview/[...path]/+server";

// The guided setup's routes (guided-setup spec, "Setup steps" and "Resuming a setup").

const project = useTestProject();
// The routes' form actions, as SvelteKit runs them.
const startDefault = startActions.default as (event: never) => Promise<unknown>;
const stepDefault = actions.default as (event: never) => Promise<unknown>;

type Who = { id: string; email: string };

/** A form posted to a route, as SvelteKit runs its action. */
function post(
  path: string,
  who: Who,
  fields: Record<string, string | string[]>,
  params: Record<string, string>,
) {
  const body = new FormData();
  for (const [name, value] of Object.entries(fields)) {
    for (const v of [value].flat()) body.append(name, v);
  }
  const event = project().event(path, who, { method: "POST", body });
  return { ...event, params } as never;
}

/** Step 1: the café's project, and its ID. */
async function startCafe(): Promise<string> {
  const { workspaceId, owner } = project();
  const thrown = await thrownBy(() =>
    startDefault(
      post(
        `/w/${workspaceId}/setup`,
        owner,
        { type: "cafe", name: "Kavárna U Mostu", sentence: "" },
        {
          workspace: workspaceId,
        },
      ),
    ),
  );
  expect(thrown?.status).toBe(303);
  const projectId = /\/p\/([^/]+)\/setup\/2$/.exec(thrown?.location ?? "")?.[1];
  if (!projectId) throw new Error(`no project: ${thrown?.location}`);
  return projectId;
}

async function step(
  projectId: string,
  n: number,
  fields: Record<string, string | string[]>,
  who?: Who,
) {
  return thrownBy(() =>
    stepDefault(
      post(`/p/${projectId}/setup/${n}`, who ?? project().owner, fields, {
        project: projectId,
        step: String(n),
      }),
    ),
  );
}

async function open(projectId: string, n: number, role: "owner" | "editor" = "owner") {
  const event = project().event(`/p/${projectId}/setup/${n}`, project().owner);
  return load({
    ...event,
    params: { project: projectId, step: String(n) },
    parent: async () => ({ project: { id: projectId, name: "" }, role }),
  } as never);
}

describe("the guided setup's routes", () => {
  it("makes the project at step 1, then saves each step and moves on", async () => {
    const { db } = project();
    const projectId = await startCafe();
    expect((await step(projectId, 2, { template: "standard" }))?.location).toBe(
      `/p/${projectId}/setup/3`,
    );
    expect(
      (
        await step(projectId, 3, {
          phone: "+420 777 123 456",
          email: "",
          street: "",
          postal_code: "",
          city: "Praha",
          "hours.mon.opens": "08:00",
          "hours.mon.closes": "18:00",
        })
      )?.location,
    ).toBe(`/p/${projectId}/setup/4`);
    expect(
      (
        await step(projectId, 4, {
          "services.0.name": "Káva",
          "services.0.description": "",
          "services.0.price": "",
        })
      )?.location,
    ).toBe(`/p/${projectId}/setup/5`);
    expect((await step(projectId, 5, {}))?.location).toBe(`/p/${projectId}/setup/6`);
    expect((await step(projectId, 6, { pages: ["services", "contact"] }))?.location).toBe(
      `/p/${projectId}/setup/7`,
    );
    expect(readSetup(db, projectId)).toMatchObject({
      step: 7,
      answers: {
        template: "standard",
        contact: { phone: "+420777123456", city: "Praha", hours: { mon: [["08:00", "18:00"]] } },
        services: [{ name: "Káva" }],
        pages: ["home", "services", "contact"],
      },
    });
  });

  it("A wrong answer: the step comes back with its message", async () => {
    const projectId = await startCafe();
    await step(projectId, 2, { template: "standard" });
    const result = (await stepDefault(
      post(
        `/p/${projectId}/setup/3`,
        project().owner,
        { phone: "12", "hours.mon.opens": "18:00", "hours.mon.closes": "09:00" },
        {
          project: projectId,
          step: "3",
        },
      ),
    )) as { status: number; data: { errors: Record<string, string> } };
    expect(result.status).toBe(400);
    expect(result.data.errors).toEqual({
      phone: "Enter the phone number with its country code, like +420 777 123 456.",
      "hours.mon": "Closing must come after opening.",
    });
  });

  it("leads to the step reached, and a finished setup to the Overview", async () => {
    const { db, owner } = project();
    const projectId = await startCafe();
    expect(await thrownBy(() => open(projectId, 5))).toMatchObject({
      status: 303,
      location: `/p/${projectId}/setup/2`,
    });
    expect(await open(projectId, 2)).toMatchObject({
      step: 2,
      total: 7,
      back: `/p/${projectId}/setup/1`,
    });
    expect(await thrownBy(() => open(projectId, 9))).toMatchObject({ status: 404 });
    finishSetup(db, projectId, owner.id);
    expect(await thrownBy(() => open(projectId, 2))).toMatchObject({
      status: 303,
      location: `/p/${projectId}/`,
    });
  });

  it("refuses members who aren't owners", async () => {
    const { db, workspaceId, outsider } = project();
    const projectId = await startCafe();
    db.insert(memberships)
      .values({ workspaceId, userId: outsider.id, role: "editor", createdAt: new Date() })
      .run();
    expect(await thrownBy(() => open(projectId, 2, "editor"))).toMatchObject({ status: 403 });
    expect(await step(projectId, 2, { template: "standard" }, outsider)).toMatchObject({
      status: 403,
    });
    expect(readSetup(db, projectId)?.answers.template).toBeUndefined();
  });
});

describe("coming back to a setup", () => {
  it("Coming back: the Overview leads owners to the next step; the projects page says so", async () => {
    const { owner } = project();
    const projectId = await startCafe();
    await step(projectId, 2, { template: "standard" });
    const overview = (role: "owner" | "editor") => {
      const event = project().event(`/p/${projectId}/`, owner);
      return overviewLoad({
        ...event,
        params: { project: projectId },
        parent: async () => ({ role }),
      } as never);
    };
    expect(await thrownBy(() => overview("owner"))).toMatchObject({
      status: 303,
      location: `/p/${projectId}/setup/3`,
    });
    // Editors can't set up; their Overview opens as usual.
    expect(await thrownBy(() => overview("editor"))).toBeUndefined();
    const projects = (await projectsLoad(project().event("/", owner) as never)) as {
      workspaces: { setups: Record<string, number> }[];
    };
    expect(projects.workspaces[0]?.setups).toEqual({ [projectId]: 3 });
  });
});

describe("the preview and finishing", () => {
  async function upToPreview() {
    const projectId = await startCafe();
    await step(projectId, 2, { template: "standard" });
    await step(projectId, 3, { phone: "", email: "", street: "", postal_code: "", city: "" });
    await step(projectId, 4, { "services.0.name": "Výběrová káva" });
    await step(projectId, 5, {});
    await step(projectId, 6, { pages: ["services", "contact"] });
    return projectId;
  }
  const versionsOf = (projectId: string) => versionCount(project().db, projectId);

  it("Preview without saving: the answers' site, and no new version", async () => {
    const projectId = await upToPreview();
    const before = versionsOf(projectId);
    const preview = (path: string) => {
      const event = project().event(`/p/${projectId}/setup/preview/${path}`, project().owner);
      return previewGET({ ...event, params: { project: projectId, path } } as never);
    };
    const home = await preview("");
    expect(home.status).toBe(200);
    expect(await home.text()).toContain("Kavárna U Mostu");
    const services = await (await preview("services")).text();
    expect(services).toContain("Výběrová káva");
    expect(versionsOf(projectId)).toBe(before);
  });

  it("says when finishing replaces the starter site the owner edited", async () => {
    const { db, owner } = project();
    const projectId = await upToPreview();
    expect(await open(projectId, 7)).toMatchObject({ edited: false });
    const site = readSite(db, projectId);
    saveSite(db, projectId, owner.id, site?.document, site?.version ?? "");
    expect(await open(projectId, 7)).toMatchObject({ edited: true });
  });

  it("Create my website: one new version, the setup closed, the Overview next", async () => {
    const { db } = project();
    const projectId = await upToPreview();
    const before = versionsOf(projectId);
    expect(await step(projectId, 7, {})).toMatchObject({
      status: 303,
      location: `/p/${projectId}/`,
    });
    expect(versionsOf(projectId)).toBe(before + 1);
    expect(readSetup(db, projectId)?.finished).toBe(true);
    const doc = readSite(db, projectId)?.document as {
      document_id: string;
      nodes: Record<string, { title?: string; pages?: { nodes: string[] } }>;
    };
    expect(doc.nodes[doc.document_id]?.pages?.nodes.map((id) => doc.nodes[id]?.title)).toEqual([
      "Home",
      "Services",
      "Contact",
    ]);
  });
});
