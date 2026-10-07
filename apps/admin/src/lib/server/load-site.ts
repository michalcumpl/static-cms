// Loading a site from a folder into a new project (example-sites design decision 2): the
// examples, later the templates' test sites and the importer's output. Everything is checked
// before the project is made, and a failure after that removes the project again.
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { validateSite } from "@webmio/model";
import { isLanguageCode } from "@webmio/render";
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

export type LoadResult = { ok: true; projectId: string } | { ok: false; problems: string[] };

type Doc = { document_id: string; nodes: Record<string, Record<string, unknown>> };

const imagesOf = (doc: Doc) =>
  Object.values(doc.nodes).filter((node) => node.type === "image") as {
    src: string;
    width: number;
    height: number;
  }[];

function readJson(file: string): unknown {
  return JSON.parse(readFileSync(file, "utf8"));
}

/** Reads and checks the folder: every problem found, or the project file and documents. */
function readFolder(
  db: Db,
  folder: string,
  workspaceId: string,
): { problems: string[]; project?: ProjectFile; docs?: Map<string, Doc> } {
  const problems: string[] = [];
  if (!db.select().from(workspaces).where(eq(workspaces.id, workspaceId)).get()) {
    problems.push(`No workspace ${workspaceId}.`);
  }
  const projectFile = join(folder, "project.json");
  if (!existsSync(projectFile)) return { problems: [...problems, `No ${projectFile}.`] };
  let project: ProjectFile;
  try {
    project = readJson(projectFile) as ProjectFile;
  } catch (error) {
    return { problems: [...problems, `project.json: ${(error as Error).message}`] };
  }
  if (!project.name?.trim()) problems.push("project.json: the name is empty.");
  if (!project.languages?.[project.primaryLang]) {
    problems.push(`project.json: the primary language "${project.primaryLang}" has no document.`);
  }
  const docs = new Map<string, Doc>();
  for (const [lang, file] of Object.entries(project.languages ?? {})) {
    if (!isLanguageCode(lang)) {
      problems.push(`project.json: "${lang}" isn't an offered language.`);
      continue;
    }
    let doc: Doc;
    try {
      doc = readJson(join(folder, file)) as Doc;
    } catch (error) {
      problems.push(`${file}: ${(error as Error).message}`);
      continue;
    }
    docs.set(lang, doc);
    for (const image of imagesOf(doc)) {
      if (!existsSync(join(folder, "images", image.src))) {
        problems.push(`${file}: no image file images/${image.src}.`);
      }
    }
    // Sizes come with the upload; until then any size stands in for them.
    const sized = structuredClone(doc);
    for (const image of imagesOf(sized)) {
      image.width ||= 1;
      image.height ||= 1;
    }
    for (const problem of validateSite(sized).problems) {
      if (problem.severity === "error") problems.push(`${file}: ${problem.message}`);
    }
  }
  return { problems, project, docs };
}

/**
 * Creates a project in the workspace from the folder: `project.json`, a document per language
 * whose images name files in `images/`, and those files. The images go into the project's
 * library and the documents point at them; the other languages share the primary's shared
 * fields, as any language does.
 */
export async function loadSite(
  db: Db,
  folder: string,
  workspaceId: string,
  userId: string | null,
): Promise<LoadResult> {
  const { problems, project, docs } = readFolder(db, folder, workspaceId);
  if (problems.length > 0 || !project || !docs) return { ok: false, problems };

  const primary = docs.get(project.primaryLang) as Doc;
  const projectId = createProject(
    db,
    workspaceId,
    project.name.trim(),
    primary,
    userId,
    project.primaryLang,
  );
  const fail = async (problem: string): Promise<LoadResult> => {
    await deleteProject(db, projectId, userId ?? "");
    purgeProject(db, workspaceId, projectId);
    return { ok: false, problems: [problem] };
  };

  // Each file once, however many documents and nodes name it.
  const uploaded = new Map<string, { key: string; width: number; height: number }>();
  for (const doc of docs.values()) {
    for (const image of imagesOf(doc)) {
      if (uploaded.has(image.src)) continue;
      const result = await uploadImage(db, projectId, userId, {
        name: image.src,
        bytes: new Uint8Array(readFileSync(join(folder, "images", image.src))),
      });
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
  if (!first) return fail(`${project.primaryLang}: not stored.`);
  const stillValid = validateSite(primary).problems.filter((p) => p.severity === "error");
  if (stillValid.length > 0) return fail(`${project.primaryLang}: ${stillValid[0]?.message}`);
  db.update(versions).set({ document: primary }).where(eq(versions.id, first.versionId)).run();
  for (const lang of docs.keys()) {
    if (lang === project.primaryLang) continue;
    const added = addLanguage(db, projectId, lang, userId);
    if (!added.ok) return fail(`${lang}: couldn't be added (${added.reason}).`);
    const problem = save(lang);
    if (problem) return fail(problem);
  }
  return { ok: true, projectId };
}
