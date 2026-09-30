// Runs the fake Netlify API for the end-to-end tests (see playwright.config.ts).
import { startFakeNetlify } from "../src/lib/server/publishing/fake-netlify";

const port = Number(process.argv[2] ?? 5197);
const fake = await startFakeNetlify(port);
console.log(`Fake Netlify on ${fake.url}`);
