// Links to other websites, asked once per publish whether they answer (safe-publishing
// design.md decision 3). The answers are warnings: another website being down never stops a
// publish.
import type { OutsideLink } from "@webmio/export";
import type { PublishWarning } from "../db/schema";

export type { PublishWarning };

export interface OutsideLinkOptions {
  fetch?: typeof fetch;
  timeoutMs?: number;
  concurrency?: number;
  /** At most this many addresses are asked per publish; the rest are skipped. */
  max?: number;
}

export const USER_AGENT = "Webmio link check (+https://webmio.cz)";

/** Whether the server checks outside links; `PUBLISH_CHECK_OUTSIDE_LINKS=false` turns it off. */
export function outsideLinkChecksEnabled(
  env: Record<string, string | undefined> = process.env,
): boolean {
  return env.PUBLISH_CHECK_OUTSIDE_LINKS !== "false";
}

/**
 * Whether an answer means the address is there. Sites often refuse bots (401, 403, 429), which
 * still means they're there; a page that doesn't exist (404, 410) or a failing server isn't.
 */
export function answered(status: number): boolean {
  return status !== 404 && status !== 410 && status < 500;
}

/** The address's HTTP status, or undefined when it didn't answer in time. */
async function statusOf(
  url: string,
  options: Required<Omit<OutsideLinkOptions, "max" | "concurrency">>,
) {
  const ask = async (method: "HEAD" | "GET") => {
    const response = await options.fetch(url, {
      method,
      redirect: "follow",
      headers: { "user-agent": USER_AGENT },
      signal: AbortSignal.timeout(options.timeoutMs),
    });
    // Only the status matters; the body isn't read.
    await response.body?.cancel().catch(() => {});
    return response.status;
  };
  try {
    const status = await ask("HEAD");
    return status === 405 || status === 501 ? await ask("GET") : status;
  } catch {
    return undefined;
  }
}

/**
 * Asks each outside address once, a few at a time, and returns a warning for every link to an
 * address that didn't answer or answered that it isn't there.
 */
export async function checkOutsideLinks(
  links: readonly OutsideLink[],
  options: OutsideLinkOptions = {},
): Promise<PublishWarning[]> {
  const settings = {
    fetch: options.fetch ?? fetch,
    timeoutMs: options.timeoutMs ?? 5000,
  };
  const concurrency = options.concurrency ?? 8;
  const max = options.max ?? 100;
  const urls = [...new Set(links.map((link) => link.url))];
  const asked = urls.slice(0, max);
  const statuses = new Map<string, number | undefined>();
  let next = 0;
  await Promise.all(
    Array.from({ length: Math.min(concurrency, asked.length) }, async () => {
      while (next < asked.length) {
        const url = asked[next++] as string;
        statuses.set(url, await statusOf(url, settings));
      }
    }),
  );
  const warnings: PublishWarning[] = [];
  for (const link of links) {
    if (!statuses.has(link.url)) continue;
    const status = statuses.get(link.url);
    if (status !== undefined && answered(status)) continue;
    warnings.push({
      kind: "outside-link",
      page: link.page,
      url: link.url,
      ...(status === undefined ? {} : { status }),
    });
  }
  if (urls.length > max) warnings.push({ kind: "outside-links-skipped", count: urls.length - max });
  return warnings;
}
