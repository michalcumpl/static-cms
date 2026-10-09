import { createHash } from "node:crypto";
import type { ImageReference } from "@webmio/import";
import sharp from "sharp";
import { inspect, MAX_UPLOAD_BYTES } from "../media";
import { type SafeFetchOptions, safeFetch } from "./safe-fetch";

// Fetching the images an imported site shows (site-import spec, "Images"; design decision 7):
// candidates in order, one file per distinct image, SVG only for the logo and favicon.

export const MAX_IMAGES = 100;
/** Images fetched at a time. */
const PARALLEL = 2;
/** An SVG logo or favicon larger than this isn't rendered. */
const MAX_SVG_BYTES = 1024 * 1024;
/** The width an SVG logo or favicon is rendered at. */
const SVG_WIDTH = 512;

export interface FetchedImages {
  /** Image files by the name the documents give them. */
  files: Map<string, Uint8Array>;
  /** Each fetched reference's file name. */
  byReference: Map<string, string>;
  /** References not tried, over the limit. */
  overLimit: number;
}

export interface FetchImagesOptions extends SafeFetchOptions {
  onProgress?: (done: number, total: number) => void;
}

/** A file name from an address: its last segment, made safe, with the image's own extension. */
function fileName(url: string, extension: string, taken: ReadonlySet<string>): string {
  const last = decodeURIComponent(
    new URL(url).pathname.split("/").filter(Boolean).at(-1) ?? "image",
  );
  const stem =
    last
      .replace(/\.[a-z0-9]{2,4}$/i, "")
      .normalize("NFKD")
      .replace(/[^\w-]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 60) || "image";
  let name = `${stem}.${extension}`;
  for (let n = 2; taken.has(name); n++) name = `${stem}-${n}.${extension}`;
  return name;
}

const isSvg = (bytes: Uint8Array, contentType: string) =>
  contentType.includes("svg") ||
  /^\s*(<\?xml[^>]*>\s*)?<svg[\s>]/i.test(new TextDecoder().decode(bytes.slice(0, 512)));

/** The bytes to upload for a fetched image, with their extension, or undefined to leave it out. */
async function usable(
  bytes: Uint8Array,
  contentType: string,
  reference: ImageReference,
): Promise<{ bytes: Uint8Array; extension: string } | undefined> {
  if (bytes.byteLength > MAX_UPLOAD_BYTES) return undefined;
  if (isSvg(bytes, contentType)) {
    if (reference.role === "content" || bytes.byteLength > MAX_SVG_BYTES) return undefined;
    try {
      const png = await sharp(bytes, { density: 300 })
        .resize({ width: SVG_WIDTH })
        .png()
        .toBuffer();
      return { bytes: new Uint8Array(png), extension: "png" };
    } catch {
      return undefined;
    }
  }
  const inspected = await inspect(bytes);
  if (!inspected.ok) return undefined;
  const extension = { jpeg: "jpg", png: "png", webp: "webp" }[inspected.image.format];
  return { bytes, extension };
}

/** Fetches the references' images, best candidate first; failures are simply missing. */
export async function fetchImages(
  references: readonly ImageReference[],
  options: FetchImagesOptions = {},
): Promise<FetchedImages> {
  const files = new Map<string, Uint8Array>();
  const byReference = new Map<string, string>();
  const byHash = new Map<string, string>();
  // The logo and favicon first, so the limit never drops them.
  const ordered = [...references].sort(
    (a, b) => Number(a.role === "content") - Number(b.role === "content"),
  );
  const tried = ordered.slice(0, MAX_IMAGES);
  let done = 0;
  options.onProgress?.(0, tried.length);

  const fetchOne = async (reference: ImageReference) => {
    for (const candidate of reference.candidates) {
      const result = await safeFetch(candidate, "image", options);
      if (!result.ok) continue;
      const image = await usable(result.body, result.contentType, reference);
      if (!image) continue;
      const hash = createHash("sha256").update(image.bytes).digest("hex");
      let name = byHash.get(hash);
      if (!name) {
        name = fileName(candidate, image.extension, new Set(files.keys()));
        files.set(name, image.bytes);
        byHash.set(hash, name);
      }
      byReference.set(reference.id, name);
      return;
    }
  };
  for (let i = 0; i < tried.length; i += PARALLEL) {
    await Promise.all(tried.slice(i, i + PARALLEL).map(fetchOne));
    done = Math.min(tried.length, i + PARALLEL);
    options.onProgress?.(done, tried.length);
  }
  return { files, byReference, overLimit: ordered.length - tried.length };
}
