import { describe, expect, it } from "vitest";
import { editableDemoSite, loadDemoMedia } from "../test/fixtures.js";
import { exportSite } from "./index.js";
import { AI_SEARCH_AGENTS, AI_TRAINING_AGENTS } from "./robots.js";

function robots(allowAiSearch: boolean, allowAiTraining: boolean, siteUrl?: string) {
  const { doc, nodes } = editableDemoSite();
  nodes.site_1.allow_ai_search = allowAiSearch;
  nodes.site_1.allow_ai_training = allowAiTraining;
  nodes.site_1.base_url = "";
  const result = exportSite(doc, loadDemoMedia(), siteUrl ? { siteUrl } : {});
  if (!result.ok) throw new Error("export failed");
  return new TextDecoder().decode(result.files.get("robots.txt"));
}

const agents = (text: string) => [...text.matchAll(/^User-agent: (.+)$/gm)].map((m) => m[1]);

describe("robots.txt", () => {
  it("allows everything and names the sitemap", () => {
    expect(robots(true, true, "https://anideti.cz")).toBe(
      "User-agent: *\nAllow: /\n\nSitemap: https://anideti.cz/sitemap.xml\n",
    );
  });

  it("disallows only the AI training crawlers", () => {
    const text = robots(true, false, "https://anideti.cz");
    expect(text).toBe(
      `${AI_TRAINING_AGENTS.map((a) => `User-agent: ${a}\n`).join("")}Disallow: /\n\nUser-agent: *\nAllow: /\n\nSitemap: https://anideti.cz/sitemap.xml\n`,
    );
    for (const agent of ["GPTBot", "ClaudeBot", "CCBot", "Google-Extended"]) {
      expect(agents(text)).toContain(agent);
    }
    expect(agents(text)).not.toContain("OAI-SearchBot");
    expect(agents(text)).not.toContain("Googlebot");
  });

  it("disallows only the AI search crawlers", () => {
    const text = robots(false, true);
    expect(agents(text)).toEqual([...AI_SEARCH_AGENTS, "*"]);
    expect(text.match(/Disallow: \//g)).toHaveLength(1);
  });

  it("disallows both groups when both are off", () => {
    const text = robots(false, false);
    expect(agents(text)).toEqual([...AI_SEARCH_AGENTS, ...AI_TRAINING_AGENTS, "*"]);
    expect(text.match(/Disallow: \//g)).toHaveLength(2);
  });

  it("has no sitemap line without the site's address", () => {
    expect(robots(true, true)).toBe("User-agent: *\nAllow: /\n");
  });

  it("never lists search engines or link-preview fetchers", () => {
    const all: readonly string[] = [...AI_SEARCH_AGENTS, ...AI_TRAINING_AGENTS];
    for (const agent of ["Googlebot", "Bingbot", "Applebot", "facebookexternalhit", "Twitterbot"]) {
      expect(all).not.toContain(agent);
    }
  });
});
