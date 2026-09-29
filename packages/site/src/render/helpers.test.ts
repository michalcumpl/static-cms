import { describe, expect, it } from "vitest";
import type { TextValue } from "../schema/index.js";
import { editableDemoSite, loadDemoSite } from "../test/fixtures.js";
import { isValidBasePath, RenderContext } from "./context.js";
import { escapeHtml, html } from "./html.js";
import { renderText } from "./text.js";

function text(content: string, marks: [number, number, string][] = []): TextValue {
  return {
    content,
    marks: marks.map(([start_offset, end_offset, node_id]) => ({
      start_offset,
      end_offset,
      node_id,
    })),
    annotations: [],
  };
}

describe("html", () => {
  it("escapes interpolated text", () => {
    expect(escapeHtml(`<a href="x" title='y'>&</a>`)).toBe(
      "&lt;a href=&quot;x&quot; title=&#39;y&#39;&gt;&amp;&lt;/a&gt;",
    );
    expect(html`<p>${"<script>alert(1)</script>"}</p>`.value).toBe(
      "<p>&lt;script&gt;alert(1)&lt;/script&gt;</p>",
    );
  });

  it("passes nested markup through and skips empty values", () => {
    const inner = html`<em>${"a&b"}</em>`;
    expect(html`<p>${inner}${false}${undefined}${[inner, "<"]}</p>`.value).toBe(
      "<p><em>a&amp;b</em><em>a&amp;b</em>&lt;</p>",
    );
  });
});

describe("base path", () => {
  it.each(["/", "/preview/", "/web/site/"])("accepts %j", (path) => {
    expect(isValidBasePath(path)).toBe(true);
  });

  it.each(["", "preview", "/preview", "preview/", "//", "/a b/", "/../", "/./", "/a/../"])(
    "rejects %j",
    (path) => {
      expect(isValidBasePath(path)).toBe(false);
    },
  );

  it("prefixes page and asset URLs", () => {
    const ctx = new RenderContext(loadDemoSite(), "/preview/");
    expect(ctx.pageUrl("page_home")).toBe("/preview/");
    expect(ctx.pageUrl("page_contact")).toBe("/preview/kontakt/");
    expect(ctx.url("assets/style.css")).toBe("/preview/assets/style.css");
  });
});

describe("renderText", () => {
  const ctx = new RenderContext(loadDemoSite(), "/");

  it("wraps marked runs", () => {
    expect(renderText(text("Call us today", [[0, 7, "strong_about"]]), ctx).value).toBe(
      "<strong>Call us</strong> today",
    );
    expect(
      renderText(
        text("a b c", [
          [0, 1, "emphasis_cakes"],
          [4, 5, "strong_about"],
        ]),
        ctx,
      ).value,
    ).toBe("<em>a</em> b <strong>c</strong>");
  });

  it("renders links, including links to pages by ID", () => {
    expect(renderText(text("Volejte", [[0, 7, "link_tel"]]), ctx).value).toBe(
      '<a href="tel:+420321123456">Volejte</a>',
    );
    expect(renderText(text("viz Kontakt", [[4, 11, "internal_contact"]]), ctx).value).toBe(
      'viz <a href="/kontakt/">Kontakt</a>',
    );
  });

  it("follows the page's current slug", () => {
    const { doc, nodes } = editableDemoSite();
    nodes.page_contact.slug = "kontakty";
    const renamed = new RenderContext(doc, "/");
    expect(renderText(text("Kontakt", [[0, 7, "internal_contact"]]), renamed).value).toBe(
      '<a href="/kontakty/">Kontakt</a>',
    );
  });

  it("keeps Czech diacritics and counts offsets in graphemes", () => {
    expect(renderText(text("Čerstvý chléb", [[8, 13, "strong_about"]]), ctx).value).toBe(
      "Čerstvý <strong>chléb</strong>",
    );
    expect(renderText(text("👋🏽 Ahoj", [[2, 6, "strong_about"]]), ctx).value).toBe(
      "👋🏽 <strong>Ahoj</strong>",
    );
    expect(renderText(text("Světe!", [[0, 5, "strong_about"]]), ctx).value).toBe(
      "<strong>Světe</strong>!",
    );
  });

  it("escapes text, also inside marks", () => {
    expect(renderText(text("<script>alert(1)</script>"), ctx).value).toBe(
      "&lt;script&gt;alert(1)&lt;/script&gt;",
    );
    expect(renderText(text("<b>x</b>", [[0, 8, "strong_about"]]), ctx).value).toBe(
      "<strong>&lt;b&gt;x&lt;/b&gt;</strong>",
    );
  });

  it("turns newlines into line breaks", () => {
    expect(renderText(text("Lipová 12\n280 02 Kolín"), ctx).value).toBe(
      "Lipová 12<br>280 02 Kolín",
    );
  });

  it("refuses to emit an unsafe link even if validation was skipped", () => {
    const { doc, nodes } = editableDemoSite();
    nodes.link_tel.href = "javascript:alert(1)";
    const unchecked = new RenderContext(doc, "/");
    expect(() => renderText(text("x", [[0, 1, "link_tel"]]), unchecked)).toThrow(/Unsafe link/);
  });
});

describe("renderText: phone links", () => {
  const ctx = new RenderContext(loadDemoSite(), "/");

  it("keeps phone numbers on one line", () => {
    expect(renderText(text("+420 321-123", [[0, 12, "link_tel"]]), ctx).value).toBe(
      '<a href="tel:+420321123456">+420 321‑123</a>',
    );
  });

  it("leaves other links alone", () => {
    expect(renderText(text("a b-c", [[0, 5, "link_map"]]), ctx).value).toContain(">a b-c</a>");
  });
});
