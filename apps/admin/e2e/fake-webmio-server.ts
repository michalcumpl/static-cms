// Serves what the admin publishes to the Webmio hosting fake, for the end-to-end tests (see
// playwright.config.ts), through the same router and not-found handler as the edge. Browsers
// reach a website at `<name>.localhost:<port>`, which stands for `<name>.<sitesDomain>`.
import { mkdirSync } from "node:fs";
import { createServer } from "node:http";
import { resetFakeHosting, serveFake } from "../src/lib/server/publishing/webmio-fake";

const port = Number(process.argv[2] ?? 5196);
const dir = process.env.WEBMIO_HOSTING_FAKE_DIR ?? "";
const sitesDomain = process.env.WEBMIO_SITES_DOMAIN || "webmio.site";
if (!dir) throw new Error("WEBMIO_HOSTING_FAKE_DIR is not set");
mkdirSync(dir, { recursive: true });
// Off until a test switches it on (e2e/fixtures.ts).
resetFakeHosting(dir, false);

createServer(async (request, response) => {
  if (request.url === "/__fake/ready") {
    response.end("ok");
    return;
  }
  const url = new URL(request.url ?? "/", "http://localhost");
  const host = (request.headers.host ?? "")
    .replace(/:\d+$/, "")
    .replace(/\.localhost$/, `.${sitesDomain}`);
  const answer = await serveFake(dir, {
    host,
    uri: url.pathname,
    querystring: url.search.slice(1),
  });
  response.writeHead(answer.status, answer.headers);
  response.end(answer.body);
}).listen(port, "127.0.0.1", () => {
  console.log(`Fake Webmio hosting on http://<name>.localhost:${port}`);
});
