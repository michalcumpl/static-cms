import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { mediaRoot } from "./import-working-copy";

// The same rule the site validator applies to image sources: a plain file name,
// so a media key can never leave the project's folder.
const MEDIA_KEY = /^[A-Za-z0-9][A-Za-z0-9._-]*$/;

function projectDir(projectId: string, root: string): string {
  return join(root, projectId);
}

/** File names in a project's media folder. */
export function projectMediaNames(projectId: string, root = mediaRoot()): string[] {
  try {
    return readdirSync(projectDir(projectId, root))
      .filter((name) => MEDIA_KEY.test(name))
      .sort();
  } catch {
    return [];
  }
}

/** A project's image, or undefined for names that don't exist or aren't plain file names. */
export function projectMediaFile(
  projectId: string,
  name: string,
  root = mediaRoot(),
): Uint8Array<ArrayBuffer> | undefined {
  if (!MEDIA_KEY.test(name)) return undefined;
  try {
    return new Uint8Array(readFileSync(join(projectDir(projectId, root), name)));
  } catch {
    return undefined;
  }
}

/** All of a project's images, keyed by name, for export. */
export function projectMedia(projectId: string, root = mediaRoot()): Map<string, Uint8Array> {
  return new Map(
    projectMediaNames(projectId, root).flatMap((name) => {
      const bytes = projectMediaFile(projectId, name, root);
      return bytes ? [[name, bytes] as const] : [];
    }),
  );
}
