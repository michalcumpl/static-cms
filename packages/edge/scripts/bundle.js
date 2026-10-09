// Builds the two edge functions from their handlers and the modules they run (own-hosting
// design.md decisions 3 and 4): dist/viewer-request.js for CloudFront Functions and
// dist/origin-response.mjs for Lambda@Edge. Each is one file: the handler's imports, the module
// without its exports and comments, then the handler.
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

/**
 * Code without comments and blank lines.
 * @param {string} code
 * @returns {string[]}
 */
function codeLines(code) {
  return code
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .split("\n")
    .filter((line) => !/^\s*\/\//.test(line) && line.trim() !== "");
}

/**
 * The handler's import lines, the module without its `export` keywords, then the rest of the
 * handler, whose exports stay.
 * @param {string} handler
 * @param {string} module
 * @returns {string}
 */
export function bundle(handler, module) {
  const lines = codeLines(handler);
  const imports = lines.filter((line) => line.startsWith("import "));
  const rest = lines.filter((line) => !line.startsWith("import "));
  const inlined = codeLines(module).map((line) => line.replace(/^export /, ""));
  return `${[...imports, ...inlined, ...rest].join("\n")}\n`;
}

/**
 * @param {string} handler
 * @param {string} module
 * @param {string} output
 */
function build(handler, module, output) {
  const read = (/** @type {string} */ path) => readFileSync(join(root, path), "utf8");
  const code = bundle(read(handler), read(module));
  mkdirSync(join(root, "dist"), { recursive: true });
  writeFileSync(join(root, output), code);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  build("src/handlers/viewer-request.js", "src/router.js", "dist/viewer-request.js");
  build("src/handlers/origin-response.js", "src/not-found.js", "dist/origin-response.mjs");
}
