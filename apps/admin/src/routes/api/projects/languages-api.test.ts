import { describe, expect, it } from "vitest";
import { inCzech, thrownBy, useTestProject } from "$lib/server/test-project";
import { POST as add, GET as list } from "./[project]/languages/+server";
import { PATCH as patch, DELETE as remove } from "./[project]/languages/[lang]/+server";
import { GET as getSite, PUT as putSite } from "./[project]/site/+server";

type ListEvent = Parameters<typeof list>[0];
type LangEvent = Parameters<typeof patch>[0];
type SiteEvent = Parameters<typeof getSite>[0];
type User = { id: string; email: string };

let lang = "";
const project = useTestProject(() => ({ lang }));
const base = () => `/api/projects/${project().projectId}`;
const json = (body: unknown, method = "POST") => ({
  method,
  headers: { "content-type": "application/json" },
  body: JSON.stringify(body),
});

const languages = (user: User | null = project().owner) =>
  list(project().event(`${base()}/languages`, user ?? undefined) as unknown as ListEvent);
const addLanguage = (code: string, user: User | null = project().owner) =>
  add(
    project().event(
      `${base()}/languages`,
      user ?? undefined,
      json({ lang: code }),
    ) as unknown as ListEvent,
  );
function setPublished(code: string, published: boolean) {
  lang = code;
  return patch(
    project().event(
      `${base()}/languages/${code}`,
      project().owner,
      json({ published }, "PATCH"),
    ) as unknown as LangEvent,
  );
}
function removeLanguage(code: string) {
  lang = code;
  return remove(
    project().event(`${base()}/languages/${code}`, project().owner, {
      method: "DELETE",
    }) as unknown as LangEvent,
  );
}
const site = (query = "") =>
  getSite(project().event(`${base()}/site${query}`, project().owner) as unknown as SiteEvent);

describe("languages API", () => {
  it("lists the primary language", async () => {
    expect(await (await languages()).json()).toEqual([
      { lang: "cs", name: "Čeština", primary: true, published: true },
    ]);
  });

  it("adds English (201), refuses it twice (409) and refuses a language not offered (400)", async () => {
    const added = await addLanguage("en");
    expect(added.status).toBe(201);
    expect((await added.json()).map((l: { lang: string }) => l.lang)).toEqual(["cs", "en"]);
    const again = await addLanguage("en");
    expect(again.status).toBe(409);
    expect(await again.json()).toEqual({ message: "The project already has English." });
    expect((await addLanguage("fr")).status).toBe(400);
  });

  it("publishes and hides a language, and refuses the primary", async () => {
    await addLanguage("en");
    const published = await setPublished("en", true);
    expect((await published.json())[1]).toMatchObject({ lang: "en", published: true });
    expect((await setPublished("cs", false)).status).toBe(409);
    expect((await setPublished("de", true)).status).toBe(404);
  });

  it("refuses removing the primary in the person's language", async () => {
    lang = "cs";
    const event = project().event(`${base()}/languages/cs`, project().owner, { method: "DELETE" });
    const response = await remove(inCzech(event) as unknown as LangEvent);
    expect(response.status).toBe(409);
    expect((await response.json()).message).toBe("Hlavní jazyk nejde odebrat.");
  });

  it("removes a language, and refuses the primary", async () => {
    await addLanguage("de");
    expect((await removeLanguage("cs")).status).toBe(409);
    const removed = await removeLanguage("de");
    expect((await removed.json()).map((l: { lang: string }) => l.lang)).toEqual(["cs"]);
    expect((await removeLanguage("de")).status).toBe(404);
  });

  it("is only for members", async () => {
    expect(await thrownBy(() => languages(null))).toMatchObject({ status: 401 });
    expect(await thrownBy(() => addLanguage("en", project().outsider))).toMatchObject({
      status: 404,
    });
  });
});

describe("site API with a language", () => {
  it("reads and saves the English document", async () => {
    await addLanguage("en");
    const english = await (await site("?lang=en")).json();
    expect(english.document.nodes.site_1.lang).toBe("en");
    english.document.nodes.page_contact.title = "Contact";
    const saved = await putSite(
      project().event(
        `${base()}/site?lang=en`,
        project().owner,
        json({ document: english.document, baseVersion: english.version }, "PUT"),
      ) as unknown as SiteEvent,
    );
    expect(saved.status).toBe(200);
    const czech = await (await site()).json();
    expect(czech.document.nodes.page_contact.title).toBe("Kontakt");
    const again = await (await site("?lang=en")).json();
    expect(again.document.nodes.page_contact.title).toBe("Contact");
  });

  it("answers 404 for a language the project doesn't have", async () => {
    expect(await thrownBy(() => site("?lang=pl"))).toMatchObject({ status: 404 });
  });
});
