CREATE TABLE "packages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(64) NOT NULL,
	"description" varchar(1024) NOT NULL,
	"source_repo" varchar(512) NOT NULL,
	"source_path" varchar(512) NOT NULL,
	"source_ref" varchar(128) DEFAULT 'main',
	"repo_owner" varchar(256) NOT NULL,
	"repo_stars" integer DEFAULT 0,
	"license" varchar(256),
	"skill_md_raw" text NOT NULL,
	"frontmatter" jsonb NOT NULL,
	"hosted" boolean DEFAULT false,
	"first_indexed_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_indexed_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_commit_sha" varchar(40),
	CONSTRAINT "packages_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE INDEX "idx_packages_name" ON "packages" USING btree ("name");--> statement-breakpoint
CREATE INDEX "idx_packages_fts" ON "packages" USING gin (to_tsvector('english', "name" || ' ' || "description"));