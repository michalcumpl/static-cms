import { eq } from "drizzle-orm";
import { beforeEach, describe, expect, it } from "vitest";
import { useServices } from "$lib/server/app";
import {
  askToConfirmRecipients,
  recipientStates,
  resetFormLimits,
} from "$lib/server/contact-forms";
import { contactMessages, projectHosting, projects } from "$lib/server/db/schema";
import type { MailMessage } from "$lib/server/mail";
import { readSite, saveSite } from "$lib/server/site-documents";
import { thrownBy, useTestProject } from "$lib/server/test-project";
import { POST } from "./[project]/[block]/+server";
import { load as confirm } from "./confirm/[token]/+page.server";

// The websites' contact forms on the admin (contact-form spec, "Form endpoint", "Spam
// protection", "Delivery by email").

const project = useTestProject();
let sent: MailMessage[];
let failMail = false;
const SITE = "https://pekarna-ulipy.cz";

type Node = Record<string, unknown>;
const text = (content: string) => ({ content, marks: [], annotations: [] });

/** The demo project with a Contact us form on its Contact page, a domain and a business email. */
function withForm(form: Node = {}): string {
  const { db, projectId, owner } = project();
  const site = readSite(db, projectId);
  const doc = structuredClone(site?.document) as { nodes: Record<string, Node> };
  doc.nodes.contact_form_1 = {
    id: "contact_form_1",
    type: "contact_form",
    hidden: false,
    form_kind: "contact",
    heading: text("Napište nám"),
    text: text(""),
    button: text("Odeslat"),
    recipient: "",
    ...form,
  };
  ((doc.nodes.page_contact as Node).blocks as { nodes: string[] }).nodes.push("contact_form_1");
  for (const node of Object.values(doc.nodes)) {
    if (node.type === "location") node.email = "info@pekarna-ulipy.cz";
  }
  expect(saveSite(db, projectId, owner.id, doc, site?.version ?? "").ok).toBe(true);
  db.insert(projectHosting)
    .values({
      projectId,
      provider: "webmio",
      accountSlug: "webmio",
      siteId: "s_1",
      siteName: "pekarna",
      defaultUrl: "https://pekarna.webmio.site",
      domain: "pekarna-ulipy.cz",
    })
    .run();
  return projectId;
}

/** A visitor's post from `origin`, as the browser sends a form. */
async function send(
  fields: Record<string, string>,
  {
    origin = SITE,
    block = "contact_form_1",
    from = "203.0.113.7",
    projectId = project().projectId,
  } = {},
) {
  const body = new URLSearchParams({ _page: "/kontakt/", website: "", ...fields });
  const event = project().event(`/forms/${projectId}/${block}`, undefined, {
    method: "POST",
    headers: { origin, "content-type": "application/x-www-form-urlencoded" },
    body,
  });
  return thrownBy(() =>
    POST({
      ...event,
      params: { project: projectId, block },
      getClientAddress: () => from,
    } as never),
  );
}

const stored = () => project().db.select().from(contactMessages).all();
const JANA = { name: "Jana Nováková", email: "jana@example.cz", message: "Máte bezlepkový chléb?" };

beforeEach(() => {
  sent = [];
  failMail = false;
  resetFormLimits();
  useServices({
    mailer: {
      send: async (m) => {
        if (failMail) throw new Error("SES is down");
        sent.push(m);
      },
    },
  });
});

