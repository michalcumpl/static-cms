import { describe, expect, it } from "vitest";
import { webmioHostingConfig } from "./webmio-backend";

const complete = {
  WEBMIO_HOSTING_BUCKET: "webmio-prod-sites",
  WEBMIO_HOSTING_KVS_ARN: "arn:aws:cloudfront::1:key-value-store/abc",
  WEBMIO_HOSTING_DISTRIBUTION_ID: "E123",
  WEBMIO_HOSTING_CONNECTION_GROUP_ID: "cg_1",
};

describe("webmioHostingConfig", () => {
  it("is undefined without configuration", () => {
    expect(webmioHostingConfig({})).toBeUndefined();
  });

  it.each(Object.keys(complete))("is undefined without %s", (name) => {
    expect(webmioHostingConfig({ ...complete, [name]: "" })).toBeUndefined();
  });

  it("reads the configuration, with Webmio's domains by default", () => {
    expect(webmioHostingConfig({ ...complete, AWS_REGION: "eu-central-1" })).toEqual({
      bucket: "webmio-prod-sites",
      kvsArn: "arn:aws:cloudfront::1:key-value-store/abc",
      distributionId: "E123",
      connectionGroupId: "cg_1",
      sitesDomain: "webmio.site",
      cnameDomain: "sites.webmio.net",
      region: "eu-central-1",
    });
  });

  it("takes other domains for other environments", () => {
    const config = webmioHostingConfig({
      ...complete,
      WEBMIO_SITES_DOMAIN: "dev.webmio.site",
      WEBMIO_CNAME_DOMAIN: "sites.dev.webmio.net",
    });
    expect(config).toMatchObject({
      sitesDomain: "dev.webmio.site",
      cnameDomain: "sites.dev.webmio.net",
    });
  });
});
