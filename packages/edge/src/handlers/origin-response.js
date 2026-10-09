// The Lambda@Edge handler (origin response, Node.js). scripts/bundle.js puts not-found.js above
// it, without its exports, and writes dist/origin-response.mjs. Lambda@Edge has no environment
// variables: the infrastructure program replaces the two placeholders when it deploys.
import { GetObjectCommand, S3Client } from "@aws-sdk/client-s3";

const BUCKET = "__WEBMIO_HOSTING_BUCKET__";
const s3 = new S3Client({ region: "__WEBMIO_HOSTING_REGION__" });

async function read(key) {
  try {
    const object = await s3.send(new GetObjectCommand({ Bucket: BUCKET, Key: key }));
    return await object.Body.transformToString("utf-8");
  } catch (error) {
    const status = error.$metadata ? error.$metadata.httpStatusCode : undefined;
    if (status === 403 || status === 404) return undefined;
    throw error;
  }
}

export async function handler(event) {
  const record = event.Records[0].cf;
  const response = record.response;
  const status = Number(response.status);
  if (status !== 403 && status !== 404) return response;
  const missing = await resolveMissing({ uri: record.request.uri, read: read });
  if (!missing) return response;
  // The origin's response is changed in place: CloudFront refuses a response that drops its
  // read-only headers (Via, Transfer-Encoding).
  for (const name in missing.headers) {
    response.headers[name] = [{ key: name, value: missing.headers[name] }];
  }
  // A redirect has no body of its own; S3's error message mustn't show through.
  if (!missing.headers["content-type"]) delete response.headers["content-type"];
  response.status = String(missing.status);
  response.statusDescription = missing.status === 301 ? "Moved Permanently" : "Not Found";
  response.body = missing.body === undefined ? "" : missing.body;
  response.bodyEncoding = "text";
  return response;
}
