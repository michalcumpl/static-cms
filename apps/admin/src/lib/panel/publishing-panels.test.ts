import type { Component } from "svelte";
import { render } from "svelte/server";
import { describe, expect, it } from "vitest";
import type { Locale } from "$lib/i18n";
import PublishButton from "$lib/PublishButton.svelte";
import { projectPaths } from "$lib/project-paths";
import { Publishing, type PublishingInfo, type PublishSummary } from "$lib/publishing.svelte";
import DomainPanel from "./DomainPanel.svelte";
import PublishHistory from "./PublishHistory.svelte";
import WithI18n from "./WithI18n.test.svelte";

// The Domain panel and the publish history, rendered on the server (own-hosting design.md
// decisions 7 and 10).
const html = (
  // biome-ignore lint/suspicious/noExplicitAny: any component under test.
  component: Component<any>,
  props: Record<string, unknown>,
  locale: Locale = "en",
) => render(WithI18n, { props: { component, props, locale } }).body.replace(/<!--[^>]*-->/g, "");

function publishing(info: Partial<PublishingInfo>): Publishing {
  const state = new Publishing(projectPaths("p_1"));
  state.info = {
    canPublish: true,
    provider: "webmio",
    team: null,
    address: "https://pekarna-u-lipy.webmio.site",
    defaultUrl: "https://pekarna-u-lipy.webmio.site",
    domain: null,
    domainState: null,
    apexState: null,
    dnsRecords: [],
    forwardTo: null,
    publishes: [],
    ...info,
  };
  return state;
}

describe("Domain panel on Webmio hosting", () => {
  it("shows the CNAME to the website's own target and asks to forward a bare domain", () => {
    const markup = html(DomainPanel, {
      paths: projectPaths("p_1"),
      publishing: publishing({
        domain: "pekarna.cz",
        domainState: "waiting-for-dns",
        dnsRecords: [
          { type: "CNAME", name: "www.pekarna.cz", value: "pekarna-u-lipy.sites.webmio.net" },
        ],
        forwardTo: "https://www.pekarna.cz",
      }),
    });
    expect(markup).toContain("<code>www.pekarna.cz</code>");
    expect(markup).toContain("<code>pekarna-u-lipy.sites.webmio.net</code>");
    expect(markup).toContain("Also forward pekarna.cz to https://www.pekarna.cz at your registrar");
  });

  it("asks nothing to forward for a subdomain", () => {
    const markup = html(DomainPanel, {
      paths: projectPaths("p_1"),
      publishing: publishing({
        domain: "web.anideti.cz",
        domainState: "waiting-for-dns",
        dnsRecords: [
          { type: "CNAME", name: "web.anideti.cz", value: "pekarna-u-lipy.sites.webmio.net" },
        ],
      }),
    });
    expect(markup).not.toContain("forward");
  });

  it("says it in Czech", () => {
    const markup = html(
      DomainPanel,
      {
        paths: projectPaths("p_1"),
        publishing: publishing({
          domain: "pekarna.cz",
          domainState: "issuing-certificate",
          forwardTo: "https://www.pekarna.cz",
        }),
      },
      "cs",
    );
    expect(markup).toContain(
      "U registrátora také přesměrujte pekarna.cz na https://www.pekarna.cz",
    );
    expect(markup).toContain("vydává se certifikát");
  });
});

describe("Domain panel with the redirect server", () => {
  const records = [
    { type: "CNAME" as const, name: "www.pekarna.cz", value: "pekarna-u-lipy.sites.webmio.net" },
    { type: "A" as const, name: "pekarna.cz", value: "203.0.113.7" },
  ];
  const panel = (info: Partial<PublishingInfo>, locale: Locale = "en") =>
    html(
      DomainPanel,
      {
        paths: projectPaths("p_1"),
        publishing: publishing({ domain: "pekarna.cz", dnsRecords: records, ...info }),
      },
      locale,
    );

  it("shows the A record, asks to remove the forwarding and other records, and the bare domain's state", () => {
    const markup = panel({ domainState: "waiting-for-dns", apexState: "waiting-for-dns" });
    expect(markup).toContain("<code>pekarna.cz</code>");
    expect(markup).toContain("<code>203.0.113.7</code>");
    expect(markup).toContain("registrars call its name @ or leave it empty");
    expect(markup).toContain("Remove your registrar's forwarding of pekarna.cz");
    expect(markup).toContain("pekarna.cz without www: waiting for its A record");
    expect(markup).not.toContain("Also forward");
  });

  it("keeps the records listed while only the bare domain is pending", () => {
    const markup = panel({ domainState: "ready", apexState: "issuing-certificate" });
    expect(markup).toContain("Ready: the site is served at this domain.");
    expect(markup).toContain(
      "pekarna.cz without www: DNS is set; its certificate is being issued.",
    );
    expect(markup).toContain("<code>203.0.113.7</code>");
  });

  it("hides the records once both are done", () => {
    const markup = panel({ domainState: "ready", apexState: "redirecting" });
    expect(markup).toContain("pekarna.cz without www: redirects to https://www.pekarna.cz.");
    expect(markup).not.toContain("<code>203.0.113.7</code>");
  });

  it("says it in Czech", () => {
    const markup = panel({ domainState: "waiting-for-dns", apexState: "waiting-for-dns" }, "cs");
    expect(markup).toContain("registrátoři jeho název zapisují jako @");
    expect(markup).toContain("pekarna.cz bez www: čeká se na záznam A");
  });
});

