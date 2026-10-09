import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import vm from "node:vm";
import { beforeAll, describe, expect, it } from "vitest";

const root = join(import.meta.dirname, "..");
const read = (path: string) => readFileSync(join(root, path), "utf8");

beforeAll(() => {
  execFileSync(process.execPath, [join(root, "scripts/bundle.js")]);
});

/** Runs the viewer-request bundle with a fake `cloudfront` module over the given keys. */
async function runViewerRequest(keys: Record<string, string>, event: unknown) {
  const code = read("dist/viewer-request.js").replace(
    'import cf from "cloudfront";',
    "const cf = { kvs: () => ({ get: async (k) => { if (k in KEYS) return KEYS[k]; throw new Error('missing'); } }) };",
  );
  const context = vm.createContext({ KEYS: keys, encodeURIComponent, decodeURIComponent });
  vm.runInContext(code, context);
  return vm.runInContext("handler", context)(event);
}

describe("viewer-request bundle", () => {
  const code = () => read("dist/viewer-request.js");

  it("fits CloudFront Functions' 10 KB limit", () => {
    expect(Buffer.byteLength(code())).toBeLessThan(10 * 1024);
  });

  it("imports only cloudfront and exports nothing", () => {
    const imports = code()
      .split("\n")
      .filter((line) => line.startsWith("import "));
    expect(imports).toEqual(['import cf from "cloudfront";']);
    expect(code()).not.toMatch(/^export /m);
  });

  it("avoids syntax the CloudFront runtime doesn't have", () => {
    expect(code()).not.toMatch(/\?\.|\?\?|\bclass\b/);
  });

  it("rewrites a request to the live publish and drops its query string", async () => {
    const request = {
      uri: "/kontakt/",
      headers: { host: { value: "pekarna.webmio.site" } },
      querystring: { a: { value: "1" } },
    };
    const result = await runViewerRequest(
      { "h:pekarna.webmio.site": "ws_a", "s:ws_a": "dp_1" },
      { request },
    );
    expect(result).toMatchObject({ uri: "/sites/ws_a/dp_1/kontakt/index.html", querystring: {} });
  });

  it("answers with a response, keeping the query string in a redirect", async () => {
    const result = await runViewerRequest(
      { "h:pekarna.webmio.site": "ws_a", "s:ws_a": "dp_1" },
      {
        request: {
          uri: "/kontakt",
          headers: { host: { value: "pekarna.webmio.site" } },
          querystring: { a: { value: "1" }, b: { value: "", multiValue: [{ value: "" }] } },
        },
      },
    );
    expect(result).toMatchObject({
      statusCode: 301,
      headers: { location: { value: "/kontakt/?a=1&b" } },
    });
  });

  it("answers an unknown hostname with a page", async () => {
    const result = await runViewerRequest(
      {},
      { request: { uri: "/", headers: { host: { value: "x.webmio.site" } }, querystring: {} } },
    );
    expect(result).toMatchObject({ statusCode: 404, body: { encoding: "text" } });
  });
});

/** Runs the origin-response bundle with a fake S3 client over the given objects. */
async function runOriginResponse(objects: Record<string, string>, event: unknown) {
  const code = read("dist/origin-response.mjs")
    .replace(
      'import { GetObjectCommand, S3Client } from "@aws-sdk/client-s3";',
      `class GetObjectCommand { constructor(input) { this.input = input; } }
       class S3Client { async send(command) {
         const body = OBJECTS[command.input.Key];
         if (body === undefined) throw Object.assign(new Error("NoSuchKey"), { $metadata: { httpStatusCode: 404 } });
         return { Body: { transformToString: async () => body } };
       } }`,
    )
    .replace("export async function handler", "async function handler");
  const context = vm.createContext({ OBJECTS: objects, decodeURIComponent });
  vm.runInContext(code, context);
  return vm.runInContext("handler", context)(event);
}

describe("origin-response bundle", () => {
  const event = (uri: string, status = "403") => ({
    Records: [
      {
        cf: {
          request: { uri },
          response: {
            status,
            statusDescription: "Forbidden",
            headers: {
              via: [{ key: "Via", value: "1.1 abc.cloudfront.net (CloudFront)" }],
              "transfer-encoding": [{ key: "Transfer-Encoding", value: "chunked" }],
              "content-type": [{ key: "Content-Type", value: "application/xml" }],
            },
          },
        },
      },
    ],
  });
  const objects = {
    "sites/ws_a/dp_1/404.html": "<h1>Nic</h1>",
    "sites/ws_a/dp_1/_redirects": "/stary/ /novy/ 301\n",
  };

  it("answers a missing page with the publish's 404, keeping the read-only headers", async () => {
    const response = await runOriginResponse(objects, event("/sites/ws_a/dp_1/neni/index.html"));
    expect(response).toMatchObject({
      status: "404",
      body: "<h1>Nic</h1>",
      bodyEncoding: "text",
      headers: {
        via: [{ key: "Via", value: "1.1 abc.cloudfront.net (CloudFront)" }],
        "transfer-encoding": [{ key: "Transfer-Encoding", value: "chunked" }],
        "content-type": [{ key: "content-type", value: "text/html; charset=utf-8" }],
      },
    });
  });

  it("answers an earlier address with its redirect", async () => {
    const response = await runOriginResponse(objects, event("/sites/ws_a/dp_1/stary/index.html"));
    expect(response).toMatchObject({
      status: "301",
      body: "",
      headers: { location: [{ key: "location", value: "/novy/" }] },
    });
    expect(response.headers["content-type"]).toBeUndefined();
  });

  it("leaves a found file alone", async () => {
    const found = event("/sites/ws_a/dp_1/index.html", "200");
    const response = await runOriginResponse(objects, found);
    expect(response).toBe(found.Records[0]?.cf.response);
  });

  it("imports only the S3 client and keeps the placeholders for the deployment", () => {
    const code = read("dist/origin-response.mjs");
    const imports = code.split("\n").filter((line) => line.startsWith("import "));
    expect(imports).toEqual(['import { GetObjectCommand, S3Client } from "@aws-sdk/client-s3";']);
    expect(code).toContain("__WEBMIO_HOSTING_BUCKET__");
    expect(code).toContain("__WEBMIO_HOSTING_REGION__");
    expect(code).toMatch(/^export async function handler/m);
    expect(code).toContain("async function resolveMissing");
  });
});
