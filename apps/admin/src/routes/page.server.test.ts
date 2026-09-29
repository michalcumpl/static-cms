import { describe, expect, it } from "vitest";
import { useTempDataDir } from "$lib/server/test-data-dir";
import { load } from "./+page.server";

type LoadEvent = Parameters<typeof load>[0];

useTempDataDir();

describe("/ load", () => {
  it("validates the saved site and lists its preview pages", async () => {
    const data = await load({} as LoadEvent);
    expect(data).toMatchObject({ valid: true, problems: [], mediaNames: ["hero.png"] });
    expect(data?.pages).toEqual([
      { id: "page_home", path: "index.html", url: "/preview/" },
      { id: "page_contact", path: "kontakt/index.html", url: "/preview/kontakt/" },
    ]);
  });
});
