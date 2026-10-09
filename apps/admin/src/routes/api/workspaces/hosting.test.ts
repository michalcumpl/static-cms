import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { hostingConnections, users } from "$lib/server/db/schema";
import { newId } from "$lib/server/ids";
import { addMember } from "$lib/server/members";
import { type FakeNetlify, startFakeNetlify } from "$lib/server/publishing/fake-netlify";
import { thrownBy, useTestProject } from "$lib/server/test-project";
import { load as hostingPage } from "../../w/[workspace]/hosting/+page.server";
import { DELETE, GET, PUT } from "./[workspace]/hosting/+server";
import { POST as listTeamsRoute } from "./[workspace]/hosting/teams/+server";

type Event = Parameters<typeof GET>[0];
type User = { id: string; email: string };

const TOKEN = "nfp_secret_token_abc123";
let fake: FakeNetlify;
const project = useTestProject(() => ({ workspace: project().workspaceId }));

beforeEach(async () => {
  fake = await startFakeNetlify();
  fake.addToken(TOKEN, [
    { slug: "anideti", name: "Aniděti" },
    { slug: "jana", name: "Personal" },
  ]);
  process.env.NETLIFY_API_URL = fake.url;
  process.env.SECRET_KEY = "k".repeat(40);
});
afterEach(async () => {
  delete process.env.NETLIFY_API_URL;
  delete process.env.SECRET_KEY;
  await fake.close();
});

const base = () => `/api/workspaces/${project().workspaceId}/hosting`;
const event = (path: string, user: User | null, init?: RequestInit) =>
  project().event(path, user ?? undefined, init) as unknown as Event;
const put = (body: unknown, user: User | null = project().owner) =>
  PUT(event(base(), user, { method: "PUT", body: JSON.stringify(body) }));
const teams = (token: string, user: User | null = project().owner) =>
  listTeamsRoute(
    event(`${base()}/teams`, user, { method: "POST", body: JSON.stringify({ token }) }) as never,
  );

function editor(): User {
  const { db, workspaceId } = project();
  const user = { id: newId("u"), email: "petr@example.cz" };
  db.insert(users)
    .values({ ...user, createdAt: new Date() })
    .run();
  addMember(db, workspaceId, user.id, "editor");
  return user;
}

describe("connecting a workspace to Netlify", () => {
  it("lists the token's teams, connects the chosen one, and shows it", async () => {
    const listed = await teams(TOKEN);
    expect(await listed.json()).toEqual({
      teams: [
        { slug: "anideti", name: "Aniděti" },
        { slug: "jana", name: "Personal" },
      ],
    });
    const connected = await put({ token: TOKEN, account: "anideti" });
    expect(connected.status).toBe(200);
    const shown = await (await GET(event(base(), project().owner))).json();
    expect(shown.connection).toMatchObject({
      provider: "netlify",
      accountSlug: "anideti",
      accountName: "Aniděti",
      connectedBy: "jana@example.cz",
    });
  });

  it("rejects a token Netlify refuses, and stores nothing", async () => {
    expect((await teams("bad")).status).toBe(422);
    const response = await put({ token: "bad", account: "anideti" });
    expect(response.status).toBe(422);
    expect(await response.json()).toEqual({
      message: "Netlify refused this token. Check it and try again.",
    });
    expect(project().db.select().from(hostingConnections).all()).toEqual([]);
  });

  it("refuses a team the token can't publish into", async () => {
    expect((await put({ token: TOKEN, account: "someone-else" })).status).toBe(422);
  });

  it("never returns the token, and stores it only encrypted", async () => {
    const responses = [
      await teams(TOKEN),
      await put({ token: TOKEN, account: "anideti" }),
      await GET(event(base(), project().owner)),
    ];
    for (const response of responses) expect(await response.text()).not.toContain(TOKEN);
    const [row] = project().db.select().from(hostingConnections).all();
    expect(JSON.stringify(row)).not.toContain(TOKEN);
    expect(row?.tokenEncrypted).toMatch(/^v1\./);
  });

  it("lets editors see the connection but not change it", async () => {
    await put({ token: TOKEN, account: "anideti" });
    const petr = editor();
    expect((await (await GET(event(base(), petr))).json()).connection.accountName).toBe("Aniděti");
    expect(await thrownBy(() => put({ token: TOKEN, account: "anideti" }, petr))).toMatchObject({
      status: 403,
    });
    expect(await thrownBy(() => teams(TOKEN, petr))).toMatchObject({ status: 403 });
    expect(await thrownBy(() => DELETE(event(base(), petr, { method: "DELETE" })))).toMatchObject({
      status: 403,
    });
  });

  it("disconnects", async () => {
    await put({ token: TOKEN, account: "anideti" });
    expect((await DELETE(event(base(), project().owner, { method: "DELETE" }))).status).toBe(204);
    expect((await (await GET(event(base(), project().owner))).json()).connection).toBeNull();
  });

  it("refuses to connect without SECRET_KEY", async () => {
    delete process.env.SECRET_KEY;
    const response = await put({ token: TOKEN, account: "anideti" });
    expect(response.status).toBe(503);
    expect((await response.json()).message).toMatch(/isn't set up on this server/);
  });

  it("is only for members of the workspace", async () => {
    expect(await thrownBy(() => GET(event(base(), null)))).toMatchObject({ status: 401 });
    expect(await thrownBy(() => GET(event(base(), project().outsider)))).toMatchObject({
      status: 404,
    });
  });
});

describe("on a server with Webmio hosting", () => {
  type PageEvent = Parameters<typeof hostingPage>[0];
  const page = async () =>
    (await hostingPage(
      project().event(
        `/w/${project().workspaceId}/hosting`,
        project().owner,
      ) as unknown as PageEvent,
    )) as { webmio: boolean; connection: unknown };
  let folder: string;
  beforeEach(() => {
    folder = mkdtempSync(join(tmpdir(), "webmio-hosting-page-"));
    process.env.WEBMIO_HOSTING_FAKE_DIR = folder;
  });
  afterEach(() => {
    delete process.env.WEBMIO_HOSTING_FAKE_DIR;
    rmSync(folder, { recursive: true, force: true });
  });

  it("Webmio hosting, not connected: hosted by Webmio, nothing to connect", async () => {
    expect(await page()).toMatchObject({ webmio: true, connection: null });
    const response = await put({ token: TOKEN, account: "anideti" });
    expect(response.status).toBe(409);
    expect((await response.json()).message).toBe(
      "Websites on this server are hosted by Webmio; there's nothing to connect.",
    );
  });

  it("shows a workspace's existing connection, so an owner can disconnect it", async () => {
    delete process.env.WEBMIO_HOSTING_FAKE_DIR;
    expect((await put({ token: TOKEN, account: "anideti" })).status).toBe(200);
    process.env.WEBMIO_HOSTING_FAKE_DIR = folder;
    expect(await page()).toMatchObject({
      webmio: true,
      connection: { accountName: "Aniděti" },
    });
    expect((await DELETE(event(base(), project().owner, { method: "DELETE" }))).status).toBe(204);
    expect((await page()).connection).toBeNull();
  });
});
