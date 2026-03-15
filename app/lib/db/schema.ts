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
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

export const packages = pgTable(
  "packages",
  {
    id: uuid("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    name: varchar("name", { length: 64 }).notNull().unique(),
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

    // ── Source ───────────────────────────────────────────────
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
    index("idx_packages_name").on(table.name),
    index("idx_packages_fts").using(
      "gin",
      sql`to_tsvector('english', ${table.name} || ' ' || ${table.description})`
    ),
    index("idx_packages_kind").on(table.kind),
    index("idx_packages_category").on(table.category),
    index("idx_packages_tags").using("gin", table.tags),
    index("idx_packages_compatibility").using("gin", table.compatibility),
    index("idx_packages_status").on(table.status),
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

export type PackageRecord = typeof packages.$inferSelect;
export type NewPackageRecord = typeof packages.$inferInsert;
export type PackageDependencyRecord =
  typeof packageDependencies.$inferSelect;
