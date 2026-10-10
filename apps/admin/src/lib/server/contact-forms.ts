import { and, eq, isNotNull, lt } from "drizzle-orm";
import { projectPaths } from "$lib/project-paths";
import { RateLimiter } from "./auth";
import type { Db } from "./db/index";
import { contactMessages, formRecipients, projectHosting, projects } from "./db/schema";
import { hashToken, newId, newToken } from "./ids";
import type { Mailer } from "./mail";
import { readLanguages } from "./site-documents";

// The websites' contact forms on the admin's side (contact-form design decisions 3 to 5): the
// public endpoint's checks, storing a message, emailing it, and where the visitor goes back to.

const HOUR = 60 * 60_000;
/** How long messages are kept. */
export const KEEP_MESSAGES_MS = 365 * 24 * HOUR;
const MAX_NAME = 100;
const MAX_MESSAGE = 3000;
const MAX_LINKS = 3;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
/** A phone as people type it: digits with spaces, dashes or brackets, an optional `+`. */
const PHONE = /^\+?[\d\s()-]{6,24}$/;

/** Messages a sender, and a website, may send in an hour (spec, "Spam protection"). */
let perSender = new RateLimiter(5, HOUR);
let perSite = new RateLimiter(50, HOUR);

/** For tests: forget every sender's and website's messages so far. */
export function resetFormLimits(): void {
  perSender = new RateLimiter(5, HOUR);
  perSite = new RateLimiter(50, HOUR);
}

/** Why a message was refused; the website's form shows the reason (render's `FORM_ERRORS`). */
export type FormError = "missing" | "contact" | "invalid" | "limit" | "links";

/** A contact form block as the endpoint finds it in the project's site. */
export interface FoundForm {
  projectId: string;
  blockId: string;
  kind: "contact" | "callback";
  heading: string;
  /** The block's own address, or "". */
  recipient: string;
  /** The main location's email, or "". */
  businessEmail: string;
  siteName: string;
  lang: string;
}

type Loose = { document_id: string; nodes: Record<string, Record<string, unknown> | undefined> };
const content = (value: unknown) => (value as { content?: string } | undefined)?.content ?? "";

/** A project's contact form block by its ID, in any of its languages; undefined otherwise. */
export function findForm(db: Db, projectId: string, blockId: string): FoundForm | undefined {
  const project = db.select().from(projects).where(eq(projects.id, projectId)).get();
  if (!project || project.deletedAt) return undefined;
  for (const { lang, document } of readLanguages(db, projectId, "all")) {
    const doc = document as Loose;
    const block = doc.nodes[blockId];
    if (block?.type !== "contact_form") continue;
    const site = doc.nodes[doc.document_id];
    const business = doc.nodes[String(site?.business)];
    const mainId = (business?.locations as { nodes?: string[] } | undefined)?.nodes?.[0];
    return {
      projectId,
      blockId,
      kind: block.form_kind === "callback" ? "callback" : "contact",
      heading: content(block.heading),
      recipient: String(block.recipient ?? ""),
      businessEmail: String(doc.nodes[mainId ?? ""]?.email ?? ""),
      siteName: String(site?.name ?? project.name),
      lang,
    };
  }
  return undefined;
}

/** The origins a project's website is served from: its hosting addresses, and the admin's. */
export function projectOrigins(db: Db, projectId: string, adminOrigin: string): Set<string> {
  const origins = new Set([adminOrigin]);
  const hosting = db
    .select()
    .from(projectHosting)
    .where(eq(projectHosting.projectId, projectId))
    .get();
  const add = (address: string) => {
    try {
      origins.add(new URL(address).origin);
    } catch {
      // Not an address: nothing to add.
    }
  };
  if (hosting) {
    add(hosting.defaultUrl);
    if (hosting.domain) {
      const bare = hosting.domain.replace(/^www\./, "");
      add(`https://${bare}`);
      add(`https://www.${bare}`);
    }
  }
  return origins;
}

/** What a visitor's form post holds. */
export interface FormPost {
  name: string;
  email: string;
  phone: string;
  when: string;
  message: string;
  /** The page's path, as the form says. */
  page: string;
  /** The hidden field people don't fill. */
  website: string;
}

export function formPost(form: FormData): FormPost {
  const field = (name: string) => String(form.get(name) ?? "").trim();
  return {
    name: field("name"),
    email: field("email"),
    phone: field("phone"),
    when: field("when"),
    message: field("message"),
    page: field("_page"),
    website: field("website"),
  };
}

