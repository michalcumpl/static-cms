import { createRawSnippet } from "svelte";
import { render } from "svelte/server";
import { describe, expect, it } from "vitest";
import Badge from "./Badge.svelte";
import Button from "./Button.svelte";
import Card from "./Card.svelte";
import Checkbox from "./Checkbox.svelte";
import Dialog from "./Dialog.svelte";
import EmptyState from "./EmptyState.svelte";
import Notice from "./Notice.svelte";
import PageHeader from "./PageHeader.svelte";
import Select from "./Select.svelte";
import Tabs from "./Tabs.svelte";
import TextField from "./TextField.svelte";

// The suite runs in Node: render each component on the server and check its markup.
const text = (value: string) => createRawSnippet(() => ({ render: () => `<span>${value}</span>` }));
const html = (component: unknown, props: Record<string, unknown>) =>
  // biome-ignore lint/suspicious/noExplicitAny: components with different props.
  render(component as any, { props }).body.replace(/<!--[^>]*-->/g, "");

describe("Button", () => {
  it("is one kind of button wherever it is used, and a link with href", () => {
    const save = html(Button, { kind: "primary", children: text("Save") });
    const publish = html(Button, { kind: "primary", children: text("Publish") });
    const cls = (markup: string) =>
      /class="([^"]*ui-button[^"]*)"/.exec(markup)?.[1]?.replace(/svelte-\w+/, "");
    expect(cls(save)).toBe(cls(publish));
    expect(save).toMatch(/^<button type="button" class="ui-button primary md/);
    const link = html(Button, {
      href: "/p/1/edit/",
      kind: "primary",
      icon: "pencil",
      children: text("Edit"),
    });
    expect(link).toMatch(/^<a href="\/p\/1\/edit\/" class="ui-button primary md/);
    expect(link).toContain('aria-hidden="true"');
  });

  it("passes accessible names and states through", () => {
    const markup = html(Button, { "aria-label": "Undo", disabled: true, icon: "undo" });
    expect(markup).toContain('aria-label="Undo"');
    expect(markup).toContain("disabled");
  });
});

describe("fields", () => {
  it("label their input and point to the hint and error", () => {
    const markup = html(TextField, {
      id: "site-name",
      label: "Site name",
      value: "Pekárna",
      hint: "Shown in the browser tab.",
      error: "Required.",
    });
    expect(markup).toContain('<label for="site-name"');
    expect(markup).toMatch(/<input[^>]*id="site-name"/);
    expect(markup).toContain('aria-describedby="site-name-hint site-name-error"');
    expect(markup).toContain('aria-invalid="true"');
  });

  it("render a text area when given rows", () => {
    expect(html(TextField, { id: "d", label: "Description", rows: 3 })).toContain("<textarea");
  });

  it("label a select and a checkbox, and make a switch a switch", () => {
    const select = html(Select, {
      id: "type",
      label: "Type",
      children: createRawSnippet(() => ({ render: () => "<option>A</option>" })),
    });
    expect(select).toContain('<label for="type"');
    const check = html(Checkbox, { label: "Show in menu", checked: true });
    expect(check).toMatch(/<label[^>]*><input type="checkbox"[^>]*checked/);
    expect(check).toContain("Show in menu");
    expect(html(Checkbox, { label: "AI training", switch: true })).toContain('role="switch"');
  });
});

describe("Badge", () => {
  it("says the status in words, with a dot, in the status colours", () => {
    const markup = html(Badge, { status: "attention", children: text("Unpublished changes") });
    expect(markup).toContain("ui-badge attention");
    expect(markup).toMatch(/class="dot[^"]*" aria-hidden="true"/);
    expect(markup).toContain("Unpublished changes");
  });
});

describe("structure", () => {
  it("names a card's section by its title", () => {
    const markup = html(Card, { title: "Publishing", id: "publishing", children: text("…") });
    expect(markup).toContain('aria-labelledby="publishing-title"');
    expect(markup).toMatch(/<h2 id="publishing-title"[^>]*>Publishing<\/h2>/);
  });

  it("marks the current tab", () => {
    const markup = html(Tabs, {
      label: "Project",
      items: [
        { href: "/p/1/", label: "Overview", current: true },
        { href: "/p/1/pages", label: "Pages" },
      ],
    });
    expect(markup).toContain('aria-label="Project"');
    expect(markup).toMatch(/<a href="\/p\/1\/" aria-current="page"[^>]*>Overview<\/a>/);
    expect(markup).not.toMatch(/Pages<\/a>[\s\S]*aria-current/);
  });

  it("gives a dialog its title as its name", () => {
    const markup = html(Dialog, { id: "remove", title: "Remove English?", children: text("…") });
    expect(markup).toMatch(/<dialog[^>]*aria-labelledby="remove-title"/);
  });

  it("puts the page title in one h1, with a labelled breadcrumb", () => {
    const markup = html(PageHeader, {
      title: "Pekárna U Lípy",
      breadcrumb: [{ href: "/", label: "Projects" }],
      breadcrumbLabel: "Breadcrumb",
    });
    expect(markup.match(/<h1/g)).toHaveLength(1);
    expect(markup).toContain('aria-label="Breadcrumb"');
  });

  it("announces a problem notice, and shows an empty state's title", () => {
    expect(html(Notice, { kind: "problem", children: text("Failed") })).toContain('role="alert"');
    expect(html(Notice, { kind: "info", children: text("Hi") })).not.toContain('role="alert"');
    expect(html(EmptyState, { title: "No projects yet", icon: "plus" })).toContain(
      "No projects yet",
    );
  });
});
