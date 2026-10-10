import { describe, expect, it } from "vitest";
import { KEEP_MESSAGES_MS, pruneMessages } from "$lib/server/contact-forms";
import { contactMessages } from "$lib/server/db/schema";
import { newId } from "$lib/server/ids";
import { thrownBy, useTestProject } from "$lib/server/test-project";
import { load as projectLoad } from "../../+layout.server";
import { GET as csv } from "../../messages.csv/+server";
import { load as panelLoad } from "../+layout.server";
import { actions, load } from "./+page.server";

// The Messages section (contact-form spec, "Messages section", "Keeping messages").

const project = useTestProject();

type Row = typeof contactMessages.$inferInsert;
type Listed = { id: string; name: string; handled: boolean; kind: string }[];

/** Stores a message `minutesAgo` old, as the endpoint would. */
function store(fields: Partial<Row> & { minutesAgo?: number } = {}): string {
  const { minutesAgo = 0, ...rest } = fields;
  const id = newId("msg");
  project()
    .db.insert(contactMessages)
    .values({
      id,
      projectId: project().projectId,
      blockId: "contact_form_1",
      kind: "contact",
      heading: "Napište nám",
      page: "/kontakt/",
      name: "Jana Nováková",
      email: "jana@example.cz",
      phone: "",
      when: "",
      message: "Máte bezlepkový chléb?",
      delivered: true,
      createdAt: new Date(Date.now() - minutesAgo * 60_000),
      ...rest,
    })
    .run();
  return id;
}

/** The leads of the callback form of a campaign landing page. */
function campaign() {
  store({ name: "Jana", minutesAgo: 30 });
  store({
    blockId: "contact_form_2",
    kind: "callback",
    heading: "Zavoláme vám",
    page: "/konzultace/",
    name: "Petr Svoboda",
    email: "",
    phone: "+420777123456",
    when: "morning",
    message: "",
    minutesAgo: 20,
  });
  store({
    blockId: "contact_form_2",
    kind: "callback",
    heading: "Zavoláme vám",
    page: "/konzultace/",
    name: 'Eva, "Kavárna"',
    email: "",
    phone: "+420602000111",
    when: "any",
    message: "",
    minutesAgo: 10,
  });
}

/** The section's load as SvelteKit runs it, at `search`. */
async function section(search = "", user = project().owner) {
  const { projectId } = project();
  const event = project().event(`/p/${projectId}/messages${search}`, user);
  const membership = projectLoad(event as never);
  const layout = await panelLoad({ ...event, parent: async () => membership } as never);
  const data = (await load({ ...event, parent: async () => layout } as never)) as {
    messages: Listed;
    forms: { id: string; heading: string }[];
  };
  return { layout: layout as { unhandled: number }, data };
}

async function act(name: keyof typeof actions, id: string, user = project().owner) {
  const { projectId } = project();
  const event = project().event(`/p/${projectId}/messages?/${name}`, user, {
    method: "POST",
    body: new URLSearchParams({ id }),
  });
  return (actions[name] as (e: never) => unknown)(event as never);
}

async function exportCsv(search = "", user = project().owner) {
  const { projectId } = project();
  return csv(project().event(`/p/${projectId}/messages.csv${search}`, user) as never);
}

describe("the Messages section", () => {
  it("lists the messages newest first, the forms to filter by, and counts the new ones", async () => {
    campaign();
    const { layout, data } = await section();
    expect(data.messages.map((m) => m.name)).toEqual(['Eva, "Kavárna"', "Petr Svoboda", "Jana"]);
    expect(data.forms).toEqual([
      { id: "contact_form_2", heading: "Zavoláme vám" },
      { id: "contact_form_1", heading: "Napište nám" },
    ]);
    expect(layout.unhandled).toBe(3);
    expect((await section("?form=contact_form_2")).data.messages).toHaveLength(2);
  });

  it("Handled: leaves the unhandled filter and the count drops by one; and back", async () => {
    const jana = store();
    store({ name: "Petr" });
    await act("handled", jana);
    const { layout, data } = await section("?unhandled=1");
    expect(data.messages.map((m) => m.name)).toEqual(["Petr"]);
    expect(layout.unhandled).toBe(1);
    expect((await section()).data.messages.find((m) => m.id === jana)?.handled).toBe(true);
    await act("unhandled", jana);
    expect((await section()).layout.unhandled).toBe(2);
  });

  it("deletes a message, and only the project's own", async () => {
    const jana = store();
    expect(await act("delete", "msg_other")).toMatchObject({ status: 404 });
    await act("delete", jana);
    expect((await section()).data.messages).toEqual([]);
  });

  it("A campaign's leads: the CSV of the callback form's requests", async () => {
    campaign();
    const response = await exportCsv("?form=contact_form_2");
    expect(response.headers.get("content-type")).toBe("text/csv; charset=utf-8");
    expect(response.headers.get("content-disposition")).toContain("messages.csv");
    const bytes = new Uint8Array(await response.arrayBuffer());
    // A byte-order mark, so spreadsheets read it as UTF-8.
    expect([...bytes.slice(0, 3)]).toEqual([0xef, 0xbb, 0xbf]);
    const [header, ...rows] = new TextDecoder().decode(bytes).trim().split("\r\n");
    expect(header).toBe("Date,Form,Page,Name,Email,Phone,When to call,Message,Handled");
    expect(rows).toHaveLength(2);
    expect(rows[0]).toMatch(
      /^\d{4}-\d\d-\d\dT[^,]+,Zavoláme vám,\/konzultace\/,"Eva, ""Kavárna""",,\+420602000111,any time,,$/,
    );
    expect(rows[1]).toContain("Petr Svoboda,,+420777123456,in the morning,,");
  });

  it("A year later: a message 12 months old is deleted at the clean-up and no longer listed", async () => {
    store({ name: "Old", minutesAgo: KEEP_MESSAGES_MS / 60_000 + 1 });
    store({ name: "Recent", minutesAgo: 60 });
    expect(pruneMessages(project().db)).toBe(1);
    expect((await section()).data.messages.map((m) => m.name)).toEqual(["Recent"]);
  });

  it("is for members only", async () => {
    const jana = store();
    const { outsider } = project();
    expect(await thrownBy(() => section("", outsider))).toMatchObject({ status: 404 });
    expect(await thrownBy(() => exportCsv("", outsider))).toMatchObject({ status: 404 });
    expect(await thrownBy(() => act("delete", jana, outsider))).toMatchObject({ status: 404 });
    expect((await section()).data.messages).toHaveLength(1);
  });
});