/** The reason a post can't be accepted, or undefined when it can (spec, "Form endpoint"). */
export function checkPost(form: FoundForm, post: FormPost): FormError | undefined {
  if (!post.name || post.name.length > MAX_NAME || post.message.length > MAX_MESSAGE) {
    return "missing";
  }
  if (form.kind === "callback") {
    if (!post.phone) return "missing";
  } else {
    if (!post.message) return "missing";
    if (!post.email && !post.phone) return "contact";
  }
  if ((post.email && !EMAIL.test(post.email)) || (post.phone && !PHONE.test(post.phone))) {
    return "invalid";
  }
  const links = `${post.name} ${post.message}`.match(/https?:\/\/|www\./gi)?.length ?? 0;
  if (links > MAX_LINKS) return "links";
  return undefined;
}

/** Where messages of a form go: its own confirmed address, else the business email, else none. */
export function recipientOf(db: Db, form: FoundForm): string {
  if (form.recipient) {
    const confirmed = db
      .select()
      .from(formRecipients)
      .where(
        and(
          eq(formRecipients.projectId, form.projectId),
          eq(formRecipients.email, form.recipient.toLowerCase()),
          isNotNull(formRecipients.confirmedAt),
        ),
      )
      .get();
    if (confirmed) return form.recipient;
  }
  return form.businessEmail;
}

const WHEN: Record<string, { cs: string; en: string }> = {
  any: { cs: "kdykoli", en: "any time" },
  morning: { cs: "dopoledne", en: "in the morning" },
  afternoon: { cs: "odpoledne", en: "in the afternoon" },
};

/** The email telling the owner about a message (spec, "Delivery by email"). */
export function messageEmail(
  form: FoundForm,
  post: FormPost,
  links: { page: string; messages: string },
) {
  const cs = form.lang === "cs";
  const when = WHEN[post.when] ?? WHEN.any;
  const lines = cs
    ? [
        form.kind === "callback"
          ? `Někdo chce, abyste mu zavolali (formulář „${form.heading}“).`
          : `Nová zpráva z formuláře „${form.heading}“.`,
        "",
        `Jméno: ${post.name}`,
        ...(post.email ? [`E-mail: ${post.email}`] : []),
        ...(post.phone ? [`Telefon: ${post.phone}`] : []),
        ...(form.kind === "callback" ? [`Kdy zavolat: ${when?.cs}`] : []),
        ...(post.message ? ["", post.message] : []),
        "",
        `Stránka: ${links.page}`,
        `Všechny zprávy: ${links.messages}`,
      ]
    : [
        form.kind === "callback"
          ? `Someone asked you to call them back (the form "${form.heading}").`
          : `A new message from the form "${form.heading}".`,
        "",
        `Name: ${post.name}`,
        ...(post.email ? [`Email: ${post.email}`] : []),
        ...(post.phone ? [`Phone: ${post.phone}`] : []),
        ...(form.kind === "callback" ? [`When to call: ${when?.en}`] : []),
        ...(post.message ? ["", post.message] : []),
        "",
        `Page: ${links.page}`,
        `All messages: ${links.messages}`,
      ];
  return {
    subject: cs
      ? `Nová zpráva z webu ${form.siteName}: ${form.heading}`
      : `New message from ${form.siteName}: ${form.heading}`,
    text: lines.join("\n"),
    ...(post.email && EMAIL.test(post.email) ? { replyTo: post.email } : {}),
  };
}

/** The addresses a document's contact forms name besides the business email, lowercased. */
export function formAddresses(document: unknown): string[] {
  const doc = document as Loose;
  const out = new Set<string>();
  for (const node of Object.values(doc.nodes ?? {})) {
    const address = String(node?.recipient ?? "")
      .trim()
      .toLowerCase();
    if (node?.type === "contact_form" && EMAIL.test(address)) out.add(address);
  }
  return [...out];
}

/** Each address a project's forms have named, and whether it has confirmed. */
export function recipientStates(
  db: Db,
  projectId: string,
): { email: string; confirmed: boolean }[] {
  return db
    .select()
    .from(formRecipients)
    .where(eq(formRecipients.projectId, projectId))
    .all()
    .map((row) => ({ email: row.email, confirmed: row.confirmedAt !== null }));
}

/**
 * Asks each address a saved document's forms name for the first time to confirm it (spec,
 * "Recipient address"): a link it follows before it gets messages. Returns the addresses asked.
 */