describe("Publish button", () => {
  const button = (status: Publishing["status"]) => {
    const state = publishing({});
    state.status = status;
    return html(PublishButton, { paths: projectPaths("p_1"), publishing: state });
  };

  it("names the step while publishing", () => {
    expect(button({ kind: "publishing", step: "uploading" })).toContain("Uploading…");
    expect(button({ kind: "publishing" })).toContain("Publishing…");
  });

  it("offers Try again after a publish failed, with the reason", () => {
    const markup = button({
      kind: "failed",
      message:
        "Publishing failed: The hosting service couldn't be reached. Your previous version is still online.",
    });
    expect(markup).toContain("Try again");
    expect(markup).toContain("Your previous version is still online.");
  });

  it("keeps Publish when the site has errors to fix first", () => {
    const markup = button({ kind: "failed", problems: [] });
    expect(markup).not.toContain("Try again");
    expect(markup).toContain(" Publish</button>");
  });

  it("points to the warnings after a publish with warnings", () => {
    const markup = button({
      kind: "published",
      url: "https://pekarna-u-lipy.webmio.site",
      warnings: 2,
    });
    expect(markup).toContain("2 links to other websites didn't answer");
  });
});

describe("Publish history", () => {
  const publish = (id: string, more: Partial<PublishSummary>): PublishSummary => ({
    id,
    state: "ready",
    url: "https://pekarna-u-lipy.webmio.site",
    error: null,
    publishedBy: "jana@example.cz",
    startedAt: "2026-10-08T10:00:00.000Z",
    finishedAt: "2026-10-08T10:00:05.000Z",
    live: false,
    restorable: true,
    step: null,
    warnings: [],
    ...more,
  });

  it("shows a running publish's step", () => {
    const markup = html(PublishHistory, {
      busy: false,
      onMakeLive: () => {},
      publishes: [publish("pb_1", { state: "running", step: "verifying" })],
    });
    expect(markup).toContain("Verifying the website…");
  });

  it("shows a failure as it was recorded, with Try again on the newest", () => {
    const error =
      "Publishing failed: The website didn't show the new version in time (/). Your previous version is still online.";
    const markup = html(PublishHistory, {
      busy: false,
      onMakeLive: () => {},
      onTryAgain: () => {},
      publishes: [
        publish("pb_3", { state: "failed", error }),
        publish("pb_2", { live: true }),
        publish("pb_1", { state: "failed", error: "Publishing failed: older" }),
      ],
    });
    expect(markup).toContain(error);
    expect(markup).not.toContain("Failed: Publishing failed");
    expect(markup.match(/Try again/g)).toHaveLength(1);
  });

  it("lists a successful publish's warnings", () => {
    const markup = html(
      PublishHistory,
      {
        busy: false,
        onMakeLive: () => {},
        publishes: [
          publish("pb_1", {
            live: true,
            warnings: [
              { kind: "outside-link", page: "/kontakt/", url: "https://stary-eshop.example/" },
              { kind: "outside-link", page: "/", url: "https://gone.example/", status: 404 },
              { kind: "outside-links-skipped", count: 3 },
            ],
          }),
        ],
      },
      "cs",
    );
    expect(markup).toContain("2 odkazy na jiné weby neodpověděly");
    expect(markup).toContain("https://stary-eshop.example/ na /kontakt/");
    expect(markup).toContain("https://gone.example/ na / (odpověď 404)");
    expect(markup).toContain("dalších 3 se nekontrolovalo");
  });

  it("offers to make kept publishes live again, and not the ones no longer kept", () => {
    const markup = html(PublishHistory, {
      busy: false,
      onMakeLive: () => {},
      publishes: [
        publish("pb_3", { live: true }),
        publish("pb_2", {}),
        publish("pb_1", { restorable: false }),
      ],
    });
    expect(markup.match(/Make live again/g)).toHaveLength(1);
    expect(markup).toContain("Live");
    expect(markup).toContain("No longer kept");
  });
});
