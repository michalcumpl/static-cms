// Loading a site into a new project (example-sites design decision 2): the examples from a
// folder, and the importer's output (site-import design decision 8). Everything is checked
// before the project is made, and a failure after that removes the project again.
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { validateSite } from "@webmio/model";
import { isLanguageCode } from "@webmio/render";
import { TEMPLATE_RELEASES } from "@webmio/templates";
import { eq } from "drizzle-orm";
import type { Db } from "./db/index";
import { siteDocuments, versions, workspaces } from "./db/schema";
import { uploadImage } from "./media";
import { deleteProject, purgeProject } from "./project-deletion";
import { addLanguage, createProject, readSite, saveSite } from "./site-documents";

/** `project.json`: the project's name, primary language, and each language's document file. */
export interface ProjectFile {
  name: string;
  primaryLang: string;
  languages: Record<string, string>;
}

export type LoadResult =
  | {
      ok: true;
      projectId: string;
      /** Each uploaded file's media key, by the name the documents gave it. */
      media: ReadonlyMap<string, string>;
    }
  | { ok: false; problems: string[] };

type Doc = { document_id: string; nodes: Record<string, Record<string, unknown>> };

/** A site to make a project from: its documents, and the image files their images name. */
export interface SiteToCreate {
  name: string;
  primaryLang: string;
  /** Where the site comes from, naming it in messages: `project.json`, or the imported address. */
  source: string;
  /** Each language's document, with a label naming it in messages (its file name). */
  languages: ReadonlyMap<string, { label: string; doc: Doc }>;
  /** The images' files by the name the documents' `src` gives them. */
  files: ReadonlyMap<string, Uint8Array>;
}

export interface CreateOptions {
  /**
   * Keep documents whose only errors are site rules (an image without a description), for the
   * owner to fix: the importer's drafts. Structural problems always refuse.
   */
  allowSiteProblems?: boolean;
}

const imagesOf = (doc: Doc) =>
  Object.values(doc.nodes).filter((node) => node.type === "image") as {
    src: string;
    width: number;
    height: number;
  }[];

function readJson(file: string): unknown {
  return JSON.parse(readFileSync(file, "utf8"));
}

/** The errors that refuse a document: all of them, or only structural ones for a draft. */
function refusing(doc: Doc, options: CreateOptions) {
  return validateSite(doc, { templates: TEMPLATE_RELEASES }).problems.filter(
    (p) => p.severity === "error" && (!options.allowSiteProblems || p.category === "structure"),
  );
}

/** Every problem that stops the site from becoming a project in the workspace. */
export function siteProblems(
  db: Db,
  workspaceId: string,
  site: SiteToCreate,
  options: CreateOptions = {},
): string[] {
  const problems: string[] = [];
  if (!db.select().from(workspaces).where(eq(workspaces.id, workspaceId)).get()) {
    problems.push(`No workspace ${workspaceId}.`);
  }
  if (!site.name.trim()) problems.push(`${site.source}: the name is empty.`);
  if (!site.languages.has(site.primaryLang)) {
    problems.push(`${site.source}: the primary language "${site.primaryLang}" has no document.`);
  }
  for (const [lang, { label, doc }] of site.languages) {
    if (!isLanguageCode(lang)) {
      problems.push(`${site.source}: "${lang}" isn't an offered language.`);
      continue;
    }
    for (const image of imagesOf(doc)) {
      if (!site.files.has(image.src)) problems.push(`${label}: no image file images/${image.src}.`);
    }
    // Sizes come with the upload; until then any size stands in for them.
    const sized = structuredClone(doc);
    for (const image of imagesOf(sized)) {
      image.width ||= 1;
      image.height ||= 1;
    }
    for (const problem of refusing(sized, options)) problems.push(`${label}: ${problem.message}`);
  }
  return problems;
}

/** Reads the folder: its problems, or the site with its image files. */
function readFolder(folder: string): { problems: string[]; site?: SiteToCreate } {
  const projectFile = join(folder, "project.json");
  if (!existsSync(projectFile)) return { problems: [`No ${projectFile}.`] };
  let project: ProjectFile;
  try {
    project = readJson(projectFile) as ProjectFile;
  } catch (error) {
    return { problems: [`project.json: ${(error as Error).message}`] };
  }
  const problems: string[] = [];
  const languages = new Map<string, { label: string; doc: Doc }>();
  const files = new Map<string, Uint8Array>();
  for (const [lang, file] of Object.entries(project.languages ?? {})) {
    let doc: Doc;
    try {
      doc = readJson(join(folder, file)) as Doc;
    } catch (error) {
      problems.push(`${file}: ${(error as Error).message}`);
      continue;
    }
    languages.set(lang, { label: file, doc });
    for (const image of imagesOf(doc)) {
      const path = join(folder, "images", image.src);
      if (!files.has(image.src) && existsSync(path)) {
        files.set(image.src, new Uint8Array(readFileSync(path)));
      }
    }
  }
  const site = {
    name: project.name ?? "",
    primaryLang: project.primaryLang,
    source: "project.json",
    languages,
    files,
  };
  return { problems, site };
}

/**
 * Creates a project in the workspace from the folder: `project.json`, a document per language
 * whose images name files in `images/`, and those files. Documents with any error are refused.
 */
export async function loadSite(
  db: Db,
  folder: string,
  workspaceId: string,
  userId: string | null,
): Promise<LoadResult> {
  const read = readFolder(folder);
  if (!read.site) return { ok: false, problems: read.problems };
  const problems = [...read.problems, ...siteProblems(db, workspaceId, read.site)];
  if (problems.length > 0) return { ok: false, problems };
  return createSiteProject(db, workspaceId, userId, read.site);
}

/**
 * Creates a project in the workspace from a site: the images go into the project's library and
 * the documents point at them; the other languages share the primary's shared fields, as any
 * language does. Nothing is left behind when it fails.
 */
export async function createSiteProject(
  db: Db,
  workspaceId: string,
  userId: string | null,
  site: SiteToCreate,
  options: CreateOptions = {},
): Promise<LoadResult> {
  const problems = siteProblems(db, workspaceId, site, options);
  if (problems.length > 0) return { ok: false, problems };

  const docs = new Map([...site.languages].map(([lang, { doc }]) => [lang, structuredClone(doc)]));
  const primary = docs.get(site.primaryLang) as Doc;
  const projectId = createProject(
    db,
    workspaceId,
    site.name.trim(),
    primary,
    userId,
    site.primaryLang,
  );
  const fail = async (problem: string): Promise<LoadResult> => {
    await deleteProject(db, projectId, userId ?? "");
    await purgeProject(db, workspaceId, projectId);
    return { ok: false, problems: [problem] };
  };

  // Each file once, however many documents and nodes name it.
  const uploaded = new Map<string, { key: string; width: number; height: number }>();
  for (const doc of docs.values()) {
    for (const image of imagesOf(doc)) {
      if (uploaded.has(image.src)) continue;
      const bytes = site.files.get(image.src);
      if (!bytes) return fail(`images/${image.src} is missing.`);
      const result = await uploadImage(db, projectId, userId, { name: image.src, bytes });
      if (!result.ok) return fail(`images/${image.src} couldn't be uploaded (${result.status}).`);
      uploaded.set(image.src, result.media);
    }
  }
  for (const doc of docs.values()) {
    for (const image of imagesOf(doc)) {
      const media = uploaded.get(image.src);
      if (!media) continue;
      image.src = media.key;
      image.width = media.width;
      image.height = media.height;
    }
  }

  const save = (lang: string) => {
    const current = readSite(db, projectId, lang);
    if (!current) return `${lang}: not stored.`;
    const result = saveSite(db, projectId, userId, docs.get(lang), current.version, lang);
    return result.ok ? undefined : `${lang}: refused (${result.reason}).`;
  };
  // The primary's first version still names files; nobody has seen it, so it takes the
  // uploaded images in place instead of a second version.
  const first = db
    .select({ versionId: siteDocuments.currentVersionId })
    .from(siteDocuments)
    .where(eq(siteDocuments.projectId, projectId))
    .get();
  if (!first) return fail(`${site.primaryLang}: not stored.`);
  const stillRefused = refusing(primary, options);
  if (stillRefused.length > 0) return fail(`${site.primaryLang}: ${stillRefused[0]?.message}`);
  db.update(versions).set({ document: primary }).where(eq(versions.id, first.versionId)).run();
  for (const lang of docs.keys()) {
    if (lang === site.primaryLang) continue;
    const added = addLanguage(db, projectId, lang, userId);
    if (!added.ok) return fail(`${lang}: couldn't be added (${added.reason}).`);
    const problem = save(lang);
    if (problem) return fail(problem);
  }
  return {
    ok: true,
    projectId,
    media: new Map([...uploaded].map(([name, media]) => [name, media.key])),
  };
}
