import { describe, expect, it } from "vitest";
import { thrownBy, useTestProject } from "$lib/server/test-project";
import { load as layoutLoad } from "./+layout.server";
import { load } from "./+page.server";

type LayoutEvent = Parameters<typeof layoutLoad>[0];
type PageEvent = Parameters<typeof load>[0];

const project = useTestProject();

describe("/p/[project] layout", () => {
  it("sends people who aren't signed in to sign-in, and back afterwards", async () => {
    const path = `/p/${project().projectId}/edit/`;
    expect(
      await thrownBy(() => layoutLoad(project().event(path) as unknown as LayoutEvent)),
    ).toMatchObject({
      status: 303,
      location: `/signin?next=${encodeURIComponent(path)}`,
    });
  });

  it("answers not found to non-members", async () => {
    const event = project().event(`/p/${project().projectId}/`, project().outsider);
    expect(await thrownBy(() => layoutLoad(event as unknown as LayoutEvent))).toMatchObject({
      status: 404,
    });
  });

  it("gives members the project, its workspace and their role", () => {
    const event = project().event(`/p/${project().projectId}/`, project().owner);
    expect(layoutLoad(event as unknown as LayoutEvent)).toMatchObject({
      project: { id: project().projectId, name: "Pekárna U Lípy" },
      workspace: { name: "Pekárna U Lípy" },
      role: "owner",
    });
  });
});

describe("/p/[project] overview", () => {
  it("validates the saved site and lists its preview pages", async () => {
    const { projectId, owner } = project();
    const event = { ...project().event(`/p/${projectId}/`, owner), parent: async () => ({}) };
    const data = await load(event as unknown as PageEvent);
    expect(data).toMatchObject({ valid: true, problems: [], imageFiles: ["hero.png-320.webp"] });
    expect(data?.pages).toEqual([
      { id: "page_home", path: "index.html", url: `/p/${projectId}/preview/` },
      { id: "page_contact", path: "kontakt/index.html", url: `/p/${projectId}/preview/kontakt/` },
    ]);
  });
});
