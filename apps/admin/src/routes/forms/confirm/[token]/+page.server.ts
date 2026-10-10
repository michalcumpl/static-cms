import { eq } from "drizzle-orm";
import { getDb } from "$lib/server/app";
import { confirmRecipient } from "$lib/server/contact-forms";
import { projects } from "$lib/server/db/schema";
import type { PageServerLoad } from "./$types";

/** An address following its confirmation link (contact-form spec, "Recipient address"). */
export const load: PageServerLoad = ({ params }) => {
  const confirmed = confirmRecipient(getDb(), params.token);
  if (!confirmed) return { email: null, site: null };
  const project = getDb().select().from(projects).where(eq(projects.id, confirmed.projectId)).get();
  return { email: confirmed.email, site: project?.name ?? "" };
};
