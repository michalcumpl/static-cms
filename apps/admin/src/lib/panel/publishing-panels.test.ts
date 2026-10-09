import type { Component } from "svelte";
import { render } from "svelte/server";
import { describe, expect, it } from "vitest";
import type { Locale } from "$lib/i18n";
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
    ...more,
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