export async function askToConfirmRecipients(
  db: Db,
  mailer: Mailer,
  projectId: string,
  document: unknown,
  adminOrigin: string,
): Promise<string[]> {
  const known = new Set(recipientStates(db, projectId).map((r) => r.email));
  const doc = document as Loose;
  const site = doc.nodes?.[doc.document_id];
  const cs = String(site?.lang ?? "cs") === "cs";
  const siteName = String(site?.name ?? "");
  const asked: string[] = [];
  for (const email of formAddresses(document)) {
    if (known.has(email)) continue;
    const token = newToken();
    db.insert(formRecipients)
      .values({ projectId, email, tokenHash: hashToken(token), createdAt: new Date() })
      .run();
    const link = `${adminOrigin}/forms/confirm/${token}`;
    await mailer.send({
      to: email,
      subject: cs
        ? `Potvrďte příjem zpráv z webu ${siteName}`
        : `Confirm messages from ${siteName}`,
      text: cs
        ? `Kontaktní formulář na webu ${siteName} má zprávy posílat na tuto adresu.\n\nPokud je chcete dostávat, potvrďte to: ${link}\n\nPokud o tom nevíte, tento e-mail ignorujte.`
        : `A contact form on ${siteName} is set to send its messages to this address.\n\nTo receive them, confirm: ${link}\n\nIf you don't know about this, ignore this email.`,
    });
    asked.push(email);
  }
  return asked;
}

/** Confirms an address by its link's token; undefined for a token that isn't one. */
export function confirmRecipient(
  db: Db,
  token: string,
): { projectId: string; email: string } | undefined {
  const row = db
    .select()
    .from(formRecipients)
    .where(eq(formRecipients.tokenHash, hashToken(token)))
    .get();
  if (!row) return undefined;
  if (!row.confirmedAt) {
    db.update(formRecipients)
      .set({ confirmedAt: new Date() })
      .where(and(eq(formRecipients.projectId, row.projectId), eq(formRecipients.email, row.email)))
      .run();
  }
  return { projectId: row.projectId, email: row.email };
}

/** Deletes messages older than they are kept (spec, "Keeping messages"); returns how many. */
export function pruneMessages(db: Db, now = new Date()): number {
  return db
    .delete(contactMessages)
    .where(lt(contactMessages.createdAt, new Date(now.getTime() - KEEP_MESSAGES_MS)))
    .run().changes;
}

export interface Received {
  /** `sent`: stored (or a bot's, dropped); `refused`: shown its reason; `missing`: no such form. */
  outcome: "sent" | "refused" | "missing";
  /** Where to send the visitor. */
  location?: string;
}

/**
 * Receives a post to `/forms/<project>/<block>` (design decision 3): drops a bot's, refuses what
 * fails a check or a limit, stores the message, emails it, and says where the visitor goes back.
 */
export async function receiveMessage(
  db: Db,
  mailer: Mailer,
  request: {
    projectId: string;
    blockId: string;
    post: FormPost;
    /** The `Origin` the post came from, or null. */
    origin: string | null;
    clientAddress: string;
    adminOrigin: string;
    now?: Date;
  },
): Promise<Received> {
  const form = findForm(db, request.projectId, request.blockId);
  if (!form) return { outcome: "missing" };
  const { post } = request;
  // Back to the page the form is on, when it is the project's own; else the admin's page.
  const page = post.page.startsWith("/") && !post.page.startsWith("//") ? post.page : "/";
  const own =
    request.origin !== null &&
    projectOrigins(db, form.projectId, request.adminOrigin).has(request.origin);
  const back = (fragment: string, error?: FormError) =>
    own
      ? `${request.origin}${page}#form-${form.blockId}-${fragment}`
      : `${request.adminOrigin}/forms/sent${error ? `?error=${error}` : ""}`;
  const refuse = (error: FormError): Received => ({
    outcome: "refused",
    location: back(`error-${error}`, error),
  });

  // A bot fills the hidden field: it sees the usual confirmation, and nothing happens.
  if (post.website) return { outcome: "sent", location: back("sent") };
  const problem = checkPost(form, post);
  if (problem) return refuse(problem);
  if (
    !perSender.allow(`${form.projectId}:${request.clientAddress}`) ||
    !perSite.allow(form.projectId)
  ) {
    return refuse("limit");
  }

  const now = request.now ?? new Date();
  const id = newId("msg");
  db.insert(contactMessages)
    .values({
      id,
      projectId: form.projectId,
      blockId: form.blockId,
      kind: form.kind,
      heading: form.heading,
      page,
      name: post.name,
      email: post.email,
      phone: post.phone,
      when: form.kind === "callback" ? (WHEN[post.when] ? post.when : "any") : "",
      message: post.message,
      delivered: false,
      createdAt: now,
    })
    .run();
  const to = recipientOf(db, form);
  if (to) {
    const pageAddress = own ? `${request.origin}${page}` : page;
    const messages = `${request.adminOrigin}${projectPaths(form.projectId).messages}`;
    try {
      await mailer.send({ to, ...messageEmail(form, post, { page: pageAddress, messages }) });
      db.update(contactMessages).set({ delivered: true }).where(eq(contactMessages.id, id)).run();
    } catch (error) {
      console.error(`[forms] Couldn't email message ${id}: ${String(error)}`);
    }
  }
  pruneMessages(db, now);
  return { outcome: "sent", location: back("sent") };
}
