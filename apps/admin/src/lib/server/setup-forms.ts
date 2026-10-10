import type { Weekday } from "@webmio/model";
import { SETUP_WEEKDAYS, type SetupPhoto } from "@webmio/templates";
import { MAX_SETUP_ITEMS, type StepInput } from "./setup";

// The guided setup's forms read into what each step answers (guided-setup design decision 4).
// Repeated fields are numbered: `services.0.name`, `photos.2.key`.

const text = (form: FormData, name: string) => String(form.get(name) ?? "");

/** The numbered rows of a repeated field, in order, as long as the form has them. */
function rows<T>(read: (i: number) => T | undefined): T[] {
  const out: T[] = [];
  for (let i = 0; i < MAX_SETUP_ITEMS + 1; i++) {
    const row = read(i);
    if (row !== undefined) out.push(row);
  }
  return out;
}

/** A step's form as its answers, or undefined for a step without a form. */
export function stepInput(step: number, form: FormData): StepInput | undefined {
  switch (step) {
    case 1:
      return {
        step,
        type: text(form, "type"),
        name: text(form, "name"),
        sentence: text(form, "sentence"),
      };
    case 2:
      return { step, template: text(form, "template") };
    case 3: {
      const hours: Partial<Record<Weekday, [string, string][]>> = {};
      for (const day of SETUP_WEEKDAYS) {
        hours[day] = [[text(form, `hours.${day}.opens`), text(form, `hours.${day}.closes`)]];
      }
      return {
        step,
        phone: text(form, "phone"),
        email: text(form, "email"),
        street: text(form, "street"),
        postal_code: text(form, "postal_code"),
        city: text(form, "city"),
        hours,
      };
    }
    case 4:
      return {
        step,
        services: rows((i) =>
          form.has(`services.${i}.name`)
            ? {
                name: text(form, `services.${i}.name`),
                description: text(form, `services.${i}.description`),
                price: text(form, `services.${i}.price`),
              }
            : undefined,
        ),
      };
    case 5: {
      const photo = (prefix: string): SetupPhoto | undefined => {
        const key = text(form, `${prefix}.key`);
        return key ? { key, alt: text(form, `${prefix}.alt`) } : undefined;
      };
      const photos = rows((i) => photo(`photos.${i}`));
      // The main photo goes first: the hero takes the first.
      const main = Number(text(form, "main"));
      const first = photos[main];
      const ordered = first ? [first, ...photos.filter((p) => p !== first)] : photos;
      return { step, logo: photo("logo"), photos: ordered };
    }
    case 6:
      return { step, pages: form.getAll("pages").map(String) };
    default:
      return undefined;
  }
}
