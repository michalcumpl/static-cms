import { describe, expect, it } from "vitest";
import { addLanguage, readSite, saveSite } from "$lib/server/site-documents";
import { useTestProject } from "$lib/server/test-project";
import { load as tabsLoad } from "./+layout.server";
import { load } from "./+page.server";
import { load as publishingLoad } from "./publish/+page.server";
import { load as languagesLoad } from "./website/languages/+page.server";
import { load as pagesLoad } from "./website/pages/+page.server";

const project = useTestProject();

/** What the tabs' loads return, as these tests read it. */
interface Layout {
  lang: string;
  primaryLang: string;
  languages: { lang: string }[];
}
interface Data {
  valid: boolean;
  problems: { severity: string; code: string; href: string }[];
  summary: Record<string, unknown>;
  design: { colors: string[]; headingFont: string };
  pages: { pageId: string; title: string; home: boolean; inMenu: boolean; untranslated: boolean }[];
  missing: unknown[];
  translations: { lang: string }[];
}

/** A panel page's load as SvelteKit runs it: after the layouts, whose data `parent()` returns. */
async function tab(
  path: string,
  run: (event: never) => unknown,
): Promise<{ layout: Layout; data: Data }> {
  const { projectId, owner } = project();
  const event = project().event(`/p/${projectId}${path}`, owner) as unknown as Parameters<
    typeof tabsLoad
  >[0];
  const layout = (await tabsLoad({ ...event, parent: async () => ({}) } as never)) as Layout;
  const data = (await run({ ...event, parent: async () => layout } as never)) as Data;
  return { layout, data };
}

describe("panel layout", () => {
  it("offers the project's languages and the one in ?lang=, the primary without it", async () => {
    const { db, projectId, owner } = project();
    addLanguage(db, projectId, "en", owner.id);
    expect((await tab("/pages/", pagesLoad)).layout).toMatchObject({
      lang: "cs",
      primaryLang: "cs",
    });
    expect((await tab("/pages/?lang=en", pagesLoad)).layout).toMatchObject({ lang: "en" });
    expect((await tab("/pages/?lang=xx", pagesLoad)).layout).toMatchObject({ lang: "cs" });
    expect((await tab("/", load)).layout.languages.map((l) => l.lang)).toEqual(["cs", "en"]);
  });
});

describe("Dashboard", () => {
  it("validates the saved site and summarises it for the cards", async () => {
    const { data } = await tab("/", load);
    expect(data).toMatchObject({ valid: true, problems: [] });
    expect(data.summary).toMatchObject({
      siteName: "Pekárna U Lípy",
      locations: 1,
      services: 3,
      questions: 0,
      people: 0,
      testimonials: 0,
      pages: 2,
      offerPageId: "page_home",
      aboutPageId: undefined,
    });
    expect(data.design.colors).toHaveLength(4);
    expect(data.design.headingFont).not.toBe("");
  });

  it("links each problem to where it's fixed", async () => {
    const { db, projectId, owner } = project();
    const site = readSite(db, projectId);
    const doc = structuredClone(site?.document) as {
      nodes: Record<string, Record<string, unknown>>;
    };
    doc.nodes.location_1 = { ...doc.nodes.location_1, phone: "321" };
    doc.nodes.hero_1 = {
      ...doc.nodes.hero_1,
      heading: { content: "", marks: [], annotations: [] },
    };
    saveSite(db, projectId, owner.id, doc, site?.version ?? "");
    const { data } = await tab("/", load);
    const href = (code: string) => data.problems.find((p) => p.code === code)?.href;
    expect(href("invalid-phone")).toBe(
      `/p/${projectId}/business?focus=business-settings-location_1-phone`,
    );
    expect(href("empty-heading")).toBe(
      `/p/${projectId}/edit/page_home/?problem=hero_1&property=heading`,
    );
  });

  it("reports errors in the saved site", async () => {
    const { db, projectId, owner } = project();
    const site = readSite(db, projectId);
    const doc = structuredClone(site?.document) as {
      nodes: Record<string, { title?: string; slug?: string }>;
    };
    doc.nodes.page_contact = { ...doc.nodes.page_contact, slug: "" };
    saveSite(db, projectId, owner.id, doc, site?.version ?? "");
    const { data } = await tab("/", load);
    expect(data.valid).toBe(false);
    expect(data.problems.some((p) => p.severity === "error")).toBe(true);
  });
});

describe("Pages tab", () => {
  it("lists the pages in order with home and menu", async () => {
    const { data } = await tab("/pages/", pagesLoad);
    expect(data.pages.map((p) => [p.title, p.home, p.inMenu])).toEqual([
      ["Úvod", true, true],
      ["Kontakt", false, true],
    ]);
    expect(data.missing).toEqual([]);
  });

  it("marks pages not translated yet and lists the primary's missing ones", async () => {
    const { db, projectId, owner } = project();
    addLanguage(db, projectId, "en", owner.id);
    const { data } = await tab("/pages/?lang=en", pagesLoad);
    expect(data.pages.filter((p) => p.untranslated).map((p) => p.pageId)).toContain("page_contact");
    expect(data.missing).toEqual([]);
  });
});

describe("Languages tab", () => {
  it("lists what each language still needs", async () => {
    const { db, projectId, owner } = project();
    addLanguage(db, projectId, "en", owner.id);
    const { data } = await tab("/languages/", languagesLoad);
    expect(data.translations.map((t) => t.lang)).toEqual(["cs", "en"]);
  });
});

describe("Publishing tab", () => {
  it("says whether the saved site is valid", async () => {
    expect((await tab("/publishing/", publishingLoad)).data).toEqual({ valid: true });
  });
});
