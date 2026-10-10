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

  it("Cross-site post to the admin: refused; the websites' contact forms: let through", async () => {
    const post = async (path: string, origin: string) => {
      const url = new URL(`https://admin.example.cz${path}`);
      const event = {
        request: new Request(url, {
          method: "POST",
          headers: { origin, "content-type": "application/x-www-form-urlencoded" },
          body: "name=x",
        }),
        url,
        cookies: { get: () => undefined },
        locals: {},
      } as unknown as Parameters<typeof handle>[0]["event"];
      let resolved = false;
      const response = await handle({
        event,
        resolve: async () => {
          resolved = true;
          return new Response("ok");
        },
      });
      return { status: response.status, resolved };
    };
    expect(await post("/w/w_1/new?/empty", "https://evil.example")).toEqual({
      status: 403,
      resolved: false,
    });
    expect(await post("/w/w_1/new?/empty", "https://admin.example.cz")).toEqual({
      status: 200,
      resolved: true,
    });
    expect(await post("/forms/p_1/contact_form_1", "https://pekarna-ulipy.cz")).toEqual({
      status: 200,
      resolved: true,
    });
  });
});
