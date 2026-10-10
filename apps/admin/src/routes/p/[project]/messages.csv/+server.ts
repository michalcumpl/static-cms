import { i18n } from "$lib/i18n";
import { requireMember } from "$lib/server/access";
import { getDb } from "$lib/server/app";
import { listMessages, messageFilter, messagesCsv } from "$lib/server/messages";
import type { RequestHandler } from "./$types";

/**
 * The listed messages as CSV (contact-form spec, "Messages section"), with the same `?form=` and
 * `?unhandled=1` as the section, column names in the interface language.
 */
export const GET: RequestHandler = (event) => {
  requireMember(event, event.params.project);
  const { t } = i18n(event.locals.locale);
  const messages = listMessages(getDb(), event.params.project, messageFilter(event.url));
  const header = {
    date: t("messages.csv.date"),
    form: t("messages.csv.form"),
    page: t("messages.csv.page"),
    name: t("messages.csv.name"),
    email: t("messages.csv.email"),
    phone: t("messages.csv.phone"),
    when: t("messages.csv.when"),
    message: t("messages.csv.message"),
    handled: t("messages.csv.handled"),
  };
  const csv = messagesCsv(messages, header, (when) => t(`messages.when.${when as "any"}`));
  return new Response(csv, {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": 'attachment; filename="messages.csv"',
      "cache-control": "no-store",
    },
  });
};
