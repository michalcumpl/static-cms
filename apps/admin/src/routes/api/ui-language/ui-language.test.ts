import { eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";
import type { Db } from "$lib/server/db/index";
import { users } from "$lib/server/db/schema";
import { useTestProject } from "$lib/server/test-project";
import { isForeignApiWrite } from "../../../hooks.server";
import { POST } from "./+server";

type Event = Parameters<typeof POST>[0];
const readUser = (db: Db, id: string) => db.select().from(users).where(eq(users.id, id)).get();
const project = useTestProject(() => ({}));

function call(language: unknown, user: { id: string; email: string } | null) {
  const set: { name: string; value: string; options: Record<string, unknown> }[] = [];
  const base = project().event("/api/ui-language", user ?? undefined, {
    method: "POST",
    body: JSON.stringify({ language }),
  });
  const event = {
    ...base,
    cookies: {
      set: (name: string, value: string, options: Record<string, unknown>) =>
        set.push({ name, value, options }),
    },
  } as unknown as Event;
  return { response: POST(event), set };
}

describe("POST /api/ui-language", () => {
  it("remembers the choice on the device and on the account", async () => {
    const { response, set } = call("cs", project().owner);
    expect(await (await response).json()).toEqual({ language: "cs" });
    expect(set).toEqual([
      expect.objectContaining({
        name: "ui_lang",
        value: "cs",
        options: expect.objectContaining({ path: "/", sameSite: "lax" }),
      }),
    ]);
    expect(readUser(project().db, project().owner.id)?.uiLanguage).toBe("cs");
  });

  it("remembers it on the device only before signing in", async () => {
    const { response, set } = call("en", null);
    expect((await response).status).toBe(200);
    expect(set[0]?.value).toBe("en");
    expect(readUser(project().db, project().owner.id)?.uiLanguage).toBeNull();
  });

  it("refuses languages it doesn't speak", async () => {
    await expect(call("de", project().owner).response).rejects.toMatchObject({ status: 400 });
  });

  it("is refused from another site, like other API writes", () => {
    const request = new Request("https://admin.example.cz/api/ui-language", {
      method: "POST",
      headers: { origin: "https://evil.example" },
    });
    expect(isForeignApiWrite(request, new URL(request.url))).toBe(true);
  });
});
