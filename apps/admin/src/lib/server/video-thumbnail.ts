import { videoEmbed } from "@webmio/model";
import sharp from "sharp";

// A video's thumbnail, fetched by our server from the provider once, to become the video's
// poster in the media library (video design, "Changes made while building"): visitors load it
// from the site, never from YouTube or Vimeo.

const MAX_BYTES = 5 * 1024 * 1024;
const TIMEOUT_MS = 8000;

export type ThumbnailResult =
  | { ok: true; name: string; bytes: Uint8Array }
  | { ok: false; reason: "not-video" | "unavailable" };

type Fetch = typeof fetch;

/** Fetches `url` when it is on `allowedHost` (or a subdomain), as bytes; undefined on failure. */
async function fetchFrom(
  fetcher: Fetch,
  url: string,
  allowedHost: RegExp,
): Promise<Response | undefined> {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return undefined;
  }
  if (parsed.protocol !== "https:" || !allowedHost.test(parsed.hostname)) return undefined;
  try {
    const response = await fetcher(parsed, {
      signal: AbortSignal.timeout(TIMEOUT_MS),
      redirect: "error",
    });
    return response.ok ? response : undefined;
  } catch {
    return undefined;
  }
}

async function bytesOf(response: Response): Promise<Uint8Array | undefined> {
  const length = Number(response.headers.get("content-length") ?? 0);
  if (length > MAX_BYTES) return undefined;
  const bytes = new Uint8Array(await response.arrayBuffer());
  return bytes.byteLength > 0 && bytes.byteLength <= MAX_BYTES ? bytes : undefined;
}

/**
 * The picture without the black bars YouTube's smaller thumbnails put around a wide video, so it
 * fills a 16:9 frame; the bytes unchanged when they aren't an image sharp can read.
 */
export async function withoutBars(bytes: Uint8Array): Promise<Uint8Array> {
  try {
    const trimmed = await sharp(bytes)
      .trim({ background: "#000000", threshold: 24 })
      .jpeg({ quality: 88 })
      .toBuffer();
    return new Uint8Array(trimmed);
  } catch {
    return bytes;
  }
}

/**
 * The largest thumbnail the provider has for a video address: YouTube's `maxresdefault`, else
 * `hqdefault`; Vimeo's from its oEmbed answer, asked for at 1280 pixels wide.
 */
export async function fetchVideoThumbnail(
  url: string,
  fetcher: Fetch = fetch,
): Promise<ThumbnailResult> {
  const embed = videoEmbed(url);
  if (!embed) return { ok: false, reason: "not-video" };
  const name = `${embed.provider}-${embed.id}.jpg`;
  if (embed.provider === "youtube") {
    for (const size of ["maxresdefault", "hqdefault"]) {
      const response = await fetchFrom(
        fetcher,
        `https://i.ytimg.com/vi/${embed.id}/${size}.jpg`,
        /^i\.ytimg\.com$/,
      );
      const bytes = response && (await bytesOf(response));
      if (bytes)
        return { ok: true, name, bytes: size === "hqdefault" ? await withoutBars(bytes) : bytes };
    }
    return { ok: false, reason: "unavailable" };
  }
  const oembed = await fetchFrom(
    fetcher,
    `https://vimeo.com/api/oembed.json?url=${encodeURIComponent(embed.watchUrl)}&width=1280`,
    /^vimeo\.com$/,
  );
  let thumbnail: unknown;
  try {
    thumbnail = oembed
      ? ((await oembed.json()) as { thumbnail_url?: unknown }).thumbnail_url
      : undefined;
  } catch {
    thumbnail = undefined;
  }
  if (typeof thumbnail !== "string") return { ok: false, reason: "unavailable" };
  const response = await fetchFrom(fetcher, thumbnail, /(^|\.)vimeocdn\.com$/);
  const bytes = response && (await bytesOf(response));
  return bytes ? { ok: true, name, bytes } : { ok: false, reason: "unavailable" };
}
