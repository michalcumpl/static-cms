import { createHash } from "node:crypto";
import { type MessageKey, said } from "$lib/i18n";
import { type CreatedSite, PublishError, type PublishTarget } from "./target";

// Netlify's API over fetch (netlify-publishing design.md, Context and Findings).

export const NETLIFY_API_URL = "https://api.netlify.com";

export interface NetlifyOptions {
  token: string;
  apiUrl?: string;
  fetch?: typeof fetch;
}

export interface NetlifyTeam {
  slug: string;
  name: string;
}

/** Waits between deploy state checks: 1 s, 2 s, 4 s, … up to 60 s in total. */
const POLL_DELAYS = [1000, 2000, 4000, 8000, 15_000, 30_000];

async function call(
  options: NetlifyOptions,
  method: string,
  path: string,
  body?: unknown,
  contentType = "application/json",
): Promise<Response> {
  const doFetch = options.fetch ?? fetch;
  let response: Response;
  try {
    response = await doFetch(`${options.apiUrl ?? NETLIFY_API_URL}/api/v1${path}`, {
      method,
      headers: {
        authorization: `Bearer ${options.token}`,
        ...(body === undefined ? {} : { "content-type": contentType }),
      },
      body:
        body === undefined
          ? undefined
          : contentType === "application/json"
            ? JSON.stringify(body)
            : (body as BodyInit),
    });
  } catch {
    throw new PublishError("unreachable", said("server.netlify.unreachable"));
  }
  if (response.status === 401 || response.status === 403) {
    throw new PublishError("unauthorized", said("server.netlify.unauthorized"));
  }
  return response;
}

type NetlifyAction = keyof typeof import("../../i18n/en").en.server.netlify.actions;

/** Netlify's answer if it succeeded; otherwise a failure naming what couldn't be done. */
async function expectOk(
  response: Response,
  action: NetlifyAction,
  params: Record<string, string> = {},
): Promise<Response> {
  if (response.ok) return response;
  const text = await response.text().catch(() => "");
  throw new PublishError(
    "failed",
    said("server.netlify.failed", {
      action: said(`server.netlify.actions.${action}` as MessageKey, params),
      detail: `${response.status}${text ? `: ${text.slice(0, 200)}` : ""}`,
    }),
  );
}

/** The teams a token can publish into. Throws "unauthorized" for a refused token. */
export async function listTeams(options: NetlifyOptions): Promise<NetlifyTeam[]> {
  const response = await expectOk(await call(options, "GET", "/accounts"), "listTeams");
  const accounts = (await response.json()) as { slug: string; name: string }[];
  return accounts.map(({ slug, name }) => ({ slug, name }));
}

/** SHA-1 of a file, as Netlify's deploy digests use. */
export function sha1(bytes: Uint8Array): string {
  return createHash("sha1").update(bytes).digest("hex");
}

