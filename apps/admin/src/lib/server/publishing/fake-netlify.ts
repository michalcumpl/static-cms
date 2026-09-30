// A stand-in for Netlify's API in tests (netlify-publishing design.md decision 9): the endpoints
// the adapter uses, in memory, plus the live deploy of each site served at
// `/sites/<site name>/<path>` with its `_redirects`, so tests see what visitors would see.
// Test controls are under `/__fake/` for tests that run the server in another process.
import { createHash, randomBytes } from "node:crypto";
import { createServer, type IncomingMessage, type Server, type ServerResponse } from "node:http";

interface FakeSite {
  id: string;
  name: string;
  account: string;
  customDomain: string | null;
  aliases: string[];
  ssl: boolean;
  liveDeploy?: string;
}

interface FakeDeploy {
  id: string;
  siteId: string;
  /** Path (`/index.html`) to SHA-1. */
  files: Record<string, string>;
  missing: Set<string>;
  state: "uploading" | "ready";
}

export interface FakeNetlify {
  url: string;
  sites: Map<string, FakeSite>;
  deploys: Map<string, FakeDeploy>;
  /** Paths uploaded so far, in order. */
  uploads: string[];
  /** A token and the teams it can access; unknown tokens get 401. */
  addToken(token: string, teams: { slug: string; name: string }[]): void;
  /** Makes a token unknown again, as if it were revoked at Netlify. */
  revokeToken(token: string): void;
  /** While down, every API request fails like an unreachable server. */
  setDown(down: boolean): void;
  /** Issues the certificate of a site's custom domain (DNS "done"). */
  issueCertificate(siteName: string): void;
  close(): Promise<void>;
}

const sha1 = (bytes: Uint8Array) => createHash("sha1").update(bytes).digest("hex");
const id = () => randomBytes(8).toString("hex");

async function body(request: IncomingMessage): Promise<Buffer> {
  const chunks: Buffer[] = [];
  for await (const chunk of request) chunks.push(chunk as Buffer);
  return Buffer.concat(chunks);
}

function json(response: ServerResponse, status: number, value: unknown): void {
  response.writeHead(status, { "content-type": "application/json" });
  response.end(JSON.stringify(value));
}

