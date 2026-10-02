// Invitations (specs/accounts: "Invitations"). The only way, besides the admin command,
// that accounts are created.
import { and, eq, gt, isNull } from "drizzle-orm";
import { i18n, type Locale } from "$lib/i18n";
import { normalizeEmail } from "./auth";
import type { Db } from "./db/index";
import { invitations, type Role, users, workspaces } from "./db/schema";
import { hashToken, newId, newToken } from "./ids";
import type { Mailer } from "./mail";
import { addMember, roleIn } from "./members";

export const INVITATION_TTL = 7 * 24 * 60 * 60_000;

export interface InviteRequest {
  actorId: string;
  workspaceId: string;
  email: string;
  role: Role;
  /** Origin for the link in the email. */
  origin: string;
  /** The inviting owner's language; the invited person has no account to have one yet. */
  locale: Locale;
}

export type InviteResult =
  | { ok: true; invitationId: string }
  | { ok: false; reason: "forbidden" | "already-member" | "invalid-email" };

/** An owner invites an address; the email carries a link that works once, for 7 days. */
export async function invite(
  db: Db,
  mailer: Mailer,
  request: InviteRequest,
  now = Date.now(),
): Promise<InviteResult> {
  if (roleIn(db, request.actorId, request.workspaceId) !== "owner") {
    return { ok: false, reason: "forbidden" };
  }
  const email = normalizeEmail(request.email);
  if (!/^[^\s@]+@[^\s@]+$/.test(email)) return { ok: false, reason: "invalid-email" };
  const existing = db.select({ id: users.id }).from(users).where(eq(users.email, email)).get();
  if (existing && roleIn(db, existing.id, request.workspaceId)) {
    return { ok: false, reason: "already-member" };
  }

  const token = newToken();
  const invitationId = hashToken(token);
  db.insert(invitations)
    .values({
      id: invitationId,
      workspaceId: request.workspaceId,
      email,
      role: request.role,
      invitedBy: request.actorId,
      expiresAt: new Date(now + INVITATION_TTL),
      createdAt: new Date(now),
    })
    .run();
  const workspace = db
    .select({ name: workspaces.name })
    .from(workspaces)
    .where(eq(workspaces.id, request.workspaceId))
    .get();
  const link = `${request.origin}/invite/${token}`;
  const { t } = i18n(request.locale);
  const name = workspace?.name ?? "";
  await mailer.send({
    to: email,
    subject: t("emails.invitationSubject", { workspace: name }),
    text: t("emails.invitationText", { workspace: name, link }),
  });
  return { ok: true, invitationId };
}

export type AcceptResult =
  | { ok: true; userId: string; workspaceId: string }
  | { ok: false; reason: "used" | "expired" | "cancelled" | "invalid" };

/**
 * Accepts an invitation: creates the account if the address has none, adds the membership
 * (never lowering an existing role), and returns the user to sign in.
 */
export function acceptInvitation(db: Db, token: string, now = Date.now()): AcceptResult {
  const id = hashToken(token);
  return db.transaction((tx): AcceptResult => {
    const claimed = tx
      .update(invitations)
      .set({ usedAt: new Date(now) })
      .where(
        and(
          eq(invitations.id, id),
          isNull(invitations.usedAt),
          isNull(invitations.cancelledAt),
          gt(invitations.expiresAt, new Date(now)),
        ),
      )
      .returning()
      .get();
    if (!claimed) {
      const row = tx.select().from(invitations).where(eq(invitations.id, id)).get();
      if (!row) return { ok: false, reason: "invalid" };
      if (row.usedAt) return { ok: false, reason: "used" };
      if (row.cancelledAt) return { ok: false, reason: "cancelled" };
      return { ok: false, reason: "expired" };
    }
    let user = tx.select({ id: users.id }).from(users).where(eq(users.email, claimed.email)).get();
    if (!user) {
      user = { id: newId("u") };
      tx.insert(users)
        .values({ id: user.id, email: claimed.email, createdAt: new Date(now) })
        .run();
    }
    const current = roleIn(tx, user.id, claimed.workspaceId);
    if (current !== "owner") addMember(tx, claimed.workspaceId, user.id, claimed.role);
    return { ok: true, userId: user.id, workspaceId: claimed.workspaceId };
  });
}

export interface PendingInvitation {
  id: string;
  email: string;
  role: Role;
  expiresAt: Date;
}

/** Invitations that can still be accepted. */
export function pendingInvitations(
  db: Db,
  workspaceId: string,
  now = Date.now(),
): PendingInvitation[] {
  return db
    .select({
      id: invitations.id,
      email: invitations.email,
      role: invitations.role,
      expiresAt: invitations.expiresAt,
    })
    .from(invitations)
    .where(
      and(
        eq(invitations.workspaceId, workspaceId),
        isNull(invitations.usedAt),
        isNull(invitations.cancelledAt),
        gt(invitations.expiresAt, new Date(now)),
      ),
    )
    .all();
}

/** Owners cancel invitations that haven't been used. */
export function cancelInvitation(
  db: Db,
  actorId: string,
  workspaceId: string,
  invitationId: string,
  now = Date.now(),
): boolean {
  if (roleIn(db, actorId, workspaceId) !== "owner") return false;
  const result = db
    .update(invitations)
    .set({ cancelledAt: new Date(now) })
    .where(
      and(
        eq(invitations.id, invitationId),
        eq(invitations.workspaceId, workspaceId),
        isNull(invitations.usedAt),
        isNull(invitations.cancelledAt),
      ),
    )
    .run();
  return result.changes > 0;
}
