import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { SESv2Client, type SendEmailCommand } from "@aws-sdk/client-sesv2";
import nodemailer from "nodemailer";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createMailer, outboxMailer, readOutbox, sesMailer, transportMailer } from "./mail";

let dir = "";
beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), "mail-"));
});
afterEach(async () => {
  await rm(dir, { recursive: true, force: true });
});

const message = {
  to: "jana@example.cz",
  subject: "Přihlášení",
  text: "Odkaz: https://x/signin/abc",
};

describe("outbox mailer", () => {
  it("writes each message as a readable file and logs it", async () => {
    const lines: string[] = [];
    const mailer = outboxMailer(join(dir, "outbox"), (line) => lines.push(line));
    await mailer.send(message);
    await mailer.send({ ...message, subject: "Druhý" });

    const sent = readOutbox(join(dir, "outbox"));
    expect(sent.map((m) => m.subject)).toEqual(["Přihlášení", "Druhý"]);
    expect(sent[0]).toMatchObject(message);
    expect(lines[0]).toContain("https://x/signin/abc");
  });

  it("reads an empty or missing outbox as no messages", () => {
    expect(readOutbox(join(dir, "nothing"))).toEqual([]);
  });
});

describe("SMTP mailer", () => {
  it("hands the message to the transport with the configured sender", async () => {
    // nodemailer's JSON transport builds the message without a server.
    const transport = nodemailer.createTransport({ jsonTransport: true });
    const sent: unknown[] = [];
    const original = transport.sendMail.bind(transport);
    transport.sendMail = (async (mail: Parameters<typeof original>[0]) => {
      const info = await original(mail);
      sent.push(JSON.parse((info as { message: string }).message));
      return info;
    }) as typeof transport.sendMail;

    await transportMailer(transport, "Webmio <web@example.cz>").send(message);
    expect(sent[0]).toMatchObject({
      subject: "Přihlášení",
      text: message.text,
      to: [{ address: "jana@example.cz" }],
      from: { address: "web@example.cz", name: "Webmio" },
    });
  });

  it("requires MAIL_FROM with SMTP_URL, and falls back to the outbox without SMTP", async () => {
    expect(() => createMailer({ SMTP_URL: "smtp://localhost:2525" })).toThrow(/MAIL_FROM/);
    await createMailer({ OUTBOX_DIR: join(dir, "o") }).send(message);
    expect(readOutbox(join(dir, "o"))).toHaveLength(1);
  });
});

describe("SES mailer", () => {
  it("sends the message through SES from the configured sender", async () => {
    const sent: SendEmailCommand[] = [];
    const client = new SESv2Client({ region: "eu-central-1" });
    vi.spyOn(client, "send").mockImplementation(async (command) => {
      sent.push(command as SendEmailCommand);
      return { MessageId: "0102018abc" };
    });
    await sesMailer("Webmio <prihlaseni@mail.webmio.net>", client).send(message);
    expect(sent).toHaveLength(1);
    const input = sent[0]?.input;
    expect(input?.FromEmailAddress).toBe("Webmio <prihlaseni@mail.webmio.net>");
    expect(input?.Destination?.ToAddresses).toEqual([message.to]);
    const raw = new TextDecoder().decode(input?.Content?.Raw?.Data);
    expect(raw).toMatch(/^Subject: /m);
    expect(raw).toContain(`To: ${message.to}`);
    expect(raw).toContain("From: Webmio <prihlaseni@mail.webmio.net>");
  });

  it("is chosen by MAIL_TRANSPORT=ses, which needs MAIL_FROM", () => {
    expect(() => createMailer({ MAIL_TRANSPORT: "ses" })).toThrow(
      "MAIL_FROM must be set when MAIL_TRANSPORT is ses.",
    );
    expect(
      createMailer({ MAIL_TRANSPORT: "ses", MAIL_FROM: "Webmio <a@mail.webmio.net>" }),
    ).toBeDefined();
  });
});
