// Database schema (design.md decision 1). Token-like IDs (sessions, login tokens, invitations)
// are SHA-256 hashes of the secret; the secret itself is never stored.

import type { SetupAnswers } from "@webmio/templates";
import {
  type AnySQLiteColumn,
  index,
  integer,
  primaryKey,
  sqliteTable,
  text,
  uniqueIndex,
} from "drizzle-orm/sqlite-core";
import type { ImageEdit } from "../../image-edit";

const createdAt = () => integer("created_at", { mode: "timestamp_ms" }).notNull();

export const users = sqliteTable("users", {
  id: text("id").primaryKey(),
  email: text("email").notNull().unique(),
  createdAt: createdAt(),
  /** The interface language the person chose (`cs` or `en`); null until they choose one. */
  uiLanguage: text("ui_language"),
});

export const sessions = sqliteTable(
  "sessions",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    expiresAt: integer("expires_at", { mode: "timestamp_ms" }).notNull(),
    createdAt: createdAt(),
  },
  (t) => [index("sessions_user_idx").on(t.userId)],
);

export const loginTokens = sqliteTable("login_tokens", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  expiresAt: integer("expires_at", { mode: "timestamp_ms" }).notNull(),
  usedAt: integer("used_at", { mode: "timestamp_ms" }),
});

export const workspaces = sqliteTable("workspaces", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  createdAt: createdAt(),
});

export const roles = ["owner", "editor"] as const;
export type Role = (typeof roles)[number];

