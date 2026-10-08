// Video addresses (video design decision 1): the one place that knows which YouTube and Vimeo
// addresses are videos, and where their players and watch pages are.

export interface VideoEmbed {
  provider: "youtube" | "vimeo";
  id: string;
  /** The video's page on the provider's site, for the link that works without the script. */
  watchUrl: string;
  /** The player, loaded only when the visitor presses play. */
  embedUrl: string;
}

const YOUTUBE_ID = /^[A-Za-z0-9_-]{11}$/;
const VIMEO_ID = /^\d+$/;

/** The video an address names, or undefined when it isn't a YouTube or Vimeo video address. */
export function videoEmbed(url: string): VideoEmbed | undefined {
  let parsed: URL;
  try {
    parsed = new URL(url.trim());
  } catch {
    return undefined;
  }
  if (parsed.protocol !== "https:") return undefined;
  const host = parsed.hostname.replace(/^(www|m)\./, "");
  const segments = parsed.pathname.split("/").filter(Boolean);
  let id: string | undefined;
  if (host === "youtube.com" || host === "youtube-nocookie.com") {
    if (segments[0] === "watch") id = parsed.searchParams.get("v") ?? undefined;
    else if (["shorts", "embed", "live"].includes(segments[0] ?? "")) id = segments[1];
    if (id && YOUTUBE_ID.test(id)) return youtube(id);
    return undefined;
  }
  if (host === "youtu.be") {
    id = segments[0];
    return id && YOUTUBE_ID.test(id) ? youtube(id) : undefined;
  }
  if (host === "vimeo.com") {
    id = segments[0];
    return id && VIMEO_ID.test(id) ? vimeo(id) : undefined;
  }
  if (host === "player.vimeo.com" && segments[0] === "video") {
    id = segments[1];
    return id && VIMEO_ID.test(id) ? vimeo(id) : undefined;
  }
  return undefined;
}

function youtube(id: string): VideoEmbed {
  return {
    provider: "youtube",
    id,
    watchUrl: `https://www.youtube.com/watch?v=${id}`,
    embedUrl: `https://www.youtube-nocookie.com/embed/${id}?autoplay=1`,
  };
}

function vimeo(id: string): VideoEmbed {
  return {
    provider: "vimeo",
    id,
    watchUrl: `https://vimeo.com/${id}`,
    embedUrl: `https://player.vimeo.com/video/${id}?dnt=1&autoplay=1`,
  };
}

/**
 * Whether an address is a clip a slide can play (hero-slideshow, "Changes made while building"):
 * an `https` MP4 file on Vimeo, as its direct links give it.
 */
export function slideClip(url: string): boolean {
  let parsed: URL;
  try {
    parsed = new URL(url.trim());
  } catch {
    return false;
  }
  if (parsed.protocol !== "https:") return false;
  const host = parsed.hostname;
  const path = decodeURIComponent(parsed.pathname);
  if (host === "player.vimeo.com") {
    return (
      (path.startsWith("/progressive_redirect/") && path.includes(".mp4")) ||
      (path.startsWith("/external/") && path.endsWith(".mp4"))
    );
  }
  return /(^|\.)vimeocdn\.com$/.test(host) && path.endsWith(".mp4");
}
