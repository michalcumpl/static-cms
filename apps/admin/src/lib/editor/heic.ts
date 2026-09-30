// HEIC/HEIF photos (iPhones) converted to JPEG in the browser before uploading, because the
// server only takes JPEG, PNG and WebP (heic-upload design.md decisions 1 and 2).

/** What the library dialog's file picker offers. The extensions help Chrome on macOS. */
export const UPLOAD_ACCEPT = "image/jpeg,image/png,image/webp,image/heic,image/heif,.heic,.heif";

/** Converted photos are at most this wide or tall: iOS Safari can't draw larger canvases. */
export const MAX_CONVERTED_SIDE = 4096;
const JPEG_QUALITY = 0.92;

const HEIC_TYPES = ["image/heic", "image/heif", "image/heic-sequence", "image/heif-sequence"];
const HEIF_BRANDS = ["heic", "heix", "hevc", "heim", "heis", "mif1", "msf1"];

export const CONVERSION_FAILED =
  "This photo couldn't be converted. Export it as JPEG and try again.";

/** Whether a file is a HEIC/HEIF image, by its type, its name, or its first bytes. */
export async function isHeic(file: Blob & { name?: string }): Promise<boolean> {
  if (HEIC_TYPES.includes(file.type.toLowerCase())) return true;
  if (/\.hei[cf]$/i.test(file.name ?? "")) return true;
  const head = new Uint8Array(await file.slice(4, 12).arrayBuffer());
  const text = String.fromCharCode(...head);
  return text.startsWith("ftyp") && HEIF_BRANDS.includes(text.slice(4));
}

/** The size a converted photo gets: unchanged, or scaled down to fit 4096 px. */
export function cappedSize(width: number, height: number): { width: number; height: number } {
  const scale = Math.min(1, MAX_CONVERTED_SIDE / Math.max(width, height));
  return { width: Math.round(width * scale), height: Math.round(height * scale) };
}

/** `IMG_5420.HEIC` becomes `IMG_5420.jpg`. */
export function convertedName(name: string): string {
  return `${name.replace(/\.[^.]*$/, "") || "photo"}.jpg`;
}

type Decoded = { source: CanvasImageSource; width: number; height: number; close?: () => void };

/** The browser's own HEIC decoder (Safari), applying the file's orientation. */
async function decodeNatively(file: Blob): Promise<Decoded> {
  const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  return {
    source: bitmap,
    width: bitmap.width,
    height: bitmap.height,
    close: () => bitmap.close(),
  };
}

type HeifImage = {
  get_width(): number;
  get_height(): number;
  is_primary?(): boolean;
  display(target: ImageData, done: (result: ImageData | null) => void): void;
};
type Libheif = { HeifDecoder: new () => { decode(bytes: Uint8Array): HeifImage[] } };

let libheif: Promise<Libheif> | undefined;

/** libheif, fetched as its own chunk the first time a browser without HEIC support needs it. */
function loadLibheif(): Promise<Libheif> {
  libheif ??= import("libheif-js/libheif-wasm/libheif-bundle.mjs").then(
    ({ default: factory }) => factory() as Promise<Libheif>,
  );
  libheif.catch(() => {
    libheif = undefined;
  });
  return libheif;
}

/** Decodes the primary image with libheif, which applies the file's rotation and mirroring. */
async function decodeWithLibheif(file: Blob): Promise<Decoded> {
  const { HeifDecoder } = await loadLibheif();
  const images = new HeifDecoder().decode(new Uint8Array(await file.arrayBuffer()));
  const image = images.find((i) => i.is_primary?.()) ?? images[0];
  if (!image) throw new Error("no image in the file");
  const width = image.get_width();
  const height = image.get_height();
  const pixels = await new Promise<ImageData>((resolve, reject) =>
    image.display(new ImageData(width, height), (result) =>
      result ? resolve(result) : reject(new Error("libheif could not decode the image")),
    ),
  );
  const canvas = new OffscreenCanvas(width, height);
  canvas.getContext("2d")?.putImageData(pixels, 0, 0);
  return { source: canvas, width, height };
}

export type ConversionResult = { ok: true; file: File } | { ok: false; message: string };

/**
 * Converts a HEIC/HEIF photo to an upright JPEG of its primary image, at most 4096 px on its
 * longer side, named after the original. Never throws: failures come back as a message.
 */
export async function convertHeic(file: File): Promise<ConversionResult> {
  let decoded: Decoded | undefined;
  try {
    try {
      decoded = await decodeNatively(file);
    } catch {
      decoded = await decodeWithLibheif(file);
    }
    const size = cappedSize(decoded.width, decoded.height);
    const canvas = document.createElement("canvas");
    canvas.width = size.width;
    canvas.height = size.height;
    const context = canvas.getContext("2d");
    if (!context) throw new Error("no canvas");
    context.drawImage(decoded.source, 0, 0, size.width, size.height);
    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/jpeg", JPEG_QUALITY),
    );
    if (!blob) throw new Error("the canvas produced no image");
    return { ok: true, file: new File([blob], convertedName(file.name), { type: "image/jpeg" }) };
  } catch {
    return { ok: false, message: CONVERSION_FAILED };
  } finally {
    decoded?.close?.();
  }
}

/** A file ready to upload: HEIC converted to JPEG, anything else unchanged. */
export async function prepareUpload(file: File): Promise<ConversionResult> {
  return (await isHeic(file)) ? convertHeic(file) : { ok: true, file };
}
