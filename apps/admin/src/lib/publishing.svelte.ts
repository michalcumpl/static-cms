import type { Problem } from "@webmio/model";
import type { ProjectPaths } from "./project-paths";

// The browser side of publishing: start a publish, follow it until it finishes, and keep the
// project's publishing state (address, domain, history) up to date.

export interface PublishSummary {
  id: string;
  state: "running" | "ready" | "failed";
  url: string | null;
  error: string | null;
  publishedBy: string | null;
  startedAt: string;
  finishedAt: string | null;
  live: boolean;
  /** Whether it can be made live again (Webmio hosting keeps the newest publishes' files). */
  restorable: boolean;
  /** What a running publish is doing (safe-publishing design.md decision 7). */
  step: "checking" | "uploading" | "verifying" | null;
  /** What a successful publish warns about, such as links to other websites that didn't answer. */
  warnings: PublishWarning[];
}

export type PublishWarning =
  | { kind: "outside-link"; page: string; url: string; status?: number }
  | { kind: "outside-links-skipped"; count: number };

export interface DnsRecord {
  type: "A" | "CNAME";
  name: string;
  value: string;
}

export interface PublishingInfo {
  /** Whether it can publish without anyone connecting hosting first. */
  canPublish: boolean;
  /** Where the website is hosted, or would be on its first publish. */
  provider: "webmio" | "netlify";
  /** The workspace's Netlify team, when connected. */
  team: string | null;
  address: string | null;
  defaultUrl: string | null;
  domain: string | null;
  domainState: "waiting-for-dns" | "issuing-certificate" | "ready" | null;
  /** Webmio hosting, bare domain, redirect server: the bare domain's own state. */
  apexState: "waiting-for-dns" | "issuing-certificate" | "redirecting" | null;
  dnsRecords: DnsRecord[];
  /** Webmio hosting, bare domain, no redirect server: where to forward it at the registrar. */
  forwardTo: string | null;
  publishes: PublishSummary[];
}

export type PublishStatus =
  | { kind: "idle" }
  | { kind: "publishing"; step?: PublishSummary["step"] }
  | { kind: "published"; url: string; warnings: number }
  /**
   * `message` is the server's own explanation (already in the interface language); without one,
   * `problems` means the site has errors, else `httpStatus` says what failed.
   */
  | { kind: "failed"; message?: string; problems?: Problem[]; httpStatus?: number };

const POLL_MS = 2000;

export class Publishing {
  info = $state<PublishingInfo | undefined>();
  status = $state<PublishStatus>({ kind: "idle" });
  #timer: ReturnType<typeof setTimeout> | undefined;

  constructor(readonly paths: ProjectPaths) {}

  get latest(): PublishSummary | undefined {
    return this.info?.publishes[0];
  }

  /** Loads the state; follows a running publish until it finishes. */
  async refresh(): Promise<void> {
    const response = await fetch(this.paths.publishes);
    if (!response.ok) return;
    this.info = await response.json();
    const latest = this.latest;
    if (latest?.state === "running") {
      this.status = { kind: "publishing", step: latest.step };
      clearTimeout(this.#timer);
      this.#timer = setTimeout(() => void this.refresh(), POLL_MS);
    } else if (this.status.kind === "publishing" && latest) {
      this.status =
        latest.state === "ready"
          ? { kind: "published", url: latest.url ?? "", warnings: latest.warnings.length }
          : { kind: "failed", message: latest.error ?? undefined };
    }
  }

  async publish(): Promise<void> {
    this.status = { kind: "publishing" };
    const response = await fetch(this.paths.publish, { method: "POST" });
    const body = await response.json().catch(() => ({}));
    if (response.status === 202) {
      await this.refresh();
      return;
    }
    if (response.status === 422) {
      this.status = { kind: "failed", problems: body.problems ?? [] };
      return;
    }
    this.status = { kind: "failed", message: body.message, httpStatus: response.status };
  }

  stop(): void {
    clearTimeout(this.#timer);
  }
}
