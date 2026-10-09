import { CloudFrontClient } from "@aws-sdk/client-cloudfront";
import { CloudFrontKeyValueStoreClient } from "@aws-sdk/client-cloudfront-keyvaluestore";
import { afterEach, describe, expect, it, vi } from "vitest";
import { sayIn } from "$lib/i18n";
import { PublishError } from "./target";
import { awsHosting, copySource, hostingError, tenantName } from "./webmio-aws";

const config = {
  bucket: "webmio-test-sites",
  kvsArn: "arn:aws:cloudfront::1:key-value-store/abc",
  distributionId: "E_OURS",
  connectionGroupId: "cg_1",
  sitesDomain: "webmio.site",
  cnameDomain: "sites.webmio.net",
  region: "eu-central-1",
};

/** An SDK error as the clients throw them. */
function awsError(name: string, status?: number, message = `${name} happened`) {
  return Object.assign(new Error(message), {
    name,
    $metadata: { httpStatusCode: status },
  });
}

type Command = { constructor: { name: string }; input: Record<string, unknown> };

/** Answers each command by its name; records what was sent. */
function answer(
  client: { prototype: { send: unknown } },
  handlers: Record<string, (input: Record<string, unknown>) => unknown>,
) {
  const sent: { command: string; input: Record<string, unknown> }[] = [];
  vi.spyOn(
    client.prototype as { send: (c: Command) => Promise<unknown> },
    "send",
  ).mockImplementation(async (command: Command) => {
    const name = command.constructor.name;
    sent.push({ command: name, input: command.input });
    const handler = handlers[name];
    if (!handler) throw new Error(`Unexpected ${name}`);
    return handler(command.input);
  });
  return sent;
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe("hostingError", () => {
  it("calls a failure without an answer unreachable", () => {
    expect(hostingError(awsError("TimeoutError"), "upload", { path: "a" }).kind).toBe(
      "unreachable",
    );
  });

  it("calls a server error unreachable", () => {
    expect(hostingError(awsError("InternalError", 503), "writeKeys").kind).toBe("unreachable");
  });

  it("names what couldn't be done for a refusal", () => {
    const error = hostingError(awsError("AccessDenied", 403), "upload", { path: "index.html" });
    expect(error.kind).toBe("failed");
    expect(sayIn("en", error.said)).toBe(
      "The hosting service couldn't upload index.html (403 AccessDenied: AccessDenied happened).",
    );
  });

  it("passes a PublishError through", () => {
    const original = new PublishError("domain-in-use", { key: "server.webmio.unreachable" });
    expect(hostingError(original, "connectDomain")).toBe(original);
  });
});

describe("names", () => {
  it("encodes copy sources per segment", () => {
    expect(copySource("b", "sites/ws_a/dp_1/místo/index.html")).toBe(
      "b/sites/ws_a/dp_1/m%C3%ADsto/index.html",
    );
  });

  it("makes tenant names CloudFront accepts", () => {
    expect(tenantName("ws_ab12", "www.pekarna.cz")).toBe("ws-ab12-www.pekarna.cz");
    expect(tenantName("_x", "a.cz")).toMatch(/^[a-zA-Z0-9][a-zA-Z0-9.-]*[a-zA-Z0-9]$/);
  });
});

describe("key-value store", () => {
  it("writes with the store's ETag and tries again after a conflict", async () => {
    let describes = 0;
    let updates = 0;
    const sent = answer(CloudFrontKeyValueStoreClient, {
      DescribeKeyValueStoreCommand: () => ({ ETag: `etag-${++describes}` }),
      UpdateKeysCommand: () => {
        if (++updates === 1) throw awsError("ConflictException", 409);
        return {};
      },
    });
    await awsHosting(config).updateKeys({ put: { "s:ws_a": "dp_2" }, delete: ["h:old"] });
    const writes = sent.filter((s) => s.command === "UpdateKeysCommand");
    expect(writes).toHaveLength(2);
    expect(writes[1]?.input).toEqual({
      KvsARN: config.kvsArn,
      IfMatch: "etag-2",
      Puts: [{ Key: "s:ws_a", Value: "dp_2" }],
      Deletes: [{ Key: "h:old" }],
    });
  });

  it("gives up after repeated conflicts", async () => {
    answer(CloudFrontKeyValueStoreClient, {
      DescribeKeyValueStoreCommand: () => ({ ETag: "e" }),
      UpdateKeysCommand: () => {
        throw awsError("ConflictException", 409);
      },
    });
    await expect(awsHosting(config).updateKeys({ delete: ["h:x"] })).rejects.toMatchObject({
      kind: "failed",
    });
  });

  it("reads a missing key as undefined", async () => {
    answer(CloudFrontKeyValueStoreClient, {
      GetKeyCommand: () => {
        throw awsError("ResourceNotFoundException", 404);
      },
    });
    expect(await awsHosting(config).getKey("h:nic.webmio.site")).toBeUndefined();
  });
});

describe("tenants", () => {
  it("creates a tenant with a certificate CloudFront validates itself", async () => {
    const sent = answer(CloudFrontClient, {
      CreateDistributionTenantCommand: () => ({ DistributionTenant: { Id: "dt_1" } }),
    });
    expect(await awsHosting(config).createTenant("ws_a", "www.pekarna.cz")).toBe("dt_1");
    expect(sent[0]?.input).toMatchObject({
      DistributionId: "E_OURS",
      ConnectionGroupId: "cg_1",
      Domains: [{ Domain: "www.pekarna.cz" }],
      ManagedCertificateRequest: {
        ValidationTokenHost: "cloudfront",
        PrimaryDomainName: "www.pekarna.cz",
      },
    });
  });

  it("creates no tenant while the domain doesn't lead to CloudFront yet", async () => {
    answer(CloudFrontClient, {
      CreateDistributionTenantCommand: () => {
        throw awsError(
          "InvalidArgument",
          400,
          "The provided Domain Name is not valid. Could not verify Domain Name ownership.",
        );
      },
    });
    expect(await awsHosting(config).createTenant("ws_a", "www.pekarna.cz")).toBeUndefined();
  });

  it("attaches an issued certificate to the tenant, which makes the domain active", async () => {
    const sent = answer(CloudFrontClient, {
      GetManagedCertificateDetailsCommand: () => ({
        ManagedCertificateDetails: { CertificateStatus: "issued", CertificateArn: "arn:cert" },
      }),
      GetDistributionTenantCommand: () => ({
        DistributionTenant: {
          Id: "dt_1",
          Domains: [{ Domain: "www.pekarna.cz", Status: "inactive" }],
        },
        ETag: "e1",
      }),
      UpdateDistributionTenantCommand: () => ({ ETag: "e2" }),
    });
    expect(await awsHosting(config).certificateState("dt_1")).toBe("issued");
    expect(sent.at(-1)).toEqual({
      command: "UpdateDistributionTenantCommand",
      input: {
        Id: "dt_1",
        IfMatch: "e1",
        Domains: [{ Domain: "www.pekarna.cz" }],
        Customizations: { Certificate: { Arn: "arn:cert" } },
      },
    });
  });

  it("doesn't attach a certificate twice", async () => {
    const sent = answer(CloudFrontClient, {
      GetManagedCertificateDetailsCommand: () => ({
        ManagedCertificateDetails: { CertificateStatus: "issued", CertificateArn: "arn:cert" },
      }),
      GetDistributionTenantCommand: () => ({
        DistributionTenant: { Id: "dt_1", Customizations: { Certificate: { Arn: "arn:cert" } } },
        ETag: "e1",
      }),
    });
    expect(await awsHosting(config).certificateState("dt_1")).toBe("issued");
    expect(sent.map((s) => s.command)).not.toContain("UpdateDistributionTenantCommand");
  });

  it("refuses a domain another service holds", async () => {
    answer(CloudFrontClient, {
      CreateDistributionTenantCommand: () => {
        throw awsError("CNAMEAlreadyExists", 409);
      },
      GetDistributionTenantByDomainCommand: () => ({
        DistributionTenant: { Id: "dt_x", DistributionId: "E_OTHER" },
      }),
    });
    const error = await awsHosting(config)
      .createTenant("ws_a", "www.pekarna.cz")
      .catch((e: unknown) => e);
    expect(error).toMatchObject({ kind: "domain-in-use" });
    expect(sayIn("en", (error as PublishError).said)).toContain("www.pekarna.cz is connected");
  });

  it("refuses a domain held outside CloudFront tenants", async () => {
    answer(CloudFrontClient, {
      CreateDistributionTenantCommand: () => {
        throw awsError("CNAMEAlreadyExists", 409);
      },
      GetDistributionTenantByDomainCommand: () => ({}),
    });
    await expect(awsHosting(config).createTenant("ws_a", "www.x.cz")).rejects.toMatchObject({
      kind: "domain-in-use",
    });
  });

  it("takes over a disabled tenant of ours that still holds the domain", async () => {
    const sent = answer(CloudFrontClient, {
      CreateDistributionTenantCommand: () => {
        throw awsError("CNAMEAlreadyExists", 409);
      },
      GetDistributionTenantByDomainCommand: () => ({
        DistributionTenant: { Id: "dt_old", DistributionId: "E_OURS" },
      }),
      GetDistributionTenantCommand: () => ({
        DistributionTenant: { Id: "dt_old", Enabled: false },
        ETag: "e1",
      }),
      UpdateDistributionTenantCommand: () => ({ ETag: "e2" }),
    });
    expect(await awsHosting(config).createTenant("ws_b", "www.pekarna.cz")).toBe("dt_old");
    expect(sent.at(-1)?.input).toMatchObject({ Id: "dt_old", IfMatch: "e1", Enabled: true });
  });

  it("disables a tenant, then deletes it", async () => {
    const sent = answer(CloudFrontClient, {
      GetDistributionTenantCommand: () => ({
        DistributionTenant: { Id: "dt_1", Enabled: true },
        ETag: "e1",
      }),
      UpdateDistributionTenantCommand: () => ({ ETag: "e2" }),
      DeleteDistributionTenantCommand: () => ({}),
    });
    await awsHosting(config).deleteTenant("dt_1");
    expect(sent.map((s) => s.command)).toEqual([
      "GetDistributionTenantCommand",
      "UpdateDistributionTenantCommand",
      "DeleteDistributionTenantCommand",
    ]);
    expect(sent[2]?.input).toEqual({ Id: "dt_1", IfMatch: "e2" });
  });

  it("leaves a tenant disabled while CloudFront isn't ready to delete it", async () => {
    answer(CloudFrontClient, {
      GetDistributionTenantCommand: () => ({
        DistributionTenant: { Id: "dt_1", Enabled: true },
        ETag: "e1",
      }),
      UpdateDistributionTenantCommand: () => ({ ETag: "e2" }),
      DeleteDistributionTenantCommand: () => {
        throw awsError("ResourceNotDisabled", 409);
      },
    });
    await expect(awsHosting(config).deleteTenant("dt_1")).resolves.toBeUndefined();
  });

  it("maps certificate states", async () => {
    const states = ["issued", "pending-validation", "validation-timed-out", "failed", undefined];
    let call = 0;
    answer(CloudFrontClient, {
      GetManagedCertificateDetailsCommand: () => ({
        ManagedCertificateDetails: { CertificateStatus: states[call++] },
      }),
    });
    const hosting = awsHosting(config);
    const results = [];
    for (let i = 0; i < states.length; i++) results.push(await hosting.certificateState("dt_1"));
    expect(results).toEqual(["issued", "pending", "failed", "failed", "pending"]);
  });
});
