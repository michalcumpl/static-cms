// The server's shared resources, created on first use. Tests swap them with the `use…` setters.
import { RateLimiter, signInLimiter } from "./auth";
import { type Db, openDatabase } from "./db/index";
import { failInterruptedImports } from "./import/job";
import { createMailer, type Mailer } from "./mail";
import { upgradeProjects } from "./upgrade-projects";

let db: Db | undefined;
let mailer: Mailer | undefined;
let limiter: RateLimiter | undefined;

/**
 * The database, opened on first use. Projects stored in an older document format are upgraded
 * before anything else reads them; if that fails, every request fails until it is fixed.
 */
export function getDb(): Db {
  if (!db) {
    const opened = openDatabase();
    try {
      const count = upgradeProjects(opened);
      if (count > 0) console.info(`Upgraded ${count} project(s) to the current document format.`);
      // Imports run in this process: any still running were cut off when it stopped.
      failInterruptedImports(opened);
    } catch (err) {
      console.error(err);
      throw err;
    }
    db = opened;
  }
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
