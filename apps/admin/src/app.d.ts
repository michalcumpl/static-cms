// See https://svelte.dev/docs/kit/types#app.d.ts
import type { Locale } from "$lib/i18n";
import type { SessionUser } from "$lib/server/auth";

declare global {
  namespace App {
    interface Locals {
      /** The signed-in user, set by hooks.server.ts from the session cookie. */
      user?: SessionUser;
      /** The interface language, resolved by hooks.server.ts for every request. */
      locale: Locale;
    }
  }
}
