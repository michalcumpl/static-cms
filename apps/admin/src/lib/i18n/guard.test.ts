import { describe, expect, it } from "vitest";
import { findMarkupText, findServerMessages, findUntranslatedText } from "./guard";

describe("untranslated text", () => {
  it("is nowhere outside the catalogues", () => {
    expect(findUntranslatedText(process.cwd())).toEqual([]);
  });
});

describe("the guard", () => {
  it("finds text and read attributes, and skips expressions, classes and ignored elements", () => {
    const source = `<p class="hint" title="Close">Hello {t("x")}</p>
<button aria-label={t("y")}>{t("z")}</button>
<code data-i18n-ignore>npm install</code>
<span>·</span><b>CS</b>`;
    expect(findMarkupText(source, "a.svelte").map((f) => f.text)).toEqual(["Close", "Hello"]);
  });

  it("finds message literals in server code", () => {
    const source = `return { ok: false, message: "Images can be at most 20 MB." }; const x = { message: t("a") };`;
    expect(findServerMessages(source, "b.ts").map((f) => f.text)).toEqual([
      "Images can be at most 20 MB.",
    ]);
  });
});
