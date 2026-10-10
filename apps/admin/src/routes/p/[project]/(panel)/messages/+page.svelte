<script lang="ts">
import { enhance } from "$app/forms";
import { page } from "$app/state";
import { getI18n } from "$lib/i18n";
import { projectPaths } from "$lib/project-paths";
import Badge from "$lib/ui/Badge.svelte";
import Button from "$lib/ui/Button.svelte";
import Card from "$lib/ui/Card.svelte";
import EmptyState from "$lib/ui/EmptyState.svelte";
import TabPanel from "$lib/ui/TabPanel.svelte";
import type { PageProps } from "./$types";

// The contact forms' messages (contact-form spec, "Messages section"): newest first, filtered by
// form and by unhandled, each marked handled or deleted, and the listed ones exported as CSV.
let { data }: PageProps = $props();
const i18n = getI18n();
const paths = $derived(projectPaths(data.project.id));
const filtered = $derived(data.filter.form !== "" || data.filter.unhandled);
const csvHref = $derived(`${paths.messagesCsv}${page.url.search}`);
const when = (date: string) => i18n.formatDate(date);
</script>

<svelte:head>
  <title>{i18n.t("common.pageTitle", { page: i18n.t("messages.pageTitle", { project: data.project.name }) })}</title>
</svelte:head>

<TabPanel>
  <form method="GET" class="filters" data-sveltekit-keepfocus>
    <label>
      {i18n.t("messages.form")}
      <select name="form" value={data.filter.form} onchange={(e) => e.currentTarget.form?.requestSubmit()}>
        <option value="">{i18n.t("messages.allForms")}</option>
        {#each data.forms as form (form.id)}
          <option value={form.id}>{form.heading || i18n.t("messages.untitled")}</option>
        {/each}
      </select>
    </label>
    <label class="check">
      <input
        type="checkbox"
        name="unhandled"
        value="1"
        checked={data.filter.unhandled}
        onchange={(e) => e.currentTarget.form?.requestSubmit()}
      />
      {i18n.t("messages.unhandledOnly")}
    </label>
    <noscript><Button type="submit" size="sm">{i18n.t("messages.show")}</Button></noscript>
    {#if data.messages.length > 0}
      <Button href={csvHref} size="sm" icon="download" download>{i18n.t("messages.export")}</Button>
    {/if}
  </form>

  {#if data.messages.length === 0}
    <EmptyState title={filtered ? i18n.t("messages.noneFiltered") : i18n.t("messages.none")} icon="mail">
      {#if !filtered}<p>{i18n.t("messages.noneHint")}</p>{/if}
    </EmptyState>
  {:else}
    <ol class="messages" aria-label={i18n.t("messages.list")}>
      {#each data.messages as message (message.id)}
        <li>
          <Card>
            <article aria-label={message.name}>
              <header>
                <strong>{message.name}</strong>
                <span class="muted">{when(message.createdAt)}</span>
                {#if message.handled}
                  <Badge status="success">{i18n.t("messages.handled")}</Badge>
                {:else}
                  <Badge status="attention">{i18n.t("messages.new")}</Badge>
                {/if}
                {#if !message.delivered}
                  <Badge status="problem">{i18n.t("messages.notDelivered")}</Badge>
                {/if}
              </header>
              <p class="muted">
                {i18n.t(`messages.kinds.${message.kind}`)}{message.heading ? ` · ${message.heading}` : ""} · {message.page}
              </p>
              <p class="contact">
                {#if message.email}<a href="mailto:{message.email}">{message.email}</a>{/if}
                {#if message.phone}<a href="tel:{message.phone}">{message.phone}</a>{/if}
                {#if message.when}<span>{i18n.t("messages.callWhen", { when: i18n.t(`messages.when.${message.when as "any"}`) })}</span>{/if}
              </p>
              {#if message.message}<p class="text">{message.message}</p>{/if}
              <div class="actions">
                <form method="POST" action="?/{message.handled ? 'unhandled' : 'handled'}" use:enhance>
                  <input type="hidden" name="id" value={message.id} />
                  <Button type="submit" size="sm" icon="check">
                    {message.handled ? i18n.t("messages.markUnhandled") : i18n.t("messages.markHandled")}
                  </Button>
                </form>
                <form method="POST" action="?/delete" use:enhance>
                  <input type="hidden" name="id" value={message.id} />
                  <Button type="submit" size="sm" kind="quiet" icon="trash">{i18n.t("messages.delete")}</Button>
                </form>
              </div>
            </article>
          </Card>
        </li>
      {/each}
    </ol>
  {/if}

  <p class="muted kept">{i18n.t("messages.kept")}</p>
</TabPanel>

<style>
  .filters {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: var(--ui-space-3);
    margin-bottom: var(--ui-space-4);
    font-size: var(--ui-text-sm);
  }

  .filters label {
    display: flex;
    align-items: center;
    gap: var(--ui-space-2);
  }

  select {
    min-height: var(--ui-control-sm);
    padding: 0 var(--ui-space-3);
    border: 1px solid var(--ui-border-strong);
    border-radius: var(--ui-radius-pill);
    background: var(--ui-surface);
    color: var(--ui-ink);
    font: inherit;
  }

  .messages {
    display: flex;
    flex-direction: column;
    gap: var(--ui-space-3);
    margin: 0;
    padding: 0;
    list-style: none;
  }

  header {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: var(--ui-space-2);
  }

  p {
    margin: var(--ui-space-2) 0 0;
  }

  .muted {
    color: var(--ui-muted);
    font-size: var(--ui-text-sm);
  }

  .contact {
    display: flex;
    flex-wrap: wrap;
    gap: var(--ui-space-3);
  }

  .text {
    white-space: pre-wrap;
    overflow-wrap: anywhere;
  }

  .actions {
    display: flex;
    gap: var(--ui-space-2);
    margin-top: var(--ui-space-3);
  }

  .kept {
    margin-top: var(--ui-space-4);
  }
</style>