export async function startFakeNetlify(port = 0): Promise<FakeNetlify> {
  const tokens = new Map<string, { slug: string; name: string }[]>();
  const sites = new Map<string, FakeSite>();
  const deploys = new Map<string, FakeDeploy>();
  const blobs = new Map<string, Buffer>();
  const uploads: string[] = [];
  let down = false;

  const siteJson = (site: FakeSite) => ({
    id: site.id,
    name: site.name,
    url: `http://${site.name}.netlify.app`,
    ssl_url: `https://${site.name}.netlify.app`,
    custom_domain: site.customDomain,
    domain_aliases: site.aliases,
    ssl: site.ssl,
    published_deploy: site.liveDeploy ? { id: site.liveDeploy } : null,
  });

  const finishIfComplete = (deploy: FakeDeploy) => {
    if (deploy.missing.size > 0) return;
    deploy.state = "ready";
    const site = sites.get(deploy.siteId);
    if (site) site.liveDeploy = deploy.id;
  };

  /** What a visitor gets for a path of a site's live deploy. */
  const serveSite = (siteName: string, path: string, response: ServerResponse) => {
    const site = [...sites.values()].find((s) => s.name === siteName);
    const deploy = site?.liveDeploy ? deploys.get(site.liveDeploy) : undefined;
    if (!deploy) return json(response, 404, { error: "not found" });
    const redirects = deploy.files["/_redirects"];
    if (redirects) {
      for (const line of (blobs.get(redirects)?.toString("utf8") ?? "").split("\n")) {
        const [from, to, status] = line.trim().split(/\s+/);
        if (from && to && from === path) {
          response.writeHead(Number(status ?? 301), { location: to });
          return response.end();
        }
      }
    }
    const file = deploy.files[path.endsWith("/") ? `${path}index.html` : path];
    const bytes = file ? blobs.get(file) : undefined;
    if (!bytes) return json(response, 404, { error: "not found" });
    response.writeHead(200);
    response.end(bytes);
  };

  const server: Server = createServer(async (request, response) => {
    const url = new URL(request.url ?? "/", "http://fake");
    const path = url.pathname;
    try {
      if (path.startsWith("/__fake/")) {
        const input =
          request.method === "POST" ? JSON.parse((await body(request)).toString() || "{}") : {};
        if (path === "/__fake/token") tokens.set(input.token, input.teams);
        else if (path === "/__fake/down") down = Boolean(input.down);
        else if (path === "/__fake/ssl") fake.issueCertificate(input.siteName);
        else if (path === "/__fake/uploads") return json(response, 200, uploads);
        else if (path === "/__fake/sites") return json(response, 200, [...sites.values()]);
        return json(response, 200, { ok: true });
      }
      const served = /^\/sites\/([^/]+)(\/.*)$/.exec(path);
      if (served && request.method === "GET")
        return serveSite(served[1] ?? "", served[2] ?? "/", response);

      if (down) {
        request.socket.destroy();
        return;
      }
      const token = (request.headers.authorization ?? "").replace(/^Bearer /, "");
      const teams = tokens.get(token);
      if (!teams) return json(response, 401, { message: "Access Denied" });
      const api = path.replace(/^\/api\/v1/, "");
      /** The route's captures when the request matches it. */
      const on = (method: string, pattern: RegExp) =>
        method === "*" || request.method === method ? pattern.exec(api) : null;

      if (request.method === "GET" && api === "/accounts") return json(response, 200, teams);

      const createSite = on("POST", /^\/([^/]+)\/sites$/);
      if (createSite) {
        const account = decodeURIComponent(createSite[1] ?? "");
        if (!teams.some((t) => t.slug === account))
          return json(response, 404, { message: "Not found" });
        const { name } = JSON.parse((await body(request)).toString());
        if ([...sites.values()].some((s) => s.name === name)) {
          return json(response, 422, { errors: { subdomain: ["must be unique"] } });
        }
        const site: FakeSite = {
          id: id(),
          name,
          account,
          customDomain: null,
          aliases: [],
          ssl: false,
        };
        sites.set(site.id, site);
        return json(response, 201, siteJson(site));
      }

      const siteRoute = on("*", /^\/sites\/([^/]+)$/);
      if (siteRoute) {
        const site = sites.get(decodeURIComponent(siteRoute[1] ?? ""));
        if (!site) return json(response, 404, { message: "Not found" });
        if (request.method === "PATCH") {
          const input = JSON.parse((await body(request)).toString());
          if ("custom_domain" in input) {
            site.customDomain = input.custom_domain;
            site.ssl = false;
          }
          if ("domain_aliases" in input) site.aliases = input.domain_aliases;
        }
        return json(response, 200, siteJson(site));
      }

      const ssl = on("POST", /^\/sites\/([^/]+)\/ssl$/);
      if (ssl) {
        return json(response, 200, { state: "pending" });
      }

      const createDeploy = on("POST", /^\/sites\/([^/]+)\/deploys$/);
      if (createDeploy) {
        const site = sites.get(decodeURIComponent(createDeploy[1] ?? ""));
        if (!site) return json(response, 404, { message: "Not found" });
        const { files } = JSON.parse((await body(request)).toString()) as {
          files: Record<string, string>;
        };
        const missing = new Set(Object.values(files).filter((hash) => !blobs.has(hash)));
        const deploy: FakeDeploy = {
          id: id(),
          siteId: site.id,
          files,
          missing,
          state: "uploading",
        };
        deploys.set(deploy.id, deploy);
        finishIfComplete(deploy);
        return json(response, 200, { id: deploy.id, state: deploy.state, required: [...missing] });
      }

      const upload = on("PUT", /^\/deploys\/([^/]+)\/files\/(.+)$/);
      if (upload) {
        const deploy = deploys.get(decodeURIComponent(upload[1] ?? ""));
        if (!deploy) return json(response, 404, { message: "Not found" });
        const filePath = `/${(upload[2] ?? "").split("/").map(decodeURIComponent).join("/")}`;
        const bytes = await body(request);
        const hash = sha1(bytes);
        if (deploy.files[filePath] !== hash)
          return json(response, 422, { message: "digest mismatch" });
        blobs.set(hash, bytes);
        uploads.push(filePath);
        deploy.missing.delete(hash);
        finishIfComplete(deploy);
        return json(response, 200, { path: filePath });
      }

      const deployState = on("GET", /^\/deploys\/([^/]+)$/);
      if (deployState) {
        const deploy = deploys.get(decodeURIComponent(deployState[1] ?? ""));
        if (!deploy) return json(response, 404, { message: "Not found" });
        return json(response, 200, { id: deploy.id, state: deploy.state });
      }

      const restore = on("POST", /^\/sites\/([^/]+)\/deploys\/([^/]+)\/restore$/);
      if (restore) {
        const site = sites.get(decodeURIComponent(restore[1] ?? ""));
        const deploy = deploys.get(decodeURIComponent(restore[2] ?? ""));
        if (!site || !deploy || deploy.state !== "ready")
          return json(response, 404, { message: "Not found" });
        site.liveDeploy = deploy.id;
        return json(response, 200, { id: deploy.id, state: "ready" });
      }

      return json(response, 404, { message: `No fake for ${request.method} ${path}` });
    } catch (error) {
      json(response, 500, { message: String(error) });
    }
  });

  await new Promise<void>((resolve) => server.listen(port, "127.0.0.1", resolve));
  const address = server.address();
  const actualPort = typeof address === "object" && address ? address.port : port;

  const fake: FakeNetlify = {
    url: `http://127.0.0.1:${actualPort}`,
    sites,
    deploys,
    uploads,
    addToken: (token, teams) => tokens.set(token, teams),
    revokeToken: (token) => {
      tokens.delete(token);
    },
    setDown: (value) => {
      down = value;
    },
    issueCertificate(siteName) {
      const site = [...sites.values()].find((s) => s.name === siteName);
      if (site?.customDomain) site.ssl = true;
    },
    close: () =>
      new Promise<void>((resolve) => {
        server.closeAllConnections();
        server.close(() => resolve());
      }),
  };
  return fake;
}
