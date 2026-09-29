import { beforeEach, describe, expect, it } from "vitest";
import { useServices } from "$lib/server/app";
import { getSessionUser } from "$lib/server/auth";
import { pendingInvitations } from "$lib/server/invitations";
import type { MailMessage } from "$lib/server/mail";
import { addMember, listMembers, roleIn } from "$lib/server/members";
import { defined, thrownBy, useTestProject } from "$lib/server/test-project";
import { actions as acceptActions } from "../../../invite/[token]/+page.server";
import { actions, load } from "./+page.server";

let workspace = "";
let token = "";
const project = useTestProject(() => ({ workspace, token }));
let sent: MailMessage[];

beforeEach(() => {
  sent = [];
  useServices({ mailer: { send: async (m) => void sent.push(m) } });
});

type Action = NonNullable<(typeof actions)[keyof typeof actions]>;

function post(
  action: keyof typeof actions,
  fields: Record<string, string>,
  user = project().owner,
) {
  workspace = project().workspaceId;
  const body = new FormData();
  for (const [k, v] of Object.entries(fields)) body.set(k, v);
  const event = project().event(`/w/${workspace}/members?/${action}`, user, {
    method: "POST",
    body,
  });
  return defined(actions[action] as Action)(event as unknown as Parameters<Action>[0]);
}

class FakeCookies {
  jar = new Map<string, string>();
  get = (name: string) => this.jar.get(name);
  set = (name: string, value: string) => void this.jar.set(name, value);
  delete = (name: string) => void this.jar.delete(name);
}

async function accept(link: string) {
  token = link.split("/").at(-1) ?? "";
  const cookies = new FakeCookies();
  const event = { ...project().event(`/invite/${token}`), cookies };
  const accept = defined(acceptActions.default);
  try {
    return { result: await accept(event as unknown as Parameters<typeof accept>[0]), cookies };
  } catch (thrown) {
    return { thrown: thrown as { status: number; location: string }, cookies };
  }
}

const linkIn = (m: MailMessage | undefined) =>
  /https:\S+\/invite\/\S+/.exec(m?.text ?? "")?.[0] ?? "";

describe("/w/[workspace]/members", () => {
  it("shows members to members, and not to others", async () => {
    workspace = project().workspaceId;
    const data = load(project().event(`/w/${workspace}/members`, project().owner) as never);
    expect(data).toMatchObject({
      role: "owner",
      members: [{ email: "jana@example.cz", role: "owner" }],
    });
    expect(
      await thrownBy(() =>
        load(project().event(`/w/${workspace}/members`, project().outsider) as never),
      ),
    ).toMatchObject({
      status: 404,
    });
  });

  it("lets an owner invite someone, who accepts and is signed in", async () => {
    expect(await post("invite", { email: "michal@agency.cz", role: "editor" })).toEqual({
      invited: "michal@agency.cz",
    });
    const { thrown, cookies } = await accept(linkIn(sent[0]));
    expect(thrown).toMatchObject({ status: 303, location: "/" });
    const user = getSessionUser(project().db, cookies.jar.get("session") ?? "");
    expect(user?.email).toBe("michal@agency.cz");
    expect(roleIn(project().db, user?.id ?? "", project().workspaceId)).toBe("editor");
  });

  it("refuses a used invitation link", async () => {
    await post("invite", { email: "michal@agency.cz", role: "editor" });
    await accept(linkIn(sent[0]));
    expect((await accept(linkIn(sent[0]))).result).toMatchObject({
      status: 400,
      data: { reason: "used" },
    });
  });

  it("explains refused invitations", async () => {
    expect(await post("invite", { email: "jana@example.cz", role: "editor" })).toMatchObject({
      status: 400,
      data: { invite: { message: "jana@example.cz is already a member." } },
    });
    expect(await post("invite", { email: "x@example.cz", role: "admin" })).toMatchObject({
      status: 400,
    });
  });

  it("changes roles and removes members, but keeps the last owner", async () => {
    const { db, workspaceId, owner, outsider } = project();
    addMember(db, workspaceId, outsider.id, "editor");
    expect(await post("role", { userId: owner.id, role: "editor" })).toMatchObject({
      status: 400,
      data: { change: { message: expect.stringMatching(/at least one owner/) } },
    });
    expect(await post("role", { userId: outsider.id, role: "owner" })).toEqual({ changed: true });
    expect(await post("remove", { userId: outsider.id })).toEqual({ removed: true });
    expect(listMembers(db, workspaceId).map((m) => m.email)).toEqual(["jana@example.cz"]);
  });

  it("cancels invitations", async () => {
    await post("invite", { email: "michal@agency.cz", role: "editor" });
    const id = pendingInvitations(project().db, project().workspaceId)[0]?.id ?? "";
    expect(await post("cancel", { invitationId: id })).toEqual({ cancelled: true });
    expect((await accept(linkIn(sent[0]))).result).toMatchObject({ data: { reason: "cancelled" } });
  });

  it("keeps editors from changing members", async () => {
    const { db, workspaceId, outsider } = project();
    addMember(db, workspaceId, outsider.id, "editor");
    for (const [action, fields] of [
      ["invite", { email: "x@example.cz", role: "editor" }],
      ["role", { userId: outsider.id, role: "owner" }],
      ["remove", { userId: outsider.id }],
    ] as const) {
      expect(await thrownBy(() => post(action, fields, outsider))).toMatchObject({ status: 403 });
    }
    expect(sent).toEqual([]);
  });
});
