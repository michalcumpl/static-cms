import { HtmlValidate } from "html-validate";
import { describe, expect, it } from "vitest";
import { editableImageBlocksSite, homeListedSecondSite, loadDemoSite } from "../test/fixtures.js";
import { renderSite } from "./index.js";

function renderDemo(doc: unknown = loadDemoSite()) {
  const result = renderSite(doc);
  if (!result.ok) throw new Error(JSON.stringify(result.problems));
  return result.site;
}

describe("demo site output", () => {
  const site = renderDemo();

  it.each(site.pages.map((p) => [p.path, p.html]))(
    "matches the snapshot of %s",
    async (path, html) => {
      await expect(html).toMatchFileSnapshot(`__snapshots__/demo/${path}`);
    },
  );

  it("matches the stylesheet snapshot", async () => {
    await expect(site.css).toMatchFileSnapshot("__snapshots__/demo/assets/style.css");
  });

  const homeSecond = renderDemo(homeListedSecondSite());
  const imageBlocks = renderDemo(editableImageBlocksSite().doc);
  const galerie = imageBlocks.pages.find((p) => p.path === "galerie/index.html");

  it("matches the snapshot of the image blocks page", async () => {
    await expect(galerie?.html).toMatchFileSnapshot(
      "__snapshots__/image-blocks/galerie/index.html",
    );
  });

  it.each([...site.pages, ...homeSecond.pages, ...imageBlocks.pages].map((p) => [p.path, p.html]))(
    "%s passes html-validate",
    async (_path, html) => {
      const validator = new HtmlValidate({
        extends: ["html-validate:recommended"],
        // Doctype case is a style preference; the rendering spec pins lowercase `<!doctype html>`.
        rules: { "doctype-style": "off" },
      });
      const report = await validator.validateString(html);
      const messages = report.results.flatMap((r) =>
        r.messages.map((m) => `${m.line}:${m.column} ${m.ruleId}: ${m.message}`),
      );
      expect(messages).toEqual([]);
    },
  );

  it("is byte-identical across renders", () => {
    expect(renderDemo()).toEqual(site);
    expect(JSON.stringify(renderDemo())).toBe(JSON.stringify(site));
  });
});
