import { beforeEach, describe, expect, it } from "vitest";
import { useServices } from "$lib/server/app";
import { getSessionUser, RateLimiter } from "$lib/server/auth";
import { type Db, openDatabase } from "$lib/server/db/index";
import { loginTokens, users } from "$lib/server/db/schema";
import { newId } from "$lib/server/ids";
import type { MailMessage } from "$lib/server/mail";
import { defined } from "$lib/server/test-project";
import { handle, isForeignApiWrite } from "../../hooks.server";
import { actions as signinActions } from "./+page.server";
import { actions as tokenActions } from "./[token]/+page.server";

const signin = defined(signinActions.default);
const continueSignIn = defined(tokenActions.default);

let db: Db;
let sent: MailMessage[];
let userId: string;

beforeEach(() => {
  db = openDatabase(":memory:");
  sent = [];
  userId = newId("u");
  db.insert(users).values({ id: userId, email: "jana@example.cz", createdAt: new Date() }).run();
  useServices({
    db,
    mailer: { send: async (m) => void sent.push(m) },
    limiter: new RateLimiter(5, 900_000),
  });
});

class FakeCookies {
  jar = new Map<string, { value: string; options: Record<string, unknown> }>();
  get = (name: string) => this.jar.get(name)?.value;
  set = (name: string, value: string, options: Record<string, unknown>) =>
    void this.jar.set(name, { value, options });
  delete = (name: string) => void this.jar.delete(name);
}

function signinEvent(email: string, next = "") {
  const url = new URL(
    `https://admin.example.cz/signin${next ? `?next=${encodeURIComponent(next)}` : ""}`,
  );
  const body = new FormData();
  body.set("email", email);
  return {
    request: new Request(url, { method: "POST", body }),
    url,
    getClientAddress: () => "203.0.113.5",
  } as unknown as Parameters<typeof signin>[0];
}

async function signInLink(next = "") {
  await signin(signinEvent("jana@example.cz", next));
  return new URL(/https:\S+/.exec(sent.at(-1)?.text ?? "")?.[0] ?? "");
}

async function follow(link: URL, cookies = new FakeCookies()) {
  const token = link.pathname.split("/").at(-1) ?? "";
  const event = { params: { token }, url: link, cookies } as unknown as Parameters<
    typeof continueSignIn
  >[0];
  try {
    return { result: await continueSignIn(event), cookies };
  } catch (thrown) {
    return { thrown: thrown as { status: number; location: string }, cookies };
  }
}

describe("/signin", () => {
  it("answers the same for unknown addresses and sends nothing", async () => {
    const known = await signin(signinEvent("jana@example.cz"));
    const unknown = await signin(signinEvent("nobody@example.cz"));
    expect(known).toEqual({ email: "jana@example.cz", sent: true });
    expect(unknown).toEqual({ email: "nobody@example.cz", sent: true });
    expect(sent.map((m) => m.to)).toEqual(["jana@example.cz"]);
  });

  it("puts a link to this server in the email", async () => {
    const link = await signInLink("/p/p_1/edit/");
    expect(link.origin).toBe("https://admin.example.cz");
    expect(link.pathname).toMatch(/^\/signin\/[A-Za-z0-9_-]{43}$/);
    expect(link.searchParams.get("next")).toBe("/p/p_1/edit/");
  });
});

describe("/signin/[token]", () => {
  it("has no load, so opening the link doesn't use the token", async () => {
    const module = await import("./[token]/+page.server");
    expect("load" in module).toBe(false);
    await signInLink();
    expect(db.select().from(loginTokens).get()?.usedAt).toBeNull();
  });

  it("signs in on Continue, sets a secure session cookie and goes to next", async () => {
    const { thrown, cookies } = await follow(await signInLink("/p/p_1/edit/"));
    expect(thrown).toMatchObject({ status: 303, location: "/p/p_1/edit/" });
    const cookie = cookies.jar.get("session");
    expect(cookie?.options).toMatchObject({
      httpOnly: true,
      sameSite: "lax",
      secure: true,
      path: "/",
    });
    expect(getSessionUser(db, cookie?.value ?? "")).toEqual({
      id: userId,
      email: "jana@example.cz",
    });
  });

  it("refuses a used link", async () => {
    const link = await signInLink();
    await follow(link);
    const second = await follow(link);
    expect(second.result).toMatchObject({ status: 400, data: { reason: "used" } });
    expect(second.cookies.jar.size).toBe(0);
  });
});

describe("cross-site API writes", () => {
  const put = (origin: string | null, path = "/api/projects/p_1/site") =>
    new Request(`https://admin.example.cz${path}`, {
      method: "PUT",
      headers: origin ? { origin } : {},
    });
  const url = (path = "/api/projects/p_1/site") => new URL(`https://admin.example.cz${path}`);

  it("are refused unless they come from this origin", () => {
    expect(isForeignApiWrite(put("https://evil.example"), url())).toBe(true);
    expect(isForeignApiWrite(put(null), url())).toBe(true);
    expect(isForeignApiWrite(put("https://admin.example.cz"), url())).toBe(false);
    expect(isForeignApiWrite(new Request(url()), url())).toBe(false);
    expect(isForeignApiWrite(put("https://evil.example", "/signin"), url("/signin"))).toBe(false);
  });

  it("get 403 from the hook before any route runs", async () => {
    let resolved = false;
    const response = await handle({
      event: {
        request: put("https://evil.example"),
        url: url(),
        cookies: new FakeCookies(),
        locals: {},
      },
      resolve: async () => {
        resolved = true;
        return new Response("ok");
      },
    } as unknown as Parameters<typeof handle>[0]);
    expect(response.status).toBe(403);
    expect(resolved).toBe(false);
  });
});
