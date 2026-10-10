import { and, count, desc, eq, isNull } from "drizzle-orm";
import type { Db } from "./db/index";
import { contactMessages } from "./db/schema";

// The Messages section (contact-form decision 5): a project's contact form messages, handled
// and deleted by its members, and exported as CSV.

export type Message = typeof contactMessages.$inferSelect;

export interface MessageFilter {
  /** Only this form's messages (its block ID). */
  form?: string;
  /** Only the messages not handled yet. */
  unhandled?: boolean;
}

/** The filter in the section's address: `?form=<block>` and `?unhandled=1`. */
export function messageFilter(url: URL): MessageFilter {
  return {
    form: url.searchParams.get("form") || undefined,
    unhandled: url.searchParams.get("unhandled") === "1",
  };
}

/** The project's messages matching `filter`, newest first. */
export function listMessages(db: Db, projectId: string, filter: MessageFilter = {}): Message[] {
  return db
    .select()
    .from(contactMessages)
    .where(
      and(
        eq(contactMessages.projectId, projectId),
        filter.form ? eq(contactMessages.blockId, filter.form) : undefined,
        filter.unhandled ? isNull(contactMessages.handledAt) : undefined,
      ),
    )
    .orderBy(desc(contactMessages.createdAt), desc(contactMessages.id))
    .all();
}

/** How many of the project's messages aren't handled yet. */
export function unhandledCount(db: Db, projectId: string): number {
  return (
    db
      .select({ n: count() })
      .from(contactMessages)
      .where(and(eq(contactMessages.projectId, projectId), isNull(contactMessages.handledAt)))
      .get()?.n ?? 0
  );
}

/** The forms that have messages, by block ID, with the heading of their newest message. */
export function messageForms(db: Db, projectId: string): { id: string; heading: string }[] {
  const forms = new Map<string, string>();
  for (const message of listMessages(db, projectId)) {
    if (!forms.has(message.blockId)) forms.set(message.blockId, message.heading);
  }
  return [...forms].map(([id, heading]) => ({ id, heading }));
}

/** Marks a message handled, or not handled again; false when the project has no such message. */
export function setHandled(
  db: Db,
  projectId: string,
  messageId: string,
  handled: boolean,
  now = new Date(),
): boolean {
  return (
    db
      .update(contactMessages)
      .set({ handledAt: handled ? now : null })
      .where(and(eq(contactMessages.projectId, projectId), eq(contactMessages.id, messageId)))
      .run().changes > 0
  );
}

/** Deletes a message; false when the project has no such message. */
export function deleteMessage(db: Db, projectId: string, messageId: string): boolean {
  return (
    db
      .delete(contactMessages)
      .where(and(eq(contactMessages.projectId, projectId), eq(contactMessages.id, messageId)))
      .run().changes > 0
  );
}

/**
 * A CSV field: quoted when it holds a comma, quote or line break, and never read as a formula
 * (a phone number like `+420…` is left as it is).
 */
function csvField(value: string): string {
  const formula = /^[=+\-@\t\r]/.test(value) && !/^\+[0-9 ]+$/.test(value);
  const safe = formula ? `'${value}` : value;
  return /[",\r\n]/.test(safe) ? `"${safe.replaceAll('"', '""')}"` : safe;
}

/** Tells spreadsheets the file is UTF-8. */
const BOM = String.fromCharCode(0xfeff);

/** The column names of the export, by the interface language. */
export interface CsvHeader {
  date: string;
  form: string;
  page: string;
  name: string;
  email: string;
  phone: string;
  when: string;
  message: string;
  handled: string;
}

/** The messages as CSV: UTF-8 with a byte-order mark, a header row, CRLF. */
export function messagesCsv(
  messages: readonly Message[],
  header: CsvHeader,
  whenLabel: (when: string) => string,
): string {
  const rows = [
    [
      header.date,
      header.form,
      header.page,
      header.name,
      header.email,
      header.phone,
      header.when,
      header.message,
      header.handled,
    ],
    ...messages.map((m) => [
      m.createdAt.toISOString(),
      m.heading,
      m.page,
      m.name,
      m.email,
      m.phone,
      m.when ? whenLabel(m.when) : "",
      m.message,
      m.handledAt ? m.handledAt.toISOString() : "",
    ]),
  ];
  return `${BOM}${rows.map((row) => row.map(csvField).join(",")).join("\r\n")}\r\n`;
}
