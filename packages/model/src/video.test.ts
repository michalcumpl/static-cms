import { describe, expect, it } from "vitest";
import { videoEmbed } from "./video.js";

describe("videoEmbed", () => {
  it.each([
    "https://www.youtube.com/watch?v=wNdrFte2T4w",
    "https://youtube.com/watch?v=wNdrFte2T4w&t=42s",
    "https://m.youtube.com/watch?feature=share&v=wNdrFte2T4w",
    "https://youtu.be/wNdrFte2T4w",
    "https://youtu.be/wNdrFte2T4w?si=abc",
    "https://www.youtube.com/shorts/wNdrFte2T4w",
    "https://www.youtube.com/embed/wNdrFte2T4w",
    "https://www.youtube-nocookie.com/embed/wNdrFte2T4w",
  ])("reads the YouTube video in %s", (url) => {
    expect(videoEmbed(url)).toEqual({
      provider: "youtube",
      id: "wNdrFte2T4w",
      watchUrl: "https://www.youtube.com/watch?v=wNdrFte2T4w",
      embedUrl: "https://www.youtube-nocookie.com/embed/wNdrFte2T4w?autoplay=1",
    });
  });

  it.each(["https://vimeo.com/697475416", "https://player.vimeo.com/video/697475416?badge=0"])(
    "reads the Vimeo video in %s",
    (url) => {
      expect(videoEmbed(url)).toEqual({
        provider: "vimeo",
        id: "697475416",
        watchUrl: "https://vimeo.com/697475416",
        embedUrl: "https://player.vimeo.com/video/697475416?dnt=1&autoplay=1",
      });
    },
  );

  it.each([
    "",
    "not an address",
    "http://www.youtube.com/watch?v=wNdrFte2T4w",
    "https://www.youtube.com/@anideti",
    "https://www.youtube.com/watch?v=short",
    "https://youtu.be/",
    "https://vimeo.com/channels/staffpicks",
    "https://www.csfd.cz/film/123/",
    "https://evil.com/youtube.com/watch?v=wNdrFte2T4w",
  ])("refuses %s", (url) => {
    expect(videoEmbed(url)).toBeUndefined();
  });
});
