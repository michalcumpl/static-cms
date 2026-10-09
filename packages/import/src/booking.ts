// Booking services the import recognises in embeds and link buttons (import-existing-blocks
// design decision 6). A page embedding one gets a call to action leading to the service instead
// of a left-out widget. The list grows as imports meet others.

const BOOKING_HOSTS = [
  "lodgify.com",
  "booking.com",
  "reservio.com",
  "reservio.cz",
  "bookio.com",
  "calendly.com",
  "reservanto.cz",
  "noona.app",
  "simplybook.me",
  "simplybook.it",
  "bookero.pl",
  "bookero.cz",
  "previo.cz",
  "airbnb.com",
  "airbnb.cz",
];

/** Whether an address belongs to a booking service the import knows. */
export function isBookingService(url: URL): boolean {
  const host = url.hostname.toLowerCase();
  return BOOKING_HOSTS.some((known) => host === known || host.endsWith(`.${known}`));
}

/** Parameters that only make a booking page draw itself as a widget. */
const WIDGET_PARAMETERS = ["widget", "embed", "embedded", "iframe", "frame"];

/** The booking page a widget's address shows, without its widget-only parameters. */
export function bookingPage(url: URL): string {
  const page = new URL(url.href);
  for (const name of WIDGET_PARAMETERS) page.searchParams.delete(name);
  return page.href;
}
