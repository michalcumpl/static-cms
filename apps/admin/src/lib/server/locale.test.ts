import { describe, expect, it } from "vitest";
import { browserLocale, resolveLocale } from "./locale";

describe("browserLocale", () => {
  it("takes the first of Czech or English by preference", () => {
    expect(browserLocale("cs-CZ,cs;q=0.9,en;q=0.8")).toBe("cs");
    expect(browserLocale("de-DE,de;q=0.9,en-US;q=0.7,cs;q=0.5")).toBe("en");
    expect(browserLocale("en;q=0.4, cs;q=0.8")).toBe("cs");
    expect(browserLocale("sk,de")).toBeUndefined();
    expect(browserLocale(null)).toBeUndefined();
  });

  it("ignores languages refused with q=0", () => {
    expect(browserLocale("cs;q=0, en")).toBe("en");
  });
});

describe("resolveLocale", () => {
  it("prefers the account, then the device, then the browser, then English", () => {
    const czechBrowser = "cs-CZ,cs;q=0.9";
    expect(
      resolveLocale({ user: { uiLanguage: "en" }, cookie: "cs", acceptLanguage: czechBrowser }),
    ).toBe("en");
    expect(
      resolveLocale({ user: { uiLanguage: null }, cookie: "en", acceptLanguage: czechBrowser }),
    ).toBe("en");
    expect(resolveLocale({ acceptLanguage: czechBrowser })).toBe("cs");
    expect(resolveLocale({ acceptLanguage: "de" })).toBe("en");
    expect(resolveLocale({})).toBe("en");
  });

  it("ignores values that aren't languages it speaks", () => {
    expect(resolveLocale({ user: { uiLanguage: "fr" }, cookie: "xx", acceptLanguage: "cs" })).toBe(
      "cs",
    );
  });
});
