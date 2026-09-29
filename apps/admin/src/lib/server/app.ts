// The server's shared resources, created on first use. Tests swap them with the `use…` setters.
import { RateLimiter, signInLimiter } from "./auth";
import { type Db, openDatabase } from "./db/index";
import { createMailer, type Mailer } from "./mail";

let db: Db | undefined;
let mailer: Mailer | undefined;
let limiter: RateLimiter | undefined;

export function getDb(): Db {
  db ??= openDatabase();
  return db;
}

export function getMailer(): Mailer {
  mailer ??= createMailer();
  return mailer;
}

export function getSignInLimiter(): RateLimiter {
  limiter ??= signInLimiter();
  return limiter;
}

/** For tests: use these instead of the configured database, mailer and limiter. */
export function useServices(services: { db?: Db; mailer?: Mailer; limiter?: RateLimiter }): void {
  if (services.db) db = services.db;
  if (services.mailer) mailer = services.mailer;
  if (services.limiter) limiter = services.limiter;
}

export { RateLimiter };
