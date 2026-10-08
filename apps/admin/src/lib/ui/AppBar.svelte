<script lang="ts">
import { goto } from "$app/navigation";
import { getI18n, LOCALES, type Locale } from "$lib/i18n";
import Icon from "./Icon.svelte";
import { chooseLanguage } from "./language";
import PopoverMenu, { type MenuEntry } from "./PopoverMenu.svelte";

// The bar on every page (admin-interface spec, "App shell"): the mark, the workspace and the
// account, whose menu holds the interface language. Signed out, only the mark.
let {
  user,
  workspaces,
  currentWorkspaceId,
  compact = false,
  onlanguage,
}: {
  user: { email: string } | null;
  workspaces: { id: string; name: string }[];
  currentWorkspaceId: string | null;
  compact?: boolean;
  /** Switches the interface language at once, before the server confirms. */
  onlanguage: (locale: Locale) => void;
} = $props();

const i18n = getI18n();
let open = $state<"workspace" | "account" | undefined>();
let signOutForm: HTMLFormElement | undefined = $state();

const current = $derived(workspaces.find((w) => w.id === currentWorkspaceId));

function setLanguage(locale: Locale) {
  if (locale === i18n.locale) return;
  onlanguage(locale);
  chooseLanguage(locale);
}

const workspaceEntries = $derived<MenuEntry[]>(
  workspaces.map((w) => ({
    label: w.name,
    detail: w.id === currentWorkspaceId ? i18n.t("shell.currentWorkspace") : undefined,
    run: () => goto(`/?workspace=${encodeURIComponent(w.id)}`),
  })),
);

const accountEntries = $derived<MenuEntry[]>([
  ...LOCALES.map((locale) => ({
    label: i18n.t(`common.language.${locale}`),
    group: i18n.t("shell.interfaceLanguage"),
    lang: locale,
    checked: i18n.locale === locale,
    run: () => setLanguage(locale),
  })),
  {
    label: i18n.t("shell.signOut"),
    detail: user ? i18n.t("shell.signedInAs", { email: user.email }) : undefined,
    run: () => signOutForm?.requestSubmit(),
  },
]);
</script>

<header class="app-bar" class:compact>
  <div class="start">
    <a class="mark" href="/" aria-label={i18n.t("shell.home")}>
      <img class="logo" src="/webmio-mark.svg" alt="" width="28" height="28" />
      <span class="name">{i18n.t("common.productName")}</span>
    </a>
    {#if user && workspaces.length > 1}
      <button
        type="button"
        class="pill"
        aria-haspopup="menu"
        aria-expanded={open === "workspace"}
        style="anchor-name: --app-workspace"
        onclick={() => (open = open === "workspace" ? undefined : "workspace")}
      >
        <Icon name="users" size={16} />
        <span>{current?.name ?? i18n.t("shell.allWorkspaces")}</span>
        <Icon name="chevron" size={14} />
      </button>
    {:else if user && current}
      <span class="pill static"><Icon name="users" size={16} />{current.name}</span>
    {/if}
  </div>
  <div class="end">
    {#if user}
      <button
        type="button"
        class="avatar"
        aria-label={i18n.t("shell.account", { email: user.email })}
        aria-haspopup="menu"
        aria-expanded={open === "account"}
        style="anchor-name: --app-account"
        onclick={() => (open = open === "account" ? undefined : "account")}
      >
        {user.email.slice(0, 1).toUpperCase()}
      </button>
      <form method="POST" action="/signout" bind:this={signOutForm} hidden></form>
    {/if}
  </div>
  {#if open === "workspace"}
    <PopoverMenu
      label={i18n.t("shell.switchWorkspace")}
      anchor="--app-workspace"
      entries={workspaceEntries}
      onclose={() => (open = undefined)}
    />
  {:else if open === "account"}
    <PopoverMenu
      label={i18n.t("shell.accountMenu")}
      anchor="--app-account"
      align="end"
      entries={accountEntries}
      onclose={() => (open = undefined)}
    />
  {/if}
</header>

<style>
  .app-bar {
    position: relative;
    z-index: 50;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--ui-space-4);
    height: var(--ui-bar-height);
    padding: 0 var(--ui-space-6);
    box-sizing: border-box;
    background: var(--ui-ground);
    border-bottom: 1px solid var(--ui-border);
    font-family: var(--ui-font);
  }

  .compact {
    height: var(--ui-bar-height-compact);
    padding: 0 var(--ui-space-4);
    background: var(--ui-surface);
  }

  .start,
  .end {
    display: flex;
    align-items: center;
    gap: var(--ui-space-4);
    min-width: 0;
  }

  .mark {
    display: flex;
    align-items: center;
    gap: var(--ui-space-2);
    color: var(--ui-ink);
    text-decoration: none;
  }

  .logo {
    display: block;
    width: 1.75rem;
    height: 1.75rem;
  }

  .name {
    font-weight: 700;
    font-size: var(--ui-text-md);
  }

  .pill {
    display: inline-flex;
    align-items: center;
    gap: var(--ui-space-2);
    min-height: var(--ui-control-sm);
    max-width: 18rem;
    padding: 0 var(--ui-space-3);
    border: 1px solid var(--ui-border);
    border-radius: var(--ui-radius-pill);
    background: var(--ui-surface);
    color: var(--ui-ink);
    font: 500 var(--ui-text-sm) / 1 var(--ui-font);
    cursor: pointer;
  }

  .pill span {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .pill.static {
    cursor: default;
  }

  .avatar {
    width: var(--ui-control-sm);
    height: var(--ui-control-sm);
    border: 0;
    border-radius: 50%;
    background: var(--ui-soft);
    color: var(--ui-link);
    font: 700 var(--ui-text-sm) / 1 var(--ui-font);
    cursor: pointer;
  }
</style>
