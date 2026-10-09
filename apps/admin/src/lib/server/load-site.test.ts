import {
  copyFileSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { blocks, siteBuilder } from "@webmio/model";
import { eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";
import { media, projects } from "./db/schema";
import { mediaRoot } from "./import-working-copy";
import { createSiteProject, loadSite, type SiteToCreate } from "./load-site";
import { primaryLanguage, projectLanguages, readSite, versionCount } from "./site-documents";
import { useTestProject } from "./test-project";

// Loading a site from a folder (example-sites design decision 2).

const project = useTestProject();
const require = createRequire(import.meta.url);
const heroPng = join(
  dirname(require.resolve("@webmio/model/fixtures/demo-site.json")),
  "media",
  "hero.png",
);

/** A one-page site with the demo's image, its texts in `lang`. */
function site(lang: string, name = "Mortgage Specialist", slug = "home") {
  const builder = siteBuilder({ name, lang });
  builder.location({ city: "Praha", phone: "+420 777 000 111" });
  builder.page({ title: lang === "cs" ? "Úvod" : "Home", slug, menu: true }, [
    blocks.hero({
      heading: lang === "cs" ? "Hypotéky" : "Mortgages",
      image: { src: "prague.png", alt: lang === "cs" ? "Praha" : "Prague" },
    }),
  ]);
  return builder.build();
}

/** A folder with `project.json`, the documents and the image. */
function folder(
  project: { name: string; primaryLang: string; languages: Record<string, string> },
  docs: Record<string, unknown>,
  withImage = true,
): string {
  const dir = mkdtempSync(join(tmpdir(), "site-"));
  writeFileSync(join(dir, "project.json"), JSON.stringify(project));
  for (const [file, doc] of Object.entries(docs))
    writeFileSync(join(dir, file), JSON.stringify(doc));
  mkdirSync(join(dir, "images"));
  if (withImage) copyFileSync(heroPng, join(dir, "images", "prague.png"));
  return dir;
}

const projectsOf = () => {
  const { db, workspaceId } = project();
  return db.select().from(projects).where(eq(projects.workspaceId, workspaceId)).all();
};

describe("loadSite", () => {
  it("Load an English site: English primary, images in the library", async () => {
    const { db, workspaceId, owner } = project();
    const dir = folder(
      { name: "Mortgage Specialist", primaryLang: "en", languages: { en: "en.json" } },
      { "en.json": site("en") },
    );
    const result = await loadSite(db, dir, workspaceId, owner.id);
    if (!result.ok) throw new Error(result.problems.join("\n"));
    expect(primaryLanguage(db, result.projectId)).toBe("en");
    const doc = readSite(db, result.projectId)?.document as {
      nodes: Record<string, { type: string; src?: string; width?: number }>;
    };
    const image = Object.values(doc.nodes).find((n) => n.type === "image");
    const [stored] = db.select().from(media).where(eq(media.projectId, result.projectId)).all();
    expect(image).toMatchObject({ src: stored?.key, width: stored?.width });
    expect(existsSync(join(mediaRoot(), result.projectId))).toBe(true);
    expect(versionCount(db, result.projectId)).toBe(1);
  });

  it("Two languages: the second shares the primary's images and business", async () => {
    const { db, workspaceId, owner } = project();
    const dir = folder(
      { name: "Mareš Partners", primaryLang: "cs", languages: { cs: "cs.json", en: "en.json" } },
      { "cs.json": site("cs", "Mareš Partners", "uvod"), "en.json": site("en", "Mareš Partners") },
    );
    const result = await loadSite(db, dir, workspaceId, owner.id);
    if (!result.ok) throw new Error(result.problems.join("\n"));
    expect(projectLanguages(db, result.projectId).map((l) => l.lang)).toEqual(["cs", "en"]);
    type D = { nodes: Record<string, Record<string, unknown>> };
    const cs = readSite(db, result.projectId, "cs")?.document as D;
    const en = readSite(db, result.projectId, "en")?.document as D;
    expect(en.nodes.hero_1).toMatchObject({
      heading: expect.objectContaining({ content: "Mortgages" }),
    });
    expect(en.nodes.image_1?.src).toBe(cs.nodes.image_1?.src);
    expect(en.nodes.location_1?.phone).toBe("+420777000111");
    expect(db.select().from(media).where(eq(media.projectId, result.projectId)).all()).toHaveLength(
      1,
    );
  });

  it("Broken folder: every problem, and nothing left behind", async () => {
    const { db, workspaceId, owner } = project();
    const broken = site("cs", "Rozbitý web", "") as unknown as {
      nodes: Record<string, Record<string, unknown>>;
    };
    const before = projectsOf().length;
    const foldersBefore = readdirSync(mediaRoot()).length;
    const dir = folder(
      { name: "Rozbitý web", primaryLang: "cs", languages: { cs: "cs.json" } },
      { "cs.json": broken },
      false,
    );
    const result = await loadSite(db, dir, workspaceId, owner.id);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.problems.some((p) => p.includes("no image file images/prague.png"))).toBe(true);
    expect(
      result.problems.some((p) => p.toLowerCase().includes("slug") || p.includes("address")),
    ).toBe(true);
    expect(projectsOf()).toHaveLength(before);
    expect(readdirSync(mediaRoot())).toHaveLength(foldersBefore);
  });

  it("refuses an unknown workspace and a language that isn't offered", async () => {
    const { db, owner } = project();
    const dir = folder(
      { name: "X", primaryLang: "xx", languages: { xx: "xx.json" } },
      { "xx.json": site("cs") },
    );
    const result = await loadSite(db, dir, "w_none", owner.id);
    expect(result).toEqual({
      ok: false,
      problems: ["No workspace w_none.", 'project.json: "xx" isn\'t an offered language.'],
    });
  });
});

describe("createSiteProject (site-import design decision 8)", () => {
  /** The English site from memory, its image without a description. */
  function draft(): SiteToCreate {
    const doc = site("en") as unknown as { nodes: Record<string, Record<string, unknown>> };
    const image = Object.values(doc.nodes).find((n) => n.type === "image");
    if (image) image.alt = "";
    return {
      name: "Mortgage Specialist",
      primaryLang: "en",
      source: "https://mortgagespecialist.cz/",
      languages: new Map([["en", { label: "en", doc: doc as never }]]),
      files: new Map([["prague.png", new Uint8Array(readFileSync(heroPng))]]),
    };
  }

  it("refuses a site-rule error unless the draft allows it", async () => {
    const { db, workspaceId, owner } = project();
    const refused = await createSiteProject(db, workspaceId, owner.id, draft());
    expect(refused.ok).toBe(false);
    const kept = await createSiteProject(db, workspaceId, owner.id, draft(), {
      allowSiteProblems: true,
    });
    if (!kept.ok) throw new Error(kept.problems.join("\n"));
    const problems = readSite(db, kept.projectId)?.problems ?? [];
    expect(problems.map((p) => p.code)).toContain("missing-alt");
  });

  it("refuses a structural problem even for a draft, leaving nothing behind", async () => {
    const { db, workspaceId, owner } = project();
    const before = projectsOf().length;
    const broken = draft();
    const doc = broken.languages.get("en")?.doc as unknown as {
      nodes: Record<string, Record<string, unknown>>;
    };
    (doc.nodes.page_1?.blocks as { nodes: string[] }).nodes.push("gone");
    const result = await createSiteProject(db, workspaceId, owner.id, broken, {
      allowSiteProblems: true,
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.problems.join(" ")).toContain("gone");
    expect(projectsOf()).toHaveLength(before);
  });
});
