// What every HostingBackend must do, run against the folder fake, and against AWS when
// WEBMIO_AWS_CONTRACT=1 and the dev stack's WEBMIO_* variables are set. Tenants need real
// domains, so only the fake's are tested here (webmio.test.ts covers how they are used).
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, describe, expect, it } from "vitest";
import { newId } from "../ids";
import { awsHosting } from "./webmio-aws";
import { type HostingBackend, webmioHostingConfig } from "./webmio-backend";
import { fakeHosting } from "./webmio-fake";

const folders: string[] = [];
afterAll(() => {
  for (const folder of folders) rmSync(folder, { recursive: true, force: true });
});

function contract(name: string, make: () => HostingBackend) {
  describe(`${name} hosting backend`, () => {
    const hosting = make();
    const root = `sites/${newId("ws")}/`;
    const bytes = (text: string) => new TextEncoder().encode(text);
    const text = (body: Uint8Array | undefined) =>
      body === undefined ? undefined : new TextDecoder().decode(body);
    const html = { contentType: "text/html; charset=utf-8", cacheControl: "no-cache" };

    afterAll(async () => {
      await hosting.deletePrefix(root);
    });

    it("stores, copies, lists and deletes objects", async () => {
      await hosting.putObject(`${root}d1/index.html`, bytes("home"), html);
      await hosting.putObject(`${root}d1/kontakt/index.html`, bytes("kontakt"), html);
      await hosting.copyObject(`${root}d1/index.html`, `${root}d2/index.html`);
      expect(text(await hosting.getObject(`${root}d2/index.html`))).toBe("home");
      expect(await hosting.getObject(`${root}d2/nic.html`)).toBeUndefined();
      expect((await hosting.listNames(root)).sort()).toEqual(["d1", "d2"]);
      expect((await hosting.listNames(`${root}d1/`)).sort()).toEqual(["index.html", "kontakt"]);
      await hosting.deletePrefix(`${root}d1/`);
      expect(await hosting.listNames(root)).toEqual(["d2"]);
    });

    it("puts, reads and deletes keys", async () => {
      const key = `s:${root.slice(6, -1)}`;
      expect(await hosting.getKey(key)).toBeUndefined();
      await hosting.updateKeys({ put: { [key]: "dp_1" } });
      expect(await hosting.getKey(key)).toBe("dp_1");
      await hosting.updateKeys({ delete: [key] });
      expect(await hosting.getKey(key)).toBeUndefined();
    });
  });
}

contract("fake", () => {
  const folder = mkdtempSync(join(tmpdir(), "webmio-fake-"));
  folders.push(folder);
  return fakeHosting(folder);
});

const aws = process.env.WEBMIO_AWS_CONTRACT === "1" ? webmioHostingConfig() : undefined;
if (aws) contract("AWS", () => awsHosting(aws));

describe("fake tenants", () => {
  const folder = mkdtempSync(join(tmpdir(), "webmio-fake-"));
  folders.push(folder);
  const hosting = fakeHosting(folder);

  /** Creates a tenant for a domain whose DNS leads to the fake. */
  async function tenant(siteId: string, domain: string): Promise<string> {
    const id = await hosting.createTenant(siteId, domain);
    if (!id) throw new Error(`no tenant for ${domain}`);
    return id;
  }

  it("creates no tenant for a domain that doesn't point at it yet", async () => {
    hosting.setPointing("www.later.cz", false);
    expect(await hosting.createTenant("ws_a", "www.later.cz")).toBeUndefined();
    hosting.setPointing("www.later.cz", true);
    expect(await hosting.createTenant("ws_a", "www.later.cz")).toMatch(/^dt_/);
  });

  it("issues a certificate when told to, and refuses domains held elsewhere", async () => {
    const id = await tenant("ws_a", "www.pekarna.cz");
    expect(await hosting.certificateState(id)).toBe("pending");
    hosting.setCertificate("www.pekarna.cz", "issued");
    expect(await hosting.certificateState(id)).toBe("issued");
    hosting.holdElsewhere("web.jinde.cz");
    await expect(hosting.createTenant("ws_a", "web.jinde.cz")).rejects.toMatchObject({
      kind: "domain-in-use",
    });
  });

  it("takes over its own disabled tenant", async () => {
    hosting.setSlowTenantDeletion(true);
    const id = await tenant("ws_a", "web.anideti.cz");
    await hosting.deleteTenant(id);
    expect(hosting.tenants().find((t) => t.id === id)?.enabled).toBe(false);
    expect(await hosting.createTenant("ws_b", "web.anideti.cz")).toBe(id);
    expect(hosting.tenants().find((t) => t.id === id)).toMatchObject({
      siteId: "ws_b",
      enabled: true,
    });
  });

  it("can't be reached when told so", async () => {
    hosting.setUnreachable(true);
    await expect(hosting.getKey("h:x")).rejects.toMatchObject({ kind: "unreachable" });
    hosting.setUnreachable(false);
  });
});
