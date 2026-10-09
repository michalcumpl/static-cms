// The CloudFront Function's handler (viewer request, JavaScript runtime 2.0). scripts/bundle.js
// puts router.js above it, without its exports, and writes dist/viewer-request.js.
import cf from "cloudfront";

const kvs = cf.kvs();

async function lookup(key) {
  try {
    return await kvs.get(key);
  } catch (_error) {
    // A missing key throws.
    return undefined;
  }
}

function queryString(querystring) {
  const pairs = [];
  for (const name in querystring) {
    const field = querystring[name];
    const values = field.multiValue ? field.multiValue : [field];
    for (let i = 0; i < values.length; i++) {
      const value = values[i].value;
      pairs.push(value === "" ? name : `${name}=${value}`);
    }
  }
  return pairs.join("&");
}

// biome-ignore lint/correctness/noUnusedVariables: CloudFront calls it by name.
async function handler(event) {
  const request = event.request;
  const host = request.headers.host ? request.headers.host.value : "";
  const routed = await route(
    { host: host, uri: request.uri, querystring: queryString(request.querystring) },
    lookup,
  );
  if (routed.kind === "fetch") {
    request.uri = routed.uri;
    request.querystring = {};
    return request;
  }
  const headers = {};
  for (const name in routed.headers) headers[name] = { value: routed.headers[name] };
  const response = {
    statusCode: routed.status,
    statusDescription: routed.status === 301 ? "Moved Permanently" : "Not Found",
    headers: headers,
  };
  if (routed.body !== undefined) response.body = { encoding: "text", data: routed.body };
  return response;
}
