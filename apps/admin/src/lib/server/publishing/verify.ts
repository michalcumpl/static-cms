// Verifying the live website after the switch (safe-publishing design.md decision 4): every page
// and file of the publish must be what the website serves at its address, within a deadline.
import { createHash } from "node:crypto";
import { addressOf, type SiteFiles } from "@webmio/export";

/** Fetches from the live website: the internet, or a hosting fake in tests. */
export type FetchLive = (url: string, init?: RequestInit) => Promise<Response>;

export interface VerifyOptions {
  /** How long the website gets to serve the new publish everywhere. */
  deadlineMs?: number;
  /** How often the home page is asked while waiting for the switch. */
  pollMs?: number;
  /** How often a file that doesn't match yet is asked again. */
  retryMs?: number;
  concurrency?: number;
}

export type VerifyResult = { ok: true } | { ok: false; failing: string[] };

/** Files compared byte for byte; the rest only by size. */
const TEXT = /\.(html|css|js|mjs|xml|txt|json|webmanifest)$/i;
/** Files the hosting keeps for itself, never served. */
const NOT_SERVED = new Set(["_redirects"]);

const sha256 = (bytes: Uint8Array) => createHash("sha256").update(bytes).digest("hex");
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

interface Expected {
  url: string;
  address: string;
  text: boolean;
  hash: string;
  size: number;
}

/** Whether the live website serves this file as published. */
async function matches(file: Expected, fetchLive: FetchLive): Promise<boolean> {
  const init: RequestInit = { cache: "no-store", redirect: "manual" };
  try {
    if (!file.text) {
      const head = await fetchLive(file.url, { ...init, method: "HEAD" });
      const length = head.headers.get("content-length");
      // A matching length settles it; a missing or different one is confirmed with GET, since
      // some servers answer HEAD without the real length.
      if (head.status === 200 && length !== null && Number(length) === file.size) return true;
      if (head.status !== 200 && head.status !== 405) return false;
    }
    const response = await fetchLive(file.url, { ...init, method: "GET" });
    if (response.status !== 200) {
      await response.body?.cancel().catch(() => {});
      return false;
    }
    const body = new Uint8Array(await response.arrayBuffer());
    return file.text ? sha256(body) === file.hash : body.byteLength === file.size;
  } catch {
    return false;
  }
}

/**
 * Waits until the home page is the published one (the switch has reached the edge), then checks
 * every file once and asks again for the ones that don't match yet, until the deadline. Pages
 * are fetched at their address (`/kontakt/`), so the hosting's routing is part of the check.
 */
export async function verifyLive(
  files: SiteFiles,
  address: string,
  fetchLive: FetchLive,
  options: VerifyOptions = {},
): Promise<VerifyResult> {
  const deadline = Date.now() + (options.deadlineMs ?? 120_000);
  const pollMs = options.pollMs ?? 3000;
  const retryMs = options.retryMs ?? 5000;
  const concurrency = options.concurrency ?? 8;
  const base = address.replace(/\/+$/, "");

  const expected: Expected[] = [];
  for (const [path, bytes] of files) {
    if (NOT_SERVED.has(path)) continue;
    const fileAddress = addressOf(path);
    expected.push({
      url: `${base}${fileAddress}`,
      address: fileAddress,
      text: TEXT.test(path),
      hash: sha256(bytes),
      size: bytes.byteLength,
    });
  }

  // The home page first: until it is the new one, nothing else is worth asking.
  const home = expected.find((file) => file.address === "/");
  if (home) {
    while (!(await matches(home, fetchLive))) {
      if (Date.now() + pollMs > deadline) return { ok: false, failing: ["/"] };
      await sleep(pollMs);
    }
  }

  let pending = expected.filter((file) => file !== home);
  for (;;) {
    const failed: Expected[] = [];
    let next = 0;
    await Promise.all(
      Array.from({ length: Math.min(concurrency, pending.length) }, async () => {
        while (next < pending.length) {
          const file = pending[next++] as Expected;
          if (!(await matches(file, fetchLive))) failed.push(file);
        }
      }),
    );
    if (failed.length === 0) return { ok: true };
    if (Date.now() + retryMs > deadline) {
      return { ok: false, failing: failed.map((file) => file.address).sort() };
    }
    pending = failed;
    await sleep(retryMs);
  }
}
