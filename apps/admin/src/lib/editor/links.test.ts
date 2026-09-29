import { describe, expect, it } from "vitest";
import { checkLinkAddress } from "./links";

describe("checkLinkAddress", () => {
  it.each(["https://example.com", " http://a.cz/x ", "mailto:a@b.cz", "tel:+420123", "/kontakt/"])(
    "accepts %j",
    (input) => {
      expect(checkLinkAddress(input)).toEqual({ ok: true, href: input.trim() });
    },
  );

  it.each([
    "javascript:alert(1)",
    "data:text/html,x",
    "//evil.example",
    "www.example.com",
    "ftp://x",
  ])("refuses %j and lists the allowed addresses", (input) => {
    const result = checkLinkAddress(input);
    expect(result.ok).toBe(false);
    expect(!result.ok && result.message).toMatch(/https:\/\/, http:\/\/, mailto: or tel:/);
  });

  it("asks for an address when empty", () => {
    expect(checkLinkAddress("  ")).toMatchObject({
      ok: false,
      message: expect.stringMatching(/^Enter /),
    });
  });
});
