-- Create organizations table
CREATE TABLE "organizations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(64) NOT NULL UNIQUE,
	"display_name" varchar(256),
	"description" varchar(1024),
	"avatar_url" varchar(512),
	"url" varchar(512),
	"email" varchar(256),
	"verified" boolean DEFAULT false,
	"verification_method" varchar(16),
	"status" varchar(16) DEFAULT 'active' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "idx_orgs_status" ON "organizations" USING btree ("status");
--> statement-breakpoint

-- Create org_members table
CREATE TABLE "org_members" (
	"org_id" uuid NOT NULL REFERENCES "organizations"("id") ON DELETE CASCADE,
	"publisher_id" uuid NOT NULL REFERENCES "publishers"("id") ON DELETE CASCADE,
	"role" varchar(16) DEFAULT 'member' NOT NULL,
	"invited_by" uuid REFERENCES "publishers"("id"),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	PRIMARY KEY ("org_id", "publisher_id")
);
--> statement-breakpoint
CREATE INDEX "idx_org_members_publisher" ON "org_members" USING btree ("publisher_id");
--> statement-breakpoint

-- Add org_id to scopes (nullable initially for migration)
ALTER TABLE "scopes" ADD COLUMN "org_id" uuid REFERENCES "organizations"("id") ON DELETE CASCADE;
--> statement-breakpoint
CREATE INDEX "idx_scopes_org" ON "scopes" USING btree ("org_id");
--> statement-breakpoint

-- Migrate existing scopes: create an org for each, transfer membership
INSERT INTO "organizations" ("id", "name", "display_name", "description", "url", "verified", "verification_method", "status", "created_at")
SELECT "id", "name", "display_name", "description", "url", "verified", "verification_method", "status", "created_at"
FROM "scopes";
--> statement-breakpoint

-- Point each scope to its matching org (same id)
UPDATE "scopes" SET "org_id" = "id";
--> statement-breakpoint

-- Migrate scope_members to org_members
INSERT INTO "org_members" ("org_id", "publisher_id", "role", "invited_by", "created_at")
SELECT "scope_id", "publisher_id", "role", "invited_by", "created_at"
FROM "scope_members"
ON CONFLICT DO NOTHING;
--> statement-breakpoint

-- Make org_id NOT NULL now that data is migrated
ALTER TABLE "scopes" ALTER COLUMN "org_id" SET NOT NULL;
--> statement-breakpoint

-- Drop migrated columns from scopes
ALTER TABLE "scopes" DROP COLUMN IF EXISTS "display_name";
--> statement-breakpoint
ALTER TABLE "scopes" DROP COLUMN IF EXISTS "description";
--> statement-breakpoint
ALTER TABLE "scopes" DROP COLUMN IF EXISTS "url";
--> statement-breakpoint
ALTER TABLE "scopes" DROP COLUMN IF EXISTS "verification_method";
--> statement-breakpoint
ALTER TABLE "scopes" DROP COLUMN IF EXISTS "reserved_for";
