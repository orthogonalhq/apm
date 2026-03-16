ALTER TABLE "publisher_auth_methods" ADD COLUMN "access_token" varchar(512);--> statement-breakpoint
ALTER TABLE "scopes" ADD COLUMN "reserved_for" varchar(256);