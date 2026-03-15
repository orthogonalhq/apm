ALTER TABLE "packages" DROP CONSTRAINT "packages_name_unique";--> statement-breakpoint
DROP INDEX "idx_packages_fts";--> statement-breakpoint
ALTER TABLE "packages" ADD COLUMN "scope" varchar(128);--> statement-breakpoint
UPDATE "packages" SET "scope" = lower("repo_owner") WHERE "scope" IS NULL;--> statement-breakpoint
ALTER TABLE "packages" ALTER COLUMN "scope" SET NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "idx_packages_scope_name" ON "packages" USING btree ("scope","name");--> statement-breakpoint
CREATE INDEX "idx_packages_scope" ON "packages" USING btree ("scope");--> statement-breakpoint
CREATE INDEX "idx_packages_fts" ON "packages" USING gin (to_tsvector('english', "scope" || ' ' || "name" || ' ' || "description"));
