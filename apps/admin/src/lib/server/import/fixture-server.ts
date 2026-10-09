// A local web server for the import's tests (site-import design decision 12): the invented sites
// of `@webmio/import`'s fixtures, their own address replaced by the server's, and a few addresses
// that misbehave. Never used outside tests and the admin command's tests.
import { existsSync, readFileSync } from "node:fs";
import { createServer, type Server } from "node:http";
import { createRequire } from "node:module";
import { dirname, extname, join, normalize } from "node:path";
import { gzipSync } from "node:zlib";

const require = createRequire(import.meta.url);
const fixtures = dirname(require.resolve("@webmio/import/fixtures/README.md"));

/** The address each fixture site names itself by in its files. */
const ORIGINS: Record<string, string> = {
  bakery: "https://pekarna-ulipy.cz",
  studio: "https://northlight.example",
  spa: "https://kavarna.example",
};

const TYPES: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css",
  ".xml": "application/xml",
  ".txt": "text/plain",
  ".jpg": "image/jpeg",
  ".png": "image/png",
  ".svg": "image/svg+xml",
};

export interface FixtureServer {
  /** `http://127.0.0.1:<port>` */
  origin: string;
  /** `127.0.0.1:<port>`, for `allowHosts`. */
  host: string;
  /** How many requests each path got. */
  hits: Map<string, number>;
  /** Paths that answer 503 while they are in the set, for retries. */
  failing: Set<string>;
  close: () => Promise<void>;
}

/**
 * Serves one fixture site. Besides its files: `/slow` answers after 20 s, `/huge` is a gzip
 * response of 6 MB of text, `/to-metadata` redirects to the cloud metadata address, `/loop`
 * redirects to itself, `/broken` answers 500, and the paths in `failing` answer 503.
 * `/__fixture/fail?path=…` makes a path fail, `/__fixture/answer?path=…` makes it answer a page
 * titled by `title`, and `/__fixture/reset` undoes both (the end-to-end tests' retries).
 * The site `"generated"` has no files: a home page and 50 pages `/strana-N.html` in its sitemap.
 */
export function startFixtureServer(site: string, port = 0): Promise<FixtureServer> {
  const hits = new Map<string, number>();
  const failing = new Set<string>();
  const answering = new Map<string, string>();
  let origin = "";
  const server: Server = createServer((request, response) => {
    const path = decodeURIComponent((request.url ?? "/").split("?")[0] ?? "/");
    if (path.startsWith("/__fixture/")) {
      const query = new URL(request.url ?? "/", "http://fixture").searchParams;
      const target = query.get("path") ?? "";
      if (path === "/__fixture/fail") failing.add(target);
      if (path === "/__fixture/answer") {
        failing.delete(target);
        const title = query.get("title") ?? "Stránka";
        answering.set(
          target,
          `<!doctype html><html lang="cs"><head><meta charset="utf-8"><title>${title}</title></head><body><main><h1>${title}</h1><p>Tato stránka teď odpovídá.</p></main></body></html>`,
        );
      }
      if (path === "/__fixture/reset") {
        failing.clear();
        answering.clear();
      }
      response.end("ok");
      return;
    }
    hits.set(path, (hits.get(path) ?? 0) + 1);
    const answer = answering.get(path);
    if (answer !== undefined && !failing.has(path)) {
      response.writeHead(200, { "content-type": "text/html; charset=utf-8" });
      response.end(answer);
      return;
    }
    if (failing.has(path)) {
      response.writeHead(503);
      response.end();
      return;
    }
    if (path === "/slow") {
      setTimeout(() => response.end("late"), 20_000).unref();
      return;
    }
    if (path === "/huge") {
      response.writeHead(200, { "content-type": "text/html", "content-encoding": "gzip" });
      response.end(gzipSync(Buffer.alloc(6 * 1024 * 1024, "a")));
      return;
    }
    if (path === "/to-metadata") {
      response.writeHead(302, { location: "http://169.254.169.254/latest/meta-data/" });
      response.end();
      return;
    }
    if (path === "/loop") {
      response.writeHead(302, { location: "/loop" });
      response.end();
      return;
    }
    if (path === "/broken") {
      response.writeHead(500);
      response.end();
      return;
    }
    if (site === "generated") {
      const generated = generatedPage(path, origin);
      response.writeHead(generated ? 200 : 404, {
        "content-type": path.endsWith(".xml") ? "application/xml" : "text/html; charset=utf-8",
      });
      response.end(generated ?? "<h1>Not found</h1>");
      return;
    }
    const file = normalize(join(fixtures, site, path.endsWith("/") ? `${path}index.html` : path));
    if (!file.startsWith(join(fixtures, site)) || !existsSync(file)) {
      response.writeHead(404, { "content-type": "text/html" });
      response.end("<h1>Not found</h1>");
      return;
    }
    const type = TYPES[extname(file)] ?? "application/octet-stream";
    let body: Buffer = readFileSync(file);
    if (/^(text|application\/xml)/.test(type)) {
      body = Buffer.from(body.toString("utf8").replaceAll(ORIGINS[site] ?? "\0", origin));
    }
    response.writeHead(200, { "content-type": type });
    response.end(body);
  });
  return new Promise((resolve) => {
    server.listen(port, "127.0.0.1", () => {
      const address = server.address();
      const bound = typeof address === "object" && address ? address.port : 0;
      origin = `http://127.0.0.1:${bound}`;
      resolve({
        origin,
        host: `127.0.0.1:${bound}`,
        hits,
        failing,
        close: () =>
          new Promise((done) => {
            server.closeAllConnections();
            server.close(() => done());
          }),
      });
    });
  });
}

/** Pages of the site generated for the page limit: a home page and 50 pages in the sitemap. */
const GENERATED_PAGES = 50;

function generatedPage(path: string, origin: string): string | undefined {
  const page = (title: string, body: string) =>
    `<!doctype html><html lang="cs"><head><meta charset="utf-8"><title>${title} | Vzorek</title></head><body><main><h1>${title}</h1><p>${body}</p></main></body></html>`;
  if (path === "/") return page("Vzorek", "Web s mnoha stránkami pro zkoušku limitu stránek.");
  if (path === "/sitemap.xml") {
    const urls = Array.from(
      { length: GENERATED_PAGES },
      (_, i) => `<url><loc>${origin}/strana-${i + 1}.html</loc></url>`,
    );
    return `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls.join("")}</urlset>`;
  }
  const n = Number(/^\/strana-(\d+)\.html$/.exec(path)?.[1]);
  if (n >= 1 && n <= GENERATED_PAGES) return page(`Strana ${n}`, `Obsah stránky číslo ${n}.`);
  return undefined;
}