describe("the form endpoint", () => {
  it("A message sent: stored, emailed, and the visitor back at the confirmation", async () => {
    const projectId = withForm();
    expect(await send(JANA)).toMatchObject({
      status: 303,
      location: `${SITE}/kontakt/#form-contact_form_1-sent`,
    });
    expect(stored()).toEqual([
      expect.objectContaining({
        projectId,
        blockId: "contact_form_1",
        kind: "contact",
        heading: "Napište nám",
        page: "/kontakt/",
        name: "Jana Nováková",
        email: "jana@example.cz",
        message: "Máte bezlepkový chléb?",
        delivered: true,
      }),
    ]);
    expect(sent).toHaveLength(1);
    expect(sent[0]).toMatchObject({ to: "info@pekarna-ulipy.cz", replyTo: "jana@example.cz" });
    expect(sent[0]?.subject).toContain("Napište nám");
    expect(sent[0]?.text).toContain("Máte bezlepkový chléb?");
    expect(sent[0]?.text).toContain(`${SITE}/kontakt/`);
  });

  it("No way to answer: refused with the reason, nothing stored or sent", async () => {
    withForm();
    expect(await send({ name: "Jana", message: "Dobrý den" })).toMatchObject({
      status: 303,
      location: `${SITE}/kontakt/#form-contact_form_1-error-contact`,
    });
    expect(await send({ name: "Jana", email: "jana", message: "Dobrý den" })).toMatchObject({
      location: `${SITE}/kontakt/#form-contact_form_1-error-invalid`,
    });
    expect(stored()).toEqual([]);
    expect(sent).toEqual([]);
  });

  it("A callback request needs a phone, and keeps when to call", async () => {
    withForm({ form_kind: "callback", heading: text("Zavoláme vám") });
    expect((await send({ name: "Jana" }))?.location).toContain("error-missing");
    await send({ name: "Jana", phone: "777 123 456", when: "morning" });
    expect(stored()).toEqual([expect.objectContaining({ kind: "callback", when: "morning" })]);
    expect(sent[0]?.text).toContain("dopoledne");
  });

  it("A block that isn't there, or a deleted project: 404 and nothing stored", async () => {
    const projectId = withForm();
    expect(await send(JANA, { block: "contact_form_9" })).toMatchObject({ status: 404 });
    project()
      .db.update(projects)
      .set({ deletedAt: new Date() })
      .where(eq(projects.id, projectId))
      .run();
    expect(await send(JANA)).toMatchObject({ status: 404 });
    expect(stored()).toEqual([]);
  });

  it("A bot fills every field: the usual confirmation, and nothing happens", async () => {
    withForm();
    expect(await send({ ...JANA, website: "https://spam.example" })).toMatchObject({
      status: 303,
      location: `${SITE}/kontakt/#form-contact_form_1-sent`,
    });
    expect(stored()).toEqual([]);
    expect(sent).toEqual([]);
  });

  it("Flooding: a sixth message from one address within an hour is refused", async () => {
    withForm();
    for (let i = 0; i < 5; i++) expect((await send(JANA))?.location).toContain("-sent");
    expect((await send(JANA))?.location).toContain("error-limit");
    expect((await send(JANA, { from: "198.51.100.2" }))?.location).toContain("-sent");
    expect(stored()).toHaveLength(6);
  });

  it("refuses more than three links", async () => {
    withForm();
    const spam = "https://a.example https://b.example www.c.example https://d.example";
    expect((await send({ ...JANA, message: spam }))?.location).toContain("error-links");
  });

  it("sends a form on another site to the admin's own page", async () => {
    withForm();
    expect(await send(JANA, { origin: "https://elsewhere.example" })).toMatchObject({
      location: "https://admin.example.cz/forms/sent",
    });
    expect(
      await send({ name: "Jana", message: "x" }, { origin: "https://elsewhere.example" }),
    ).toMatchObject({
      location: "https://admin.example.cz/forms/sent?error=contact",
    });
  });

  it("keeps a message it couldn't email, marked not delivered", async () => {
    withForm();
    failMail = true;
    expect((await send(JANA))?.location).toContain("-sent");
    expect(stored()).toEqual([expect.objectContaining({ delivered: false })]);
  });
});

describe("another address", () => {
  const KAMPAN = "kampan@pekarna-ulipy.cz";
  const mailer = { send: async (m: MailMessage) => void sent.push(m) };
  const askAgain = (projectId: string) => {
    const { db } = project();
    return askToConfirmRecipients(
      db,
      mailer,
      projectId,
      readSite(db, projectId)?.document,
      "https://admin.example.cz",
    );
  };
  const tokenIn = (m: MailMessage | undefined) => m?.text.match(/forms\/confirm\/(\S+)/)?.[1] ?? "";

  it("Another address: asked to confirm, and the business email gets messages until it does", async () => {
    const projectId = withForm({ recipient: KAMPAN });
    expect(await askAgain(projectId)).toEqual([KAMPAN]);
    expect(sent).toEqual([expect.objectContaining({ to: KAMPAN })]);
    const token = tokenIn(sent[0]);
    expect(token).not.toBe("");
    expect(await askAgain(projectId)).toEqual([]);

    sent = [];
    await send(JANA);
    expect(sent[0]?.to).toBe("info@pekarna-ulipy.cz");

    expect(await confirm({ params: { token } } as never)).toMatchObject({ email: KAMPAN });
    expect(recipientStates(project().db, projectId)).toEqual([{ email: KAMPAN, confirmed: true }]);
    sent = [];
    await send(JANA, { from: "198.51.100.2" });
    expect(sent[0]?.to).toBe(KAMPAN);
  });

  it("A confirmed address stays confirmed, and a wrong link says so", async () => {
    const projectId = withForm({ recipient: KAMPAN });
    await askAgain(projectId);
    const token = tokenIn(sent[0]);
    await confirm({ params: { token } } as never);
    expect(await confirm({ params: { token } } as never)).toMatchObject({ email: KAMPAN });
    expect(await askAgain(projectId)).toEqual([]);
    expect(recipientStates(project().db, projectId)).toEqual([{ email: KAMPAN, confirmed: true }]);
    expect(await confirm({ params: { token: "nope" } } as never)).toEqual({
      email: null,
      site: null,
    });
  });
});
