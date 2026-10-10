import { eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";
import { importRetries, imports } from "$lib/server/db/schema";
import { importsSettled } from "$lib/server/import/job";
import { addLanguage, readSite, saveSite } from "$lib/server/site-documents";
import { useTestProject } from "$lib/server/test-project";
import { actions, load } from "./+page.server";

// The import review's offers to import another language (import-languages).

const project = useTestProject();

/** The project as made by an import of a bakery whose English version is at `/en/`. */
function imported() {
  const { db, workspaceId, owner, projectId } = project();
  db.insert(imports)
    .values({
      id: "im_1",
      workspaceId,
      userId: owner.id,
      // On loopback, so the language import started below is refused before fetching anything.
      address: "http://127.0.0.1:9/",
      state: "done",
      projectId,
      report: {
        address: "http://127.0.0.1:9/",
        pages: [],
        images: 0,
        questions: 0,
        socialProfiles: 0,
        business: { name: false, phone: false, email: false, address: false, hours: false },
        leftOut: [{ reason: "language", detail: "http://127.0.0.1:9/en/", lang: "en" }],
      },
      retryState: {
        versionId: "",
        homeLang: "cs",
        unreachable: [],
        queue: [],
        menu: [],
        failedImages: [],
        media: {},
        pages: [],
        languages: [{ lang: "en", url: "http://127.0.0.1:9/en/" }],
      },
      startedAt: new Date(),
    })
    .run();
}

async function review() {
  const { projectId, owner } = project();
  const event = project().event(`/p/${projectId}/import`, owner);
  const data = (await load({
    ...event,
    params: { project: projectId },
    parent: async () => ({}),
  } as never)) as ReviewData;
  return data.offers.languages;
}

type ReviewData = {
  offers: { languages: { lang: string; url: string; name: string }[] };
  problems: { language?: string; problems: { message: string; href: string }[] }[];
};

async function reviewProblems() {
  const { projectId, owner } = project();
  const event = project().event(`/p/${projectId}/import`, owner);
  const data = (await load({
    ...event,
    params: { project: projectId },
    parent: async () => ({}),
  } as never)) as ReviewData;
  return data.problems;
}

async function importLanguage(lang: string) {
  const { projectId, owner } = project();
  const event = project().event(`/p/${projectId}/import?/importLanguage`, owner, {
    method: "POST",
    body: new URLSearchParams({ lang }),
  });
  return (actions.importLanguage as (e: never) => unknown)({
    ...event,
    params: { project: projectId },
  } as never);
}

describe("the import review's other languages", () => {
  it("offers English while the project hasn't it", async () => {
    imported();
    expect(await review()).toEqual([
      { lang: "en", url: "http://127.0.0.1:9/en/", name: "English" },
    ]);
    const { db, projectId, owner } = project();
    addLanguage(db, projectId, "en", owner.id);
    expect(await review()).toEqual([]);
  });

  it("starts a language import, refused for a language not on offer", async () => {
    imported();
    const { db } = project();
    expect(await importLanguage("de")).toMatchObject({ status: 409 });
    expect(await importLanguage("en")).toEqual({ started: true });
    const row = db.select().from(importRetries).where(eq(importRetries.importId, "im_1")).get();
    expect(row).toMatchObject({ kind: "language", lang: "en" });
    await importsSettled();
    // The old site's address is refused: nothing was imported, and English is still on offer.
    expect(
      db.select().from(importRetries).where(eq(importRetries.importId, "im_1")).get()?.state,
    ).toBe("failed");
    expect(await review()).toHaveLength(1);
  });
});

describe("the import review's problems", () => {
  it("A problem in the imported language: named by its language, leading into its editor", async () => {
    imported();
    const { db, projectId, owner } = project();
    addLanguage(db, projectId, "en", owner.id);
    // The English home's first image loses its description.
    const english = readSite(db, projectId, "en");
    // biome-ignore lint/suspicious/noExplicitAny: tests edit nodes freely.
    const doc = structuredClone(english?.document) as { nodes: Record<string, any> };
    const image = Object.values(doc.nodes).find((n) => n.type === "image" && n.alt);
    if (!image || !english) throw new Error("no image");
    image.alt = "";
    image.decorative = false;
    saveSite(db, projectId, owner.id, doc, english.version, "en");
    const problems = (await reviewProblems()).flatMap((g) => g.problems);
    const missing = problems.find((p) => p.message.startsWith("English: "));
    expect(missing?.message).toMatch(/^English: An image on .* needs a description/);
    expect(missing?.href).toMatch(/[?&]lang=en/);
    expect(problems.every((p) => /^(Čeština|English): /.test(p.message))).toBe(true);
  });
});
