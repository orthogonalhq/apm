CREATE TABLE "package_dependencies" (
	"package_id" uuid NOT NULL,
	"dependency_id" uuid NOT NULL,
	CONSTRAINT "package_dependencies_package_id_dependency_id_pk" PRIMARY KEY("package_id","dependency_id")
);
--> statement-breakpoint
ALTER TABLE "packages" ADD COLUMN "kind" varchar(32) DEFAULT 'skill' NOT NULL;--> statement-breakpoint
ALTER TABLE "packages" ADD COLUMN "category" varchar(64);--> statement-breakpoint
ALTER TABLE "packages" ADD COLUMN "tags" text[] DEFAULT '{}'::text[] NOT NULL;--> statement-breakpoint
ALTER TABLE "packages" ADD COLUMN "compatibility" text[] DEFAULT '{}'::text[] NOT NULL;--> statement-breakpoint
ALTER TABLE "packages" ADD COLUMN "repo_url" varchar(512);--> statement-breakpoint
ALTER TABLE "packages" ADD COLUMN "homepage_url" varchar(512);--> statement-breakpoint
ALTER TABLE "packages" ADD COLUMN "author" varchar(256);--> statement-breakpoint
ALTER TABLE "packages" ADD COLUMN "version" varchar(64);--> statement-breakpoint
ALTER TABLE "packages" ADD COLUMN "allowed_tools" text[] DEFAULT '{}'::text[] NOT NULL;--> statement-breakpoint
ALTER TABLE "packages" ADD COLUMN "token_count" integer DEFAULT 0;--> statement-breakpoint
ALTER TABLE "packages" ADD COLUMN "file_count" integer DEFAULT 1;--> statement-breakpoint
ALTER TABLE "packages" ADD COLUMN "progressive_disclosure" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "packages" ADD COLUMN "download_count" integer DEFAULT 0;--> statement-breakpoint
ALTER TABLE "packages" ADD COLUMN "dep_count" integer DEFAULT 0;--> statement-breakpoint
ALTER TABLE "packages" ADD COLUMN "dependant_count" integer DEFAULT 0;--> statement-breakpoint
ALTER TABLE "packages" ADD COLUMN "verified" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "packages" ADD COLUMN "featured" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "packages" ADD COLUMN "status" varchar(16) DEFAULT 'active' NOT NULL;--> statement-breakpoint
ALTER TABLE "packages" ADD COLUMN "last_updated_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "package_dependencies" ADD CONSTRAINT "package_dependencies_package_id_packages_id_fk" FOREIGN KEY ("package_id") REFERENCES "public"."packages"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "package_dependencies" ADD CONSTRAINT "package_dependencies_dependency_id_packages_id_fk" FOREIGN KEY ("dependency_id") REFERENCES "public"."packages"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_deps_package" ON "package_dependencies" USING btree ("package_id");--> statement-breakpoint
CREATE INDEX "idx_deps_dependency" ON "package_dependencies" USING btree ("dependency_id");--> statement-breakpoint
CREATE INDEX "idx_packages_kind" ON "packages" USING btree ("kind");--> statement-breakpoint
CREATE INDEX "idx_packages_category" ON "packages" USING btree ("category");--> statement-breakpoint
CREATE INDEX "idx_packages_tags" ON "packages" USING gin ("tags");--> statement-breakpoint
CREATE INDEX "idx_packages_compatibility" ON "packages" USING gin ("compatibility");--> statement-breakpoint
CREATE INDEX "idx_packages_status" ON "packages" USING btree ("status");