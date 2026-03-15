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
    sourceRepo: varchar("source_repo", { length: 512 }).notNull(),
    sourcePath: varchar("source_path", { length: 512 }).notNull(),
    sourceRef: varchar("source_ref", { length: 128 }).default("main"),
    repoOwner: varchar("repo_owner", { length: 256 }).notNull(),
    repoStars: integer("repo_stars").default(0),
    license: varchar("license", { length: 256 }),
    skillMdRaw: text("skill_md_raw").notNull(),
    frontmatter: jsonb("frontmatter").notNull(),
    hosted: boolean("hosted").default(false),
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
  ]
);

export type PackageRecord = typeof packages.$inferSelect;
export type NewPackageRecord = typeof packages.$inferInsert;