export const memberships = sqliteTable(
  "memberships",
  {
    workspaceId: text("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    role: text("role", { enum: roles }).notNull(),
    createdAt: createdAt(),
  },
  (t) => [
    primaryKey({ columns: [t.workspaceId, t.userId] }),
    index("memberships_user_idx").on(t.userId),
  ],
);

export const invitations = sqliteTable(
  "invitations",
  {
    id: text("id").primaryKey(),
    workspaceId: text("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    email: text("email").notNull(),
    role: text("role", { enum: roles }).notNull(),
    invitedBy: text("invited_by").references(() => users.id, { onDelete: "set null" }),
    expiresAt: integer("expires_at", { mode: "timestamp_ms" }).notNull(),
    usedAt: integer("used_at", { mode: "timestamp_ms" }),
    cancelledAt: integer("cancelled_at", { mode: "timestamp_ms" }),
    createdAt: createdAt(),
  },
  (t) => [index("invitations_workspace_idx").on(t.workspaceId)],
);

export const projects = sqliteTable(
  "projects",
  {
    id: text("id").primaryKey(),
    workspaceId: text("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    /** The language the project was created in: served at the root, the source of shared fields. */
    primaryLang: text("primary_lang").notNull().default("cs"),
    createdAt: createdAt(),
    /** When an owner deleted the project (project-deletion decision 1); null while it lives. */
    deletedAt: integer("deleted_at", { mode: "timestamp_ms" }),
    deletedBy: text("deleted_by").references(() => users.id, { onDelete: "set null" }),
  },
  (t) => [index("projects_workspace_idx").on(t.workspaceId)],
);

/** One per project and language. `version` mirrors the current version for the save check. */
export const siteDocuments = sqliteTable(
  "site_documents",
  {
    id: text("id").primaryKey(),
    projectId: text("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    lang: text("lang").notNull(),
    /** Whether the language is part of publishes; the primary language always is. */
    published: integer("published", { mode: "boolean" }).notNull().default(true),
    version: text("version").notNull(),
    // Not a foreign key: versions reference documents, and a cycle would complicate inserts.
    currentVersionId: text("current_version_id").notNull(),
  },
  (t) => [uniqueIndex("site_documents_project_lang_idx").on(t.projectId, t.lang)],
);

export const versions = sqliteTable(
  "versions",
  {
    id: text("id").primaryKey(),
    documentId: text("document_id")
      .notNull()
      .references(() => siteDocuments.id, { onDelete: "cascade" }),
    version: text("version").notNull(),
    document: text("document", { mode: "json" }).notNull(),
    createdAt: createdAt(),
    createdBy: text("created_by").references(() => users.id, { onDelete: "set null" }),
    /** The version a restore copied (version-history design.md decision 1); null for edits. */
    restoredFrom: text("restored_from").references((): AnySQLiteColumn => versions.id, {
      onDelete: "set null",
    }),
    /** Saved by the admin itself, such as a format upgrade (business-collections), not a member. */
    system: integer("system", { mode: "boolean" }).notNull().default(false),
  },
  (t) => [index("versions_document_idx").on(t.documentId)],
);

/**
 * A project's uploaded images (media design.md decision 3). `key` is the media key documents
 * use as an image's `src`; `removedAt` hides an image from the library without deleting files.
 * An image made by editing another names that image in `sourceKey` and keeps the turn and crop
 * in `edit` (image-cropping design decision 2); both are null for uploads.
 */
export const media = sqliteTable(
  "media",
  {
    projectId: text("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    key: text("key").notNull(),
    sha256: text("sha256").notNull(),
    originalName: text("original_name").notNull(),
    format: text("format", { enum: ["jpeg", "png", "webp"] }).notNull(),
    width: integer("width").notNull(),
    height: integer("height").notNull(),
    bytes: integer("bytes").notNull(),
    createdAt: createdAt(),
    createdBy: text("created_by").references(() => users.id, { onDelete: "set null" }),
    removedAt: integer("removed_at", { mode: "timestamp_ms" }),
    sourceKey: text("source_key"),
    edit: text("edit", { mode: "json" }).$type<ImageEdit>(),
  },
  (t) => [
    primaryKey({ columns: [t.projectId, t.key] }),
    uniqueIndex("media_project_sha256_idx").on(t.projectId, t.sha256),
  ],
);

/**
 * A workspace's connection to its Netlify team (netlify-publishing design.md decisions 2–3).
 * The token is encrypted with a key from SECRET_KEY and never leaves the server.
 */
export const hostingConnections = sqliteTable("hosting_connections", {
  workspaceId: text("workspace_id")
    .primaryKey()
    .references(() => workspaces.id, { onDelete: "cascade" }),
  provider: text("provider", { enum: ["netlify"] }).notNull(),
  accountSlug: text("account_slug").notNull(),
  accountName: text("account_name").notNull(),
  tokenEncrypted: text("token_encrypted").notNull(),
  connectedBy: text("connected_by").references(() => users.id, { onDelete: "set null" }),
  connectedAt: createdAt(),
});

export const hostingProviders = ["netlify", "webmio"] as const;

/** A project's site at the provider, its custom domain, and which publish is live. */
export const projectHosting = sqliteTable(
  "project_hosting",
  {
    projectId: text("project_id")
      .primaryKey()
      .references(() => projects.id, { onDelete: "cascade" }),
    provider: text("provider", { enum: hostingProviders }).notNull(),
    /** Netlify: the team's slug; Webmio hosting: "webmio". */
    accountSlug: text("account_slug").notNull(),
    siteId: text("site_id").notNull(),
    siteName: text("site_name").notNull(),
    defaultUrl: text("default_url").notNull(),
    domain: text("domain"),
    domainState: text("domain_state", {
      enum: ["waiting-for-dns", "issuing-certificate", "ready"],
    }),
    domainCheckedAt: integer("domain_checked_at", { mode: "timestamp_ms" }),
    /** Webmio hosting: the CloudFront tenant serving the domain (own-hosting decision 11). */
    domainTenantId: text("domain_tenant_id"),
    livePublishId: text("live_publish_id"),
  },
  (t) => [
    uniqueIndex("project_hosting_domain_idx").on(t.domain),
    uniqueIndex("project_hosting_site_name_idx").on(t.provider, t.siteName),
  ],
);

export const publishStates = ["running", "ready", "failed"] as const;
export const publishSteps = ["checking", "uploading", "verifying"] as const;

/** A warning stored with a publish (safe-publishing design.md decision 3). */
export type PublishWarning =
  | { kind: "outside-link"; page: string; url: string; status?: number }
  | { kind: "outside-links-skipped"; count: number };

/** Every publish of a project: which saved version, by whom, and how it went. */
export const publishes = sqliteTable(
  "publishes",
  {
    id: text("id").primaryKey(),
    projectId: text("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    versionId: text("version_id")
      .notNull()
      .references(() => versions.id, { onDelete: "cascade" }),
    state: text("state", { enum: publishStates }).notNull(),
    deployId: text("deploy_id"),
    url: text("url"),
    error: text("error"),
    redirectsCount: integer("redirects_count").notNull().default(0),
    publishedBy: text("published_by").references(() => users.id, { onDelete: "set null" }),
    startedAt: integer("started_at", { mode: "timestamp_ms" }).notNull(),
    finishedAt: integer("finished_at", { mode: "timestamp_ms" }),
    /** When Webmio hosting deleted the deploy's files; it can't be made live again after. */
    filesDeletedAt: integer("files_deleted_at", { mode: "timestamp_ms" }),
    /** What a running publish is doing (safe-publishing design.md decision 1); null when done. */
    step: text("step", { enum: publishSteps }),
    /** What a successful publish warns about, such as outside links that didn't answer. */
    warnings: text("warnings", { mode: "json" }).$type<PublishWarning[]>(),
  },
  (t) => [index("publishes_project_idx").on(t.projectId, t.startedAt)],
);

/** The saved version of each language a publish included (languages design.md decision 2). */
export const publishDocuments = sqliteTable(
  "publish_documents",
  {
    publishId: text("publish_id")
      .notNull()
      .references(() => publishes.id, { onDelete: "cascade" }),
    lang: text("lang").notNull(),
    versionId: text("version_id")
      .notNull()
      .references(() => versions.id, { onDelete: "cascade" }),
  },
  (t) => [primaryKey({ columns: [t.publishId, t.lang] })],
);

export const importStates = ["running", "done", "failed"] as const;

/** What an import is doing: its phase and how far it is (site-import, "Import progress"). */
export interface ImportProgress {
  phase: "pages" | "images" | "building";
  done: number;
  total: number;
}

/** An image of the old site, as a retry fetches it again. */
export interface RetryImage {
  id: string;
  candidates: string[];
  alt: string;
  role: "content" | "logo" | "favicon";
  /** The old paths of the pages showing it. */
  pages: string[];
}

/** What a retry needs to know about an import (import-review-actions design decision 1). */
export interface RetryState {
  /** The primary language's version the import, or the last retry, saved. */
  versionId: string;
  /** The old home page's language: pages in another aren't imported. */
  homeLang: string;
  /** Addresses of the pages that didn't answer, in the import's order. */
  unreachable: string[];
  /** Addresses of the pages over the limit, in the order the crawl would have read them. */
  queue: string[];
  /** Addresses the old site's menu linked. */
  menu: string[];
  failedImages: RetryImage[];
  /** Images that arrived: reference ID to media key. */
  media: Record<string, string>;
  /** Each page read: its address on the old site and its page ID. */
  pages: { url: string; pageId: string }[];
  /** Image node IDs retries placed: imported images, as those of the import's version are. */
  importedImages?: string[];
}

export const retryKinds = ["again", "next"] as const;

/**
 * Imports of a website by its address (site-import design decision 9): the running job, then
 * the project it made and its review, or why it failed.
 */
export const imports = sqliteTable(
  "imports",
  {
    id: text("id").primaryKey(),
    workspaceId: text("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    userId: text("user_id").references(() => users.id, { onDelete: "set null" }),
    /** The address the owner gave, with its scheme. */
    address: text("address").notNull(),
    state: text("state", { enum: importStates }).notNull(),
    progress: text("progress", { mode: "json" }).$type<ImportProgress>(),
    /** Why it failed, in the language of the person who started it. */
    error: text("error"),
    projectId: text("project_id").references(() => projects.id, { onDelete: "set null" }),
    /** What was imported and left out, for the review (`ImportReport` of `@webmio/import`). */
    report: text("report", { mode: "json" }).$type<unknown>(),
    reviewDismissed: integer("review_dismissed", { mode: "boolean" }).notNull().default(false),
    /** What a retry can still try (import-review-actions design decision 1); null before it. */
    retryState: text("retry_state", { mode: "json" }).$type<RetryState>(),
    /** The primary language's version the import saved: its images are the imported ones. */
    importVersionId: text("import_version_id"),
    startedAt: integer("started_at", { mode: "timestamp_ms" }).notNull(),
    finishedAt: integer("finished_at", { mode: "timestamp_ms" }),
  },
  (t) => [
    index("imports_workspace_idx").on(t.workspaceId, t.startedAt),
    index("imports_project_idx").on(t.projectId),
  ],
);

/**
 * Each imported page's path on the old site, redirected to the page's address when published
 * (site-import design decisions 9 and 10). Keyed by page, so a deleted page's path goes with it.
 */
export const pageOrigins = sqliteTable(
  "page_origins",
  {
    projectId: text("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    lang: text("lang").notNull(),
    pageId: text("page_id").notNull(),
    /** The path on the old site, like `/kontakt.html`. */
    path: text("path").notNull(),
  },
  (t) => [primaryKey({ columns: [t.projectId, t.lang, t.pageId] })],
);

/** What a retry added to the project, for the review. */
export interface RetryAdded {
  pages: number;
  /** Images placed where their pages show them. */
  placed: number;
  /** Images added to the library only: their pages were changed since the import. */
  library: number;
}

/**
 * Retries of an import's left-out pages and images (import-review-actions design decision 2):
 * "again" for what failed, "next" for the pages over the limit.
 */
export const importRetries = sqliteTable(
  "import_retries",
  {
    id: text("id").primaryKey(),
    importId: text("import_id")
      .notNull()
      .references(() => imports.id, { onDelete: "cascade" }),
    userId: text("user_id").references(() => users.id, { onDelete: "set null" }),
    kind: text("kind", { enum: retryKinds }).notNull(),
    state: text("state", { enum: importStates }).notNull(),
    progress: text("progress", { mode: "json" }).$type<ImportProgress>(),
    error: text("error"),
    added: text("added", { mode: "json" }).$type<RetryAdded>(),
    startedAt: integer("started_at", { mode: "timestamp_ms" }).notNull(),
    finishedAt: integer("finished_at", { mode: "timestamp_ms" }),
  },
  (t) => [index("import_retries_import_idx").on(t.importId, t.startedAt)],
);

/**
 * A project's guided setup (guided-setup design decision 1): the answers given so far and the
 * next step to show, until the owner finishes and the site is built from them. Projects made
 * another way have none.
 */
export const projectSetups = sqliteTable("project_setups", {
  projectId: text("project_id")
    .primaryKey()
    .references(() => projects.id, { onDelete: "cascade" }),
  answers: text("answers", { mode: "json" }).$type<SetupAnswers>().notNull(),
  /** The next step to show, 2 to 7 (step 1 made the project). */
  step: integer("step").notNull(),
  finishedAt: integer("finished_at", { mode: "timestamp_ms" }),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull(),
});

/** What a contact form asks for: a message, or a request to be called back. */
export const contactFormKinds = ["contact", "callback"] as const;

/**
 * Messages visitors sent through a website's contact forms (contact-form design decision 5),
 * kept 12 months, and with their project.
 */
export const contactMessages = sqliteTable(
  "contact_messages",
  {
    id: text("id").primaryKey(),
    projectId: text("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    /** The contact form block's node ID, and its kind and heading when the message came. */
    blockId: text("block_id").notNull(),
    kind: text("kind", { enum: contactFormKinds }).notNull(),
    heading: text("heading").notNull(),
    /** The page's path on the site, as the form sent it. */
    page: text("page").notNull(),
    name: text("name").notNull(),
    email: text("email").notNull(),
    phone: text("phone").notNull(),
    /** When to call back: `any`, `morning` or `afternoon`; "" for a message. */
    when: text("when").notNull(),
    message: text("message").notNull(),
    /** Whether the email to the owner was sent. */
    delivered: integer("delivered", { mode: "boolean" }).notNull(),
    handledAt: integer("handled_at", { mode: "timestamp_ms" }),
    createdAt: createdAt(),
  },
  (t) => [index("contact_messages_project_idx").on(t.projectId, t.createdAt)],
);

/**
 * Addresses a project's contact forms send to besides the business email (contact-form design
 * decision 4): each confirms itself through a link before it gets messages.
 */
export const formRecipients = sqliteTable(
  "form_recipients",
  {
    projectId: text("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    email: text("email").notNull(),
    /** SHA-256 of the confirmation link's token. */
    tokenHash: text("token_hash").notNull(),
    confirmedAt: integer("confirmed_at", { mode: "timestamp_ms" }),
    createdAt: createdAt(),
  },
  (t) => [
    primaryKey({ columns: [t.projectId, t.email] }),
    uniqueIndex("form_recipients_token_idx").on(t.tokenHash),
  ],
);
