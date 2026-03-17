import {
  pgTable,
  uuid,
  varchar,
  text,
  jsonb,
  boolean,
  integer,
  timestamp,
  index,
  primaryKey,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

export const packages = pgTable(
  "packages",
  {
    id: uuid("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    scope: varchar("scope", { length: 128 }).notNull(),
    name: varchar("name", { length: 64 }).notNull(),
    description: varchar("description", { length: 1024 }).notNull(),

    // ── Classification ──────────────────────────────────────
    kind: varchar("kind", { length: 32 }).notNull().default("skill"),
    category: varchar("category", { length: 64 }),
    tags: text("tags")
      .array()
      .notNull()
      .default(sql`'{}'::text[]`),
    compatibility: text("compatibility")
      .array()
      .notNull()
      .default(sql`'{}'::text[]`),
    language: varchar("language", { length: 16 }).notNull().default("en"),

    // ── Scope ──────────────────────────────────────────────
    scopeId: uuid("scope_id"),

    // ── Source ───────────────────────────────────────────────
    source: varchar("source", { length: 16 }).notNull().default("indexed"),
    sourceRepo: varchar("source_repo", { length: 512 }).notNull(),
    sourcePath: varchar("source_path", { length: 512 }).notNull(),
    sourceRef: varchar("source_ref", { length: 128 }).default("main"),
    repoUrl: varchar("repo_url", { length: 512 }),
    homepageUrl: varchar("homepage_url", { length: 512 }),

    // ── Ownership ───────────────────────────────────────────
    repoOwner: varchar("repo_owner", { length: 256 }).notNull(),
    author: varchar("author", { length: 256 }),
    repoStars: integer("repo_stars").default(0),
    license: varchar("license", { length: 256 }),

    // ── Content ─────────────────────────────────────────────
    version: varchar("version", { length: 64 }),
    skillMdRaw: text("skill_md_raw").notNull(),
    frontmatter: jsonb("frontmatter").notNull(),
    allowedTools: text("allowed_tools")
      .array()
      .notNull()
      .default(sql`'{}'::text[]`),

    // ── Metrics ─────────────────────────────────────────────
    tokenCount: integer("token_count").default(0),
    fileCount: integer("file_count").default(1),
    progressiveDisclosure: boolean("progressive_disclosure").default(false),
    downloadCount: integer("download_count").default(0),
    depCount: integer("dep_count").default(0),
    dependantCount: integer("dependant_count").default(0),

    // ── Curation ────────────────────────────────────────────
    verified: boolean("verified").default(false),
    featured: boolean("featured").default(false),
    status: varchar("status", { length: 16 }).notNull().default("active"),
    hosted: boolean("hosted").default(false),

    // ── Timestamps ──────────────────────────────────────────
    lastUpdatedAt: timestamp("last_updated_at", { withTimezone: true }),
    firstIndexedAt: timestamp("first_indexed_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    lastIndexedAt: timestamp("last_indexed_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    lastCommitSha: varchar("last_commit_sha", { length: 40 }),
  },
  (table) => [
    uniqueIndex("idx_packages_scope_name").on(table.scope, table.name),
    index("idx_packages_scope").on(table.scope),
    index("idx_packages_name").on(table.name),
    index("idx_packages_fts").using(
      "gin",
      sql`to_tsvector('english', ${table.scope} || ' ' || ${table.name} || ' ' || ${table.description})`
    ),
    index("idx_packages_kind").on(table.kind),
    index("idx_packages_category").on(table.category),
    index("idx_packages_tags").using("gin", table.tags),
    index("idx_packages_compatibility").using("gin", table.compatibility),
    index("idx_packages_status").on(table.status),
    index("idx_packages_language").on(table.language),
  ]
);

export const packageDependencies = pgTable(
  "package_dependencies",
  {
    packageId: uuid("package_id")
      .notNull()
      .references(() => packages.id, { onDelete: "cascade" }),
    dependencyId: uuid("dependency_id")
      .notNull()
      .references(() => packages.id, { onDelete: "cascade" }),
  },
  (table) => [
    primaryKey({ columns: [table.packageId, table.dependencyId] }),
    index("idx_deps_package").on(table.packageId),
    index("idx_deps_dependency").on(table.dependencyId),
  ]
);

// ── Publishers ─────────────────────────────────────────────
export const publishers = pgTable("publishers", {
  id: uuid("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  displayName: varchar("display_name", { length: 256 }).notNull(),
  email: varchar("email", { length: 256 }),
  avatarUrl: varchar("avatar_url", { length: 512 }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  status: varchar("status", { length: 16 }).notNull().default("active"),
});

// ── Auth Methods ──────────────────────────────────────────
export const publisherAuthMethods = pgTable(
  "publisher_auth_methods",
  {
    id: uuid("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    publisherId: uuid("publisher_id")
      .notNull()
      .references(() => publishers.id, { onDelete: "cascade" }),
    provider: varchar("provider", { length: 16 }).notNull(),
    providerId: varchar("provider_id", { length: 256 }).notNull(),
    providerUsername: varchar("provider_username", { length: 256 }),
    providerEmail: varchar("provider_email", { length: 256 }),
    accessToken: varchar("access_token", { length: 512 }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    uniqueIndex("idx_auth_provider_id").on(table.provider, table.providerId),
    index("idx_auth_publisher").on(table.publisherId),
  ]
);

// ── Organizations ─────────────────────────────────────────
export const organizations = pgTable(
  "organizations",
  {
    id: uuid("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    name: varchar("name", { length: 64 }).notNull().unique(),
    displayName: varchar("display_name", { length: 256 }),
    description: varchar("description", { length: 1024 }),
    avatarUrl: varchar("avatar_url", { length: 512 }),
    url: varchar("url", { length: 512 }),
    email: varchar("email", { length: 256 }),
    verified: boolean("verified").default(false),
    verificationMethod: varchar("verification_method", { length: 16 }),
    status: varchar("status", { length: 16 }).notNull().default("active"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [index("idx_orgs_status").on(table.status)]
);

// ── Org Members ──────────────────────────────────────────
export const orgMembers = pgTable(
  "org_members",
  {
    orgId: uuid("org_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    publisherId: uuid("publisher_id")
      .notNull()
      .references(() => publishers.id, { onDelete: "cascade" }),
    role: varchar("role", { length: 16 }).notNull().default("member"),
    invitedBy: uuid("invited_by").references(() => publishers.id),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.orgId, table.publisherId] }),
    index("idx_org_members_publisher").on(table.publisherId),
  ]
);

// ── Scopes ────────────────────────────────────────────────
export const scopes = pgTable(
  "scopes",
  {
    id: uuid("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    orgId: uuid("org_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    name: varchar("name", { length: 64 }).notNull().unique(),
    verified: boolean("verified").default(false),
    status: varchar("status", { length: 16 }).notNull().default("active"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("idx_scopes_org").on(table.orgId),
    index("idx_scopes_status").on(table.status),
  ]
);

// ── Scope Members (deprecated — use org_members) ─────────
// Kept temporarily for migration. Will be dropped.
export const scopeMembers = pgTable(
  "scope_members",
  {
    scopeId: uuid("scope_id")
      .notNull()
      .references(() => scopes.id, { onDelete: "cascade" }),
    publisherId: uuid("publisher_id")
      .notNull()
      .references(() => publishers.id, { onDelete: "cascade" }),
    role: varchar("role", { length: 16 }).notNull().default("publisher"),
    invitedBy: uuid("invited_by").references(() => publishers.id),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.scopeId, table.publisherId] }),
    index("idx_scope_members_publisher").on(table.publisherId),
  ]
);

// ── Personal Access Tokens ────────────────────────────────
export const personalAccessTokens = pgTable(
  "personal_access_tokens",
  {
    id: uuid("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    publisherId: uuid("publisher_id")
      .notNull()
      .references(() => publishers.id, { onDelete: "cascade" }),
    name: varchar("name", { length: 256 }).notNull(),
    description: varchar("description", { length: 512 }),
    tokenHash: varchar("token_hash", { length: 256 }).notNull(),
    tokenHint: varchar("token_hint", { length: 16 }),
    scopeId: uuid("scope_id").references(() => scopes.id, {
      onDelete: "cascade",
    }),
    expiresAt: timestamp("expires_at", { withTimezone: true }),
    lastUsedAt: timestamp("last_used_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [index("idx_pat_publisher").on(table.publisherId)]
);

// ── Scope Tokens ──────────────────────────────────────────
export const scopeTokens = pgTable(
  "scope_tokens",
  {
    id: uuid("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    scopeId: uuid("scope_id")
      .notNull()
      .references(() => scopes.id, { onDelete: "cascade" }),
    name: varchar("name", { length: 256 }).notNull(),
    tokenHash: varchar("token_hash", { length: 256 }).notNull(),
    createdBy: uuid("created_by")
      .notNull()
      .references(() => publishers.id),
    expiresAt: timestamp("expires_at", { withTimezone: true }),
    lastUsedAt: timestamp("last_used_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [index("idx_scope_tokens_scope").on(table.scopeId)]
);

// ── Audit Log ─────────────────────────────────────────────
export const auditLog = pgTable(
  "audit_log",
  {
    id: uuid("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    actorId: uuid("actor_id"),
    actorType: varchar("actor_type", { length: 16 }).notNull(),
    action: varchar("action", { length: 64 }).notNull(),
    targetType: varchar("target_type", { length: 16 }).notNull(),
    targetId: uuid("target_id").notNull(),
    metadata: jsonb("metadata"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("idx_audit_actor").on(table.actorId),
    index("idx_audit_target").on(table.targetType, table.targetId),
    index("idx_audit_action").on(table.action),
    index("idx_audit_created").on(table.createdAt),
  ]
);

// ── Sessions ─────────────────────────────────────────────
export const sessions = pgTable(
  "sessions",
  {
    token: varchar("token", { length: 64 }).primaryKey(),
    publisherId: uuid("publisher_id")
      .notNull()
      .references(() => publishers.id, { onDelete: "cascade" }),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("idx_sessions_publisher").on(table.publisherId),
    index("idx_sessions_expires").on(table.expiresAt),
  ]
);

// ── Types ─────────────────────────────────────────────────
export type PackageRecord = typeof packages.$inferSelect;
export type NewPackageRecord = typeof packages.$inferInsert;
export type PackageDependencyRecord =
  typeof packageDependencies.$inferSelect;
export type PublisherRecord = typeof publishers.$inferSelect;
export type OrganizationRecord = typeof organizations.$inferSelect;
export type OrgMemberRecord = typeof orgMembers.$inferSelect;
export type ScopeRecord = typeof scopes.$inferSelect;
export type ScopeMemberRecord = typeof scopeMembers.$inferSelect;
export type AuditLogRecord = typeof auditLog.$inferSelect;
