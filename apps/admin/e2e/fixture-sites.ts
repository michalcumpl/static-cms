// The import's fixture websites for the end-to-end tests (site-import): the bakery and a site
// built by a script, each on its own port, until Playwright stops them.
import { startFixtureServer } from "../src/lib/server/import/fixture-server";

const [bakeryPort, spaPort] = process.argv.slice(2).map(Number);
await startFixtureServer("bakery", bakeryPort);
await startFixtureServer("spa", spaPort);
console.log(`Fixture sites on ${bakeryPort} and ${spaPort}`);