/** A deploy path (`/kontakt/index.html`) as a URL path with each segment encoded. */
function encodePath(path: string): string {
  return path
    .split("/")
    .filter((segment) => segment !== "")
    .map(encodeURIComponent)
    .join("/");
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export function netlifyTarget(
  options: NetlifyOptions & { account: string; pollDelays?: number[] },
): PublishTarget {
  const delays = options.pollDelays ?? POLL_DELAYS;
  return {
    async createSite(name): Promise<CreatedSite> {
      const response = await call(
        options,
        "POST",
        `/${encodeURIComponent(options.account)}/sites`,
        {
          name,
        },
      );
      if (response.status === 422) {
        throw new PublishError("name-taken", said("server.netlify.nameTaken", { name }));
      }
      await expectOk(response, "createSite");
      const site = (await response.json()) as {
        id: string;
        name: string;
        ssl_url?: string;
        url?: string;
      };
      return {
        siteId: site.id,
        siteName: site.name,
        defaultUrl: `https://${site.name}.netlify.app`,
      };
    },

    async deploy(siteId, files) {
      const digest: Record<string, string> = {};
      const byHash = new Map<string, { path: string; bytes: Uint8Array }>();
      for (const [path, bytes] of files) {
        const hash = sha1(bytes);
        digest[`/${path}`] = hash;
        if (!byHash.has(hash)) byHash.set(hash, { path: `/${path}`, bytes });
      }
      const created = await expectOk(
        await call(options, "POST", `/sites/${encodeURIComponent(siteId)}/deploys`, {
          files: digest,
        }),
        "startDeploy",
      );
      const deploy = (await created.json()) as { id: string; required?: string[] };
      for (const hash of deploy.required ?? []) {
        const file = byHash.get(hash);
        if (!file) continue;
        await expectOk(
          await call(
            options,
            "PUT",
            `/deploys/${encodeURIComponent(deploy.id)}/files/${encodePath(file.path)}`,
            file.bytes,
            "application/octet-stream",
          ),
          "upload",
          { path: file.path },
        );
      }
      for (const delay of [0, ...delays]) {
        if (delay > 0) await sleep(delay);
        const state = (await (
          await expectOk(
            await call(options, "GET", `/deploys/${encodeURIComponent(deploy.id)}`),
            "checkDeploy",
          )
        ).json()) as { state: string; error_message?: string };
        if (state.state === "ready") return { deployId: deploy.id };
        if (state.state === "error") {
          throw new PublishError(
            "failed",
            state.error_message
              ? said("server.netlify.deployFailedBecause", { detail: state.error_message })
              : said("server.netlify.deployFailed"),
          );
        }
      }
      throw new PublishError("failed", said("server.netlify.deployTimeout"));
    },

    async restore(siteId, deployId) {
      await expectOk(
        await call(
          options,
          "POST",
          `/sites/${encodeURIComponent(siteId)}/deploys/${encodeURIComponent(deployId)}/restore`,
        ),
        "restore",
      );
    },

    async connectDomain(siteId, domain, aliases) {
      await expectOk(
        await call(options, "PATCH", `/sites/${encodeURIComponent(siteId)}`, {
          custom_domain: domain,
          domain_aliases: aliases,
        }),
        "connectDomain",
      );
      // Asks Netlify for the certificate; it is issued once DNS points at Netlify.
      await call(options, "POST", `/sites/${encodeURIComponent(siteId)}/ssl`);
      return undefined;
    },

    async disconnectDomain(siteId) {
      await expectOk(
        await call(options, "PATCH", `/sites/${encodeURIComponent(siteId)}`, {
          custom_domain: null,
          domain_aliases: [],
        }),
        "disconnectDomain",
      );
    },

    async deleteSite(siteId) {
      const response = await call(options, "DELETE", `/sites/${encodeURIComponent(siteId)}`);
      // Already gone counts as done: a retried deletion mustn't fail on it.
      if (response.status !== 404) await expectOk(response, "deleteSite");
    },

    /**
     * The live website. A fake Netlify (another `apiUrl`) serves each website by the hostname
     * visitors use at `<apiUrl>/hosts/<hostname>/<path>`.
     */
    fetchLive(url, init) {
      const doFetch = options.fetch ?? fetch;
      const apiUrl = options.apiUrl ?? NETLIFY_API_URL;
      if (apiUrl === NETLIFY_API_URL) return doFetch(url, init);
      const address = new URL(url);
      return doFetch(
        `${apiUrl}/hosts/${address.hostname}${address.pathname}${address.search}`,
        init,
      );
    },

    /** Netlify can't unpublish a site's only deploy: the new site goes as a whole. */
    async takeOffline(siteId) {
      await this.deleteSite(siteId);
      return { siteDeleted: true };
    },

    async certificateIssued(siteId) {
      const site = (await (
        await expectOk(
          await call(options, "GET", `/sites/${encodeURIComponent(siteId)}`),
          "readSite",
        )
      ).json()) as { ssl?: boolean; custom_domain?: string | null };
      return Boolean(site.ssl && site.custom_domain);
    },
  };
}
