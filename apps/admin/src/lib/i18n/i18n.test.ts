import { describe, expect, it } from "vitest";
import { cs } from "./cs";
import { en } from "./en";
import { formatDate, i18n, sayIn, translate } from "./translate";
import { type Messages, said } from "./types";

describe("translate", () => {
  it("fills named parameters", () => {
    expect(translate("en", "shell.account", { email: "jana@example.cz" })).toBe(
      "Account: jana@example.cz",
    );
    expect(translate("cs", "shell.signedInAs", { email: "jana@example.cz" })).toBe(
      "Přihlášeni jako jana@example.cz",
    );
  });

  it("chooses plural forms: 1 web, 3 weby, 5 webů", () => {
    const czech = [1, 3, 5].map((count) => translate("cs", "projects.count", { count }));
    expect(czech).toEqual(["1 web", "3 weby", "5 webů"]);
    const english = [1, 3, 5].map((count) => translate("en", "projects.count", { count }));
    expect(english).toEqual(["1 website", "3 websites", "5 websites"]);
  });

  it("formats dates for the language", () => {
    const date = new Date(2026, 9, 1, 14, 5);
    expect(formatDate("cs", date)).toBe("1. 10. 2026 14:05");
    expect(formatDate("en", date)).toBe("1 Oct 2026, 14:05");
    expect(i18n("cs").formatDate(date, "date")).toBe("1. 10. 2026");
  });

  it("formats numbers in parameters", () => {
    expect(translate("cs", "projects.count", { count: 1200 })).toBe("1\u00a0200 webů");
  });
});

describe("catalogues", () => {
  it("have the same keys in Czech and English", () => {
    const keys = (value: unknown, prefix = ""): string[] =>
      typeof value === "object" && value !== null && !("other" in value)
        ? Object.entries(value).flatMap(([k, v]) => keys(v, `${prefix}${k}.`))
        : [prefix.slice(0, -1)];
    expect(keys(cs).sort()).toEqual(keys(en).sort());
  });

  it("refuse an incomplete Czech catalogue at type-check time", () => {
    // @ts-expect-error: shell.signOut is missing, which `pnpm typecheck` must report.
    const incomplete: Messages = { ...cs, shell: { ...cs.shell, signOut: undefined } };
    expect(incomplete).toBeDefined();
  });
});

describe("messages chosen on the server", () => {
  it("says a message and its message parameters in the reader's language", () => {
    const failure = said("server.netlify.failed", {
      action: said("server.netlify.actions.upload", { path: "obrazky/chleb.webp" }),
      detail: "500",
    });
    expect(sayIn("cs", failure)).toBe("Netlify se nepodařilo nahrát obrazky/chleb.webp (500).");
    expect(i18n("en").say(failure)).toBe("Netlify couldn't upload obrazky/chleb.webp (500).");
  });
});
