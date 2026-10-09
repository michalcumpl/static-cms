import { STANDARD } from "@webmio/templates";
import { describe, expect, it } from "vitest";
import { demoSite } from "$lib/server/demo";
import { inLanguage, pageLayouts, titleAfterChoosing } from "./add-page";

// The Add page dialog's starting points (template-system, site-editing "Adding pages").

const layout = (id: string) => {
  const found = STANDARD.layouts.find((l) => l.id === id);
  if (!found) throw new Error(`no layout ${id}`);
  return found;
};

describe("the Add page dialog's layouts", () => {
  it("offers the site template's layouts, in its order", () => {
    expect(pageLayouts(demoSite()).map((l) => l.id)).toEqual([
      "home",
      "services",
      "about",
      "team",
      "contact",
      "faq",
      "careers",
    ]);
  });

  it("names layouts in Czech for Czech, and in English otherwise", () => {
    expect(inLanguage(layout("services").name, "cs")).toBe("Služby");
    expect(inLanguage(layout("services").name, "en")).toBe("Services");
    expect(inLanguage(layout("services").name, "de")).toBe("Services");
  });
});

describe("the title when a layout is chosen", () => {
  it("fills an empty title with the layout's name in the site's language", () => {
    expect(titleAfterChoosing("", undefined, layout("services"), "cs")).toBe("Služby");
  });

  it("follows the choice while the title is still the previous layout's name", () => {
    expect(titleAfterChoosing("Služby", layout("services"), layout("about"), "cs")).toBe("O nás");
  });

  it("Owner's own title kept", () => {
    expect(titleAfterChoosing("Co děláme", undefined, layout("services"), "cs")).toBe("Co děláme");
    expect(titleAfterChoosing("Co děláme", layout("about"), layout("services"), "cs")).toBe(
      "Co děláme",
    );
  });

  it("keeps the title when going back to a blank page", () => {
    expect(titleAfterChoosing("Služby", layout("services"), undefined, "cs")).toBe("Služby");
  });
});
