import { beforeEach, describe, expect, it } from "vitest";
import { type Db, openDatabase } from "./db/index";
import { users } from "./db/schema";
import { newId } from "./ids";
import {
  acceptInvitation,
  cancelInvitation,
  INVITATION_TTL,
  invite,
  pendingInvitations,
} from "./invitations";
import type { MailMessage } from "./mail";
import { addMember, createWorkspace, listWorkspaces, roleIn } from "./members";

let db: Db;
let sent: MailMessage[];
const mailer = { send: async (m: MailMessage) => void sent.push(m) };

function user(email: string): string {
  const id = newId("u");
  db.insert(users).values({ id, email, createdAt: new Date() }).run();
  return id;
}

const tokenFrom = (m: MailMessage | undefined) =>
  /\/invite\/([A-Za-z0-9_-]+)/.exec(m?.text ?? "")?.[1] ?? "";

let owner = "";
let workspaceId = "";
beforeEach(() => {
  db = openDatabase(":memory:");
  sent = [];
  owner = user("michal@agency.cz");
  workspaceId = createWorkspace(db, "Pekárna U Lípy", owner);
});

const request = (email: string, role: "owner" | "editor" = "owner", actorId = owner) => ({
  actorId,
  workspaceId,
  email,
  role,
  origin: "https://admin.example.cz",
});

describe("invitations", () => {
  it("invites a client who gets an account and becomes owner", async () => {
    expect(await invite(db, mailer, request("Jana@Example.cz"))).toMatchObject({ ok: true });
    expect(sent[0]?.to).toBe("jana@example.cz");
    expect(sent[0]?.text).toContain("https://admin.example.cz/invite/");
    expect(sent[0]?.subject).toContain("Pekárna U Lípy");

    const accepted = acceptInvitation(db, tokenFrom(sent[0]));
    expect(accepted).toMatchObject({ ok: true, workspaceId });
    const jana = accepted.ok ? accepted.userId : "";
    expect(roleIn(db, jana, workspaceId)).toBe("owner");
    expect(pendingInvitations(db, workspaceId)).toEqual([]);
  });

  it("adds an existing account to a second workspace", async () => {
    const eva = user("eva@example.cz");
    const other = createWorkspace(db, "Kadeřnictví Eva", eva);
    await invite(db, mailer, request("eva@example.cz", "editor"));
    const accepted = acceptInvitation(db, tokenFrom(sent[0]));
    expect(accepted).toEqual({ ok: true, userId: eva, workspaceId });
    expect(listWorkspaces(db, eva).map((w) => [w.id, w.role])).toEqual(
      expect.arrayContaining([
        [other, "owner"],
        [workspaceId, "editor"],
      ]),
    );
    expect(db.select().from(users).all()).toHaveLength(2);
  });

  it("works once, and expires after 7 days", async () => {
    const now = Date.now();
    await invite(db, mailer, request("a@example.cz"), now);
    const token = tokenFrom(sent[0]);
    expect(acceptInvitation(db, token, now).ok).toBe(true);
    expect(acceptInvitation(db, token, now)).toEqual({ ok: false, reason: "used" });

    await invite(db, mailer, request("b@example.cz"), now);
    expect(acceptInvitation(db, tokenFrom(sent[1]), now + INVITATION_TTL + 1)).toEqual({
      ok: false,
      reason: "expired",
    });
    expect(acceptInvitation(db, "nonsense")).toEqual({ ok: false, reason: "invalid" });
  });

  it("can be cancelled by an owner before it is used", async () => {
    const result = await invite(db, mailer, request("a@example.cz"));
    const id = result.ok ? result.invitationId : "";
    expect(pendingInvitations(db, workspaceId).map((i) => i.email)).toEqual(["a@example.cz"]);
    expect(cancelInvitation(db, owner, workspaceId, id)).toBe(true);
    expect(acceptInvitation(db, tokenFrom(sent[0]))).toEqual({ ok: false, reason: "cancelled" });
    expect(pendingInvitations(db, workspaceId)).toEqual([]);
  });

  it("is only for owners, and not for existing members", async () => {
    const editor = user("editor@example.cz");
    addMember(db, workspaceId, editor, "editor");
    expect(await invite(db, mailer, request("x@example.cz", "editor", editor))).toEqual({
      ok: false,
      reason: "forbidden",
    });
    expect(await invite(db, mailer, request("editor@example.cz"))).toEqual({
      ok: false,
      reason: "already-member",
    });
    expect(await invite(db, mailer, request("not an email"))).toEqual({
      ok: false,
      reason: "invalid-email",
    });
    expect(cancelInvitation(db, editor, workspaceId, "x")).toBe(false);
    expect(sent).toEqual([]);
  });

  it("never lowers an existing owner's role", async () => {
    const jana = user("jana@example.cz");
    const invitation = await invite(db, mailer, request("jana@example.cz", "editor"));
    expect(invitation.ok).toBe(true);
    // Jana became an owner meanwhile, through another route.
    addMember(db, workspaceId, jana, "owner");
    acceptInvitation(db, tokenFrom(sent[0]));
    expect(roleIn(db, jana, workspaceId)).toBe("owner");
  });
});
