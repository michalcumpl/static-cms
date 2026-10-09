// Webmio hosting as a PublishTarget (own-hosting design.md decisions 1, 2, 5 and 7). A website
// is `sites/<siteId>/` in the bucket, with a folder and a manifest per deploy; the edge serves the
// deploy that `s:<siteId>` names, for each hostname `h:<hostname>` maps to the website.
import { createHash } from "node:crypto";
import { cacheControlOf, contentTypeOf } from "@webmio/edge/content-types";
import { said } from "$lib/i18n";
import { newId } from "../ids";
import { isBareDomain } from "./hostnames";
import { type CreatedSite, type HostedSite, PublishError, type PublishTarget } from "./target";
import type { HostingBackend } from "./webmio-backend";

/** How many uploads and copies run at a time. */
const CONCURRENCY = 8;

const siteFolder = (siteId: string) => `sites/${siteId}/`;
const deployFolder = (siteId: string, deployId: string) => `sites/${siteId}/${deployId}/`;
const manifestKey = (siteId: string, deployId: string) =>
  `sites/${siteId}/${deployId}.manifest.json`;
const MANIFEST = ".manifest.json";

/** A deploy's files and their SHA-256, as `<deployId>.manifest.json` records them. */
type Manifest = Record<string, string>;

const sha256 = (bytes: Uint8Array) => createHash("sha256").update(bytes).digest("hex");

/**
 * Runs `work` for every item, at most `limit` at a time. After a failure no new work starts;
 * it rejects with the first failure once the running work has finished, so a cleanup that
 * follows sees every file that was written.
 */
async function inPool<T>(items: readonly T[], limit: number, work: (item: T) => Promise<void>) {
  let next = 0;
  let failure: { error: unknown } | undefined;
  const worker = async () => {
    while (!failure && next < items.length) {
      const item = items[next++] as T;
      try {
        await work(item);
      } catch (error) {
        failure ??= { error };
      }
    }
  };
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  if (failure) throw failure.error;
}

export function webmioTarget(hosting: HostingBackend): Required<PublishTarget> {
  const freeHost = (siteName: string) => `${siteName}.${hosting.sitesDomain}`;
  const servedHost = (domain: string) => (isBareDomain(domain) ? `www.${domain}` : domain);

  async function manifestOf(siteId: string, deployId: string): Promise<Manifest | undefined> {
    const bytes = await hosting.getObject(manifestKey(siteId, deployId));
    return bytes ? (JSON.parse(new TextDecoder().decode(bytes)) as Manifest) : undefined;
  }

  return {
    async createSite(name): Promise<CreatedSite> {
      const host = freeHost(name);
      if (await hosting.getKey(`h:${host}`)) {
        throw new PublishError("name-taken", said("server.webmio.nameTaken", { name: host }));
      }
      const siteId = newId("ws");
      await hosting.updateKeys({ put: { [`h:${host}`]: siteId } });
      return { siteId, siteName: name, defaultUrl: `https://${host}` };
    },

    async deploy(siteId, files) {
      const deployId = newId("dp");
      const folder = deployFolder(siteId, deployId);
      const live = await hosting.getKey(`s:${siteId}`);
      const previous = live ? ((await manifestOf(siteId, live)) ?? {}) : {};
      const manifest: Manifest = {};
      for (const [path, bytes] of files) manifest[path] = sha256(bytes);
      try {
        await inPool([...files], CONCURRENCY, async ([path, bytes]) => {
          if (live && previous[path] === manifest[path]) {
            await hosting.copyObject(`${deployFolder(siteId, live)}${path}`, `${folder}${path}`);
          } else {
            await hosting.putObject(`${folder}${path}`, bytes, {
              contentType: contentTypeOf(path),
              cacheControl: cacheControlOf(path),
            });
          }
        });
        await hosting.putObject(
          manifestKey(siteId, deployId),
          new TextEncoder().encode(JSON.stringify(manifest)),
          { contentType: "application/json", cacheControl: "no-store" },
        );
        // One key switches every hostname of the website to the new deploy.
        await hosting.updateKeys({ put: { [`s:${siteId}`]: deployId } });
      } catch (error) {
        // A failed publish leaves no files; the previous deploy stays live.
        await hosting.deletePrefix(folder).catch(() => {});
        await hosting.deletePrefix(manifestKey(siteId, deployId)).catch(() => {});
        throw error;
      }
      return { deployId };
    },

    async restore(siteId, deployId) {
      if (!(await manifestOf(siteId, deployId))) {
        throw new PublishError("failed", said("server.publishing.cantRestore"));
      }
      await hosting.updateKeys({ put: { [`s:${siteId}`]: deployId } });
    },

    async prune(siteId, keep) {
      const live = await hosting.getKey(`s:${siteId}`);
      const kept = new Set([...keep, ...(live ? [live] : [])]);
      const deployIds = new Set(
        (await hosting.listNames(siteFolder(siteId))).map((name) =>
          name.endsWith(MANIFEST) ? name.slice(0, -MANIFEST.length) : name,
        ),
      );
      for (const deployId of deployIds) {
        if (kept.has(deployId)) continue;
        // The manifest goes first: a deploy without one can't be made live again.
        await hosting.deletePrefix(manifestKey(siteId, deployId));
        await hosting.deletePrefix(deployFolder(siteId, deployId));
      }
    },

    servedHost,

    /**
     * Serves the domain's hostname from the website, through a tenant once CloudFront creates
     * one: only for a domain whose DNS already leads to it. Until then it returns undefined, and
     * the domain check calls it again.
     */
    async connectDomain(siteId, domain) {
      const host = servedHost(domain);
      const tenantId = await hosting.createTenant(siteId, host);
      await hosting.updateKeys({ put: { [`h:${host}`]: siteId } });
      return tenantId;
    },

    async disconnectDomain(_siteId, site?: HostedSite) {
      if (!site?.domain) return;
      if (site.domainRef) await hosting.deleteTenant(site.domainRef);
      await hosting.updateKeys({ delete: [`h:${servedHost(site.domain)}`] });
    },

    async certificateIssued(_siteId, site?: HostedSite) {
      if (!site?.domainRef) return false;
      const state = await hosting.certificateState(site.domainRef);
      // A request that failed or expired (DNS was set too late) gets another chance.
      if (state === "failed") await hosting.renewCertificate(site.domainRef);
      return state === "issued";
    },

    async setRedirectHost(site, host) {
      await hosting.updateKeys({
        put: { [`h:${freeHost(site.siteName)}`]: host ? `${site.siteId} ${host}` : site.siteId },
      });
    },

    async deleteSite(siteId, site?: HostedSite) {
      // Offline first: without its keys no hostname serves the website any more.
      const hosts = site ? [freeHost(site.siteName)] : [];
      if (site?.domain) hosts.push(servedHost(site.domain));
      await hosting.updateKeys({ delete: [...hosts.map((host) => `h:${host}`), `s:${siteId}`] });
      if (site?.domainRef) await hosting.deleteTenant(site.domainRef);
      await hosting.deletePrefix(siteFolder(siteId));
    },
  };
}
