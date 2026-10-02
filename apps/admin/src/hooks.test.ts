import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const APP_HTML = readFileSync("src/app.html", "utf8");

import { handle } from "./hooks.server";

describe("handle", () => {
  it("resolves the language and writes it into <html lang>", async () => {
    const event = {
      request: new Request("https://admin.example.cz/signin", {
        headers: { "accept-language": "cs-CZ,cs;q=0.9" },
      }),
      url: new URL("https://admin.example.cz/signin"),
      cookies: { get: () => undefined },
      locals: {},
    } as unknown as Parameters<typeof handle>[0]["event"];
    let html = "";
    await handle({
      event,
      resolve: async (_event, opts) => {
        html = (await opts?.transformPageChunk?.({ html: APP_HTML, done: true })) ?? "";
        return new Response(html);
      },
    });
    expect(event.locals.locale).toBe("cs");
    expect(html).toContain('<html lang="cs">');
    expect(html).not.toContain('lang="%lang%"');
  });
});
