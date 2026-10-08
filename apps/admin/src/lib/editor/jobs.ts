import type { Session } from "svedit";
import { locationsOf, normalizePhone } from "./business";
import { text } from "./transforms";

// A job's contact, set in the Job panel (jobs design decision 3). Email and phone follow the
// business details' rules; a value that breaks them isn't stored.

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE = /^\+[1-9][0-9]{6,14}$/;

export type JobContactField = "contact_name" | "contact_email" | "contact_phone";
export type JobContactResult =
  | { ok: true; value: string }
  | { ok: false; reason: "email" | "phone" };

/**
 * Sets a field of a job's contact as one undoable step: the phone normalised for the main
 * location's country (`777 294 579` → `+420777294579`), empty fields allowed.
 */
export function setJobContact(
  session: Session,
  jobId: string,
  field: JobContactField,
  input: string,
): JobContactResult {
  const typed = input.trim();
  let value = typed;
  if (field === "contact_email" && typed !== "" && !EMAIL.test(typed)) {
    return { ok: false, reason: "email" };
  }
  if (field === "contact_phone" && typed !== "") {
    value = normalizePhone(typed, locationsOf(session.doc)[0]?.country ?? "CZ");
    if (!PHONE.test(value)) return { ok: false, reason: "phone" };
  }
  const job = session.get(jobId) as Record<string, unknown> | undefined;
  if (!job) return { ok: true, value };
  const current =
    field === "contact_name" ? (job[field] as { content: string }).content : job[field];
  if (current !== value) {
    session.apply(session.tr.set([jobId, field], field === "contact_name" ? text(value) : value));
  }
  return { ok: true, value };
}
