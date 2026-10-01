// Database schema (design.md decision 1). Token-like IDs (sessions, login tokens, invitations)
// are SHA-256 hashes of the secret; the secret itself is never stored.
import {
  index,
  integer,
  primaryKey,
  sqliteTable,
  text,
  uniqueIndex,
} from "drizzle-orm/sqlite-core";

const createdAt = () => integer("created_at", { mode: "timestamp_ms" }).notNull();

export const users = sqliteTable("users", {
  id: text("id").primaryKey(),
  email: text("email").notNull().unique(),
  createdAt: createdAt(),
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
  },
  (t) => [index("versions_document_idx").on(t.documentId)],
);

/**
 * A project's uploaded images (media design.md decision 3). `key` is the media key documents
 * use as an image's `src`; `removedAt` hides an image from the library without deleting files.
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

/** A project's site at the provider, its custom domain, and which publish is live. */
export const projectHosting = sqliteTable(
  "project_hosting",
  {
    projectId: text("project_id")
      .primaryKey()
      .references(() => projects.id, { onDelete: "cascade" }),
    provider: text("provider", { enum: ["netlify"] }).notNull(),
    accountSlug: text("account_slug").notNull(),
    siteId: text("site_id").notNull(),
    siteName: text("site_name").notNull(),
    defaultUrl: text("default_url").notNull(),
    domain: text("domain"),
    domainState: text("domain_state", {
      enum: ["waiting-for-dns", "issuing-certificate", "ready"],
    }),
    domainCheckedAt: integer("domain_checked_at", { mode: "timestamp_ms" }),
    livePublishId: text("live_publish_id"),
  },
  (t) => [uniqueIndex("project_hosting_domain_idx").on(t.domain)],
);

export const publishStates = ["running", "ready", "failed"] as const;

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
