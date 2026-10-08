import { describe, expect, it } from "vitest";
import { slideClip, videoEmbed } from "./video.js";

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

describe("slideClip", () => {
  it.each([
    "https://player.vimeo.com/progressive_redirect/playback/1211966340/rendition/1080p/file.mp4%20%281080p%29.mp4?loc=external&log_user=0&signature=abc#t=1",
    "https://player.vimeo.com/external/647689930.hd.mp4?s=5b9ff86f",
    "https://vod-progressive.akamaized.vimeocdn.com/exp=1/video/1.mp4",
  ])("accepts %s", (url) => {
    expect(slideClip(url)).toBe(true);
  });

  it.each([
    "",
    "http://player.vimeo.com/external/647689930.hd.mp4",
    "https://vimeo.com/697475416",
    "https://player.vimeo.com/video/697475416",
    "https://evil.example/player.vimeo.com/external/1.mp4",
    "https://player.vimeo.com.evil.example/external/1.mp4",
  ])("refuses %s", (url) => {
    expect(slideClip(url)).toBe(false);
  });
});
