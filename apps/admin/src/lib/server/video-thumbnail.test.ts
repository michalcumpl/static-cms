import sharp from "sharp";
import { describe, expect, it } from "vitest";
import { fetchVideoThumbnail, withoutBars } from "./video-thumbnail";

// Thumbnails fetched by our server, never by visitors (video design, "Changes made while building").

const jpeg = new Uint8Array([0xff, 0xd8, 0xff, 0xd9]);

/** A fake fetch answering from `answers` by address, 404 otherwise, recording what was asked. */
function fakeFetch(answers: Record<string, () => Response>) {
  const asked: string[] = [];
  const fetcher = (async (input: URL | string) => {
    const url = String(input);
    asked.push(url);
    return answers[url]?.() ?? new Response("", { status: 404 });
  }) as typeof fetch;
  return { fetcher, asked };
}

describe("fetchVideoThumbnail", () => {
  it("takes YouTube's largest picture, else the high-quality one", async () => {
    const { fetcher, asked } = fakeFetch({
      "https://i.ytimg.com/vi/wNdrFte2T4w/hqdefault.jpg": () => new Response(jpeg),
    });
    const result = await fetchVideoThumbnail("https://youtu.be/wNdrFte2T4w", fetcher);
    expect(result).toEqual({ ok: true, name: "youtube-wNdrFte2T4w.jpg", bytes: jpeg });
    expect(asked).toEqual([
      "https://i.ytimg.com/vi/wNdrFte2T4w/maxresdefault.jpg",
      "https://i.ytimg.com/vi/wNdrFte2T4w/hqdefault.jpg",
    ]);
  });

  it("asks Vimeo's oEmbed for the picture, and fetches it only from Vimeo's image host", async () => {
    const oembed =
      "https://vimeo.com/api/oembed.json?url=https%3A%2F%2Fvimeo.com%2F697475416&width=1280";
    const ok = fakeFetch({
      [oembed]: () => Response.json({ thumbnail_url: "https://i.vimeocdn.com/video/1_1280.jpg" }),
      "https://i.vimeocdn.com/video/1_1280.jpg": () => new Response(jpeg),
    });
    expect(await fetchVideoThumbnail("https://vimeo.com/697475416", ok.fetcher)).toEqual({
      ok: true,
      name: "vimeo-697475416.jpg",
      bytes: jpeg,
    });
    const elsewhere = fakeFetch({
      [oembed]: () => Response.json({ thumbnail_url: "http://169.254.169.254/latest/meta-data" }),
    });
    expect(await fetchVideoThumbnail("https://vimeo.com/697475416", elsewhere.fetcher)).toEqual({
      ok: false,
      reason: "unavailable",
    });
    expect(elsewhere.asked).toEqual([oembed]);
  });

  it("refuses addresses that aren't videos without asking anyone", async () => {
    const { fetcher, asked } = fakeFetch({});
    expect(await fetchVideoThumbnail("https://www.youtube.com/@anideti", fetcher)).toEqual({
      ok: false,
      reason: "not-video",
    });
    expect(asked).toEqual([]);
  });

  it("says when the provider has no picture", async () => {
    const { fetcher } = fakeFetch({});
    expect(await fetchVideoThumbnail("https://youtu.be/wNdrFte2T4w", fetcher)).toEqual({
      ok: false,
      reason: "unavailable",
    });
  });

  it("trims the black bars of YouTube's smaller pictures", async () => {
    // 480 × 360 with 45 pixels of black above and below a 480 × 270 picture.
    const picture = await sharp({
      create: { width: 480, height: 270, channels: 3, background: "#3a7" },
    })
      .extend({ top: 45, bottom: 45, background: "#000000" })
      .jpeg()
      .toBuffer();
    const trimmed = await sharp(await withoutBars(new Uint8Array(picture))).metadata();
    expect([trimmed.width, trimmed.height]).toEqual([480, 270]);
  });
});
