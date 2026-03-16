CREATE TABLE "audit_log" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"actor_id" uuid,
	"actor_type" varchar(16) NOT NULL,
	"action" varchar(64) NOT NULL,
	"target_type" varchar(16) NOT NULL,
	"target_id" uuid NOT NULL,
	"metadata" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "personal_access_tokens" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"publisher_id" uuid NOT NULL,
	"name" varchar(256) NOT NULL,
	"token_hash" varchar(256) NOT NULL,
	"scope_id" uuid,
	"expires_at" timestamp with time zone,
	"last_used_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "publisher_auth_methods" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"publisher_id" uuid NOT NULL,
	"provider" varchar(16) NOT NULL,
	"provider_id" varchar(256) NOT NULL,
	"provider_username" varchar(256),
	"provider_email" varchar(256),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "publishers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"display_name" varchar(256) NOT NULL,
	"email" varchar(256),
	"avatar_url" varchar(512),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"status" varchar(16) DEFAULT 'active' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "scope_members" (
	"scope_id" uuid NOT NULL,
	"publisher_id" uuid NOT NULL,
	"role" varchar(16) DEFAULT 'publisher' NOT NULL,
	"invited_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "scope_members_scope_id_publisher_id_pk" PRIMARY KEY("scope_id","publisher_id")
);
--> statement-breakpoint
CREATE TABLE "scope_tokens" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"scope_id" uuid NOT NULL,
	"name" varchar(256) NOT NULL,
	"token_hash" varchar(256) NOT NULL,
	"created_by" uuid NOT NULL,
	"expires_at" timestamp with time zone,
	"last_used_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "scopes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(64) NOT NULL,
	"display_name" varchar(256),
	"description" varchar(1024),
	"url" varchar(512),
	"verified" boolean DEFAULT false,
	"verification_method" varchar(16),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"status" varchar(16) DEFAULT 'active' NOT NULL,
	CONSTRAINT "scopes_name_unique" UNIQUE("name")
);
--> statement-breakpoint
ALTER TABLE "packages" ADD COLUMN "scope_id" uuid;--> statement-breakpoint
ALTER TABLE "packages" ADD COLUMN "source" varchar(16) DEFAULT 'indexed' NOT NULL;--> statement-breakpoint
ALTER TABLE "personal_access_tokens" ADD CONSTRAINT "personal_access_tokens_publisher_id_publishers_id_fk" FOREIGN KEY ("publisher_id") REFERENCES "public"."publishers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "personal_access_tokens" ADD CONSTRAINT "personal_access_tokens_scope_id_scopes_id_fk" FOREIGN KEY ("scope_id") REFERENCES "public"."scopes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "publisher_auth_methods" ADD CONSTRAINT "publisher_auth_methods_publisher_id_publishers_id_fk" FOREIGN KEY ("publisher_id") REFERENCES "public"."publishers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "scope_members" ADD CONSTRAINT "scope_members_scope_id_scopes_id_fk" FOREIGN KEY ("scope_id") REFERENCES "public"."scopes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "scope_members" ADD CONSTRAINT "scope_members_publisher_id_publishers_id_fk" FOREIGN KEY ("publisher_id") REFERENCES "public"."publishers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "scope_members" ADD CONSTRAINT "scope_members_invited_by_publishers_id_fk" FOREIGN KEY ("invited_by") REFERENCES "public"."publishers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "scope_tokens" ADD CONSTRAINT "scope_tokens_scope_id_scopes_id_fk" FOREIGN KEY ("scope_id") REFERENCES "public"."scopes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "scope_tokens" ADD CONSTRAINT "scope_tokens_created_by_publishers_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."publishers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_audit_actor" ON "audit_log" USING btree ("actor_id");--> statement-breakpoint
CREATE INDEX "idx_audit_target" ON "audit_log" USING btree ("target_type","target_id");--> statement-breakpoint
CREATE INDEX "idx_audit_action" ON "audit_log" USING btree ("action");--> statement-breakpoint
CREATE INDEX "idx_audit_created" ON "audit_log" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "idx_pat_publisher" ON "personal_access_tokens" USING btree ("publisher_id");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_auth_provider_id" ON "publisher_auth_methods" USING btree ("provider","provider_id");--> statement-breakpoint
CREATE INDEX "idx_auth_publisher" ON "publisher_auth_methods" USING btree ("publisher_id");--> statement-breakpoint
CREATE INDEX "idx_scope_members_publisher" ON "scope_members" USING btree ("publisher_id");--> statement-breakpoint
CREATE INDEX "idx_scope_tokens_scope" ON "scope_tokens" USING btree ("scope_id");--> statement-breakpoint
CREATE INDEX "idx_scopes_status" ON "scopes" USING btree ("status");