import { randomBytes } from "node:crypto";
import { mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import nodemailer, { type Transporter } from "nodemailer";

export interface MailMessage {
  to: string;
  subject: string;
  text: string;
}

export interface Mailer {
  send(message: MailMessage): Promise<void>;
}

/** Sends through a nodemailer transport (SMTP in production, a stub in tests). */
export function transportMailer(transport: Transporter, from: string): Mailer {
  return {
    async send({ to, subject, text }) {
      await transport.sendMail({ from, to, subject, text });
    },
  };
}

export interface OutboxMessage extends MailMessage {
  sentAt: string;
}

/**
 * Writes each message as a JSON file into `dir` instead of sending it, and logs it.
 * Used when no SMTP server is configured: development, tests, and the e2e suite.
 */
export function outboxMailer(dir: string, log: (line: string) => void = console.log): Mailer {
  return {
    async send(message) {
      mkdirSync(dir, { recursive: true });
      const sentAt = new Date().toISOString();
      const file = `${sentAt.replace(/[:.]/g, "-")}-${randomBytes(4).toString("hex")}.json`;
      writeFileSync(join(dir, file), `${JSON.stringify({ ...message, sentAt }, null, 2)}\n`);
      log(`[mail] to ${message.to}: ${message.subject}\n${message.text}`);
    },
  };
}

/** Messages in an outbox folder, oldest first. */
export function readOutbox(dir: string): OutboxMessage[] {
  let files: string[];
  try {
    files = readdirSync(dir).filter((f) => f.endsWith(".json"));
  } catch {
    return [];
  }
  return files.sort().map((f) => JSON.parse(readFileSync(join(dir, f), "utf8")) as OutboxMessage);
}

export function outboxDir(): string {
  return process.env.OUTBOX_DIR ?? resolve("data/outbox");
}

/** SMTP when `SMTP_URL` is set (sending from `MAIL_FROM`), otherwise the outbox. */
export function createMailer(env: NodeJS.ProcessEnv = process.env): Mailer {
  if (env.SMTP_URL) {
    const from = env.MAIL_FROM;
    if (!from) throw new Error("MAIL_FROM must be set when SMTP_URL is set.");
    return transportMailer(nodemailer.createTransport(env.SMTP_URL), from);
  }
  if (env.NODE_ENV === "production") {
    console.warn(
      "[mail] SMTP_URL is not set: sign-in and invitation emails are written to the outbox and this log, not sent.",
    );
  }
  return outboxMailer(env.OUTBOX_DIR ?? outboxDir());
}
