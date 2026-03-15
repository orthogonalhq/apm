ALTER TABLE "packages" ADD COLUMN "language" varchar(16) DEFAULT 'en' NOT NULL;--> statement-breakpoint
CREATE INDEX "idx_packages_language" ON "packages" USING btree ("language");