CREATE TYPE "public"."office_hours_status" AS ENUM('open', 'paused', 'closed');--> statement-breakpoint
CREATE TYPE "public"."queue_status" AS ENUM('waiting', 'called', 'in_call', 'done', 'left', 'skipped');--> statement-breakpoint
CREATE TYPE "public"."user_role" AS ENUM('staff', 'student');--> statement-breakpoint
CREATE TABLE "idempotency_keys" (
	"key" text PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"response" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "office_hours" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"host_id" uuid NOT NULL,
	"title" text NOT NULL,
	"status" "office_hours_status" DEFAULT 'open' NOT NULL,
	"join_code" text NOT NULL,
	"opens_at" timestamp with time zone,
	"closes_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "office_hours_join_code_unique" UNIQUE("join_code")
);
--> statement-breakpoint
CREATE TABLE "outbox" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"kind" text NOT NULL,
	"payload" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"sent_at" timestamp with time zone,
	"attempts" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "queue_entries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"office_hours_id" uuid NOT NULL,
	"student_id" uuid NOT NULL,
	"status" "queue_status" DEFAULT 'waiting' NOT NULL,
	"priority" integer DEFAULT 0 NOT NULL,
	"joined_at" timestamp with time zone DEFAULT now() NOT NULL,
	"called_at" timestamp with time zone,
	"called_by" uuid,
	"no_show_count" integer DEFAULT 0 NOT NULL,
	"question" text
);
--> statement-breakpoint
CREATE TABLE "staff_members" (
	"office_hours_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	CONSTRAINT "staff_members_office_hours_id_user_id_pk" PRIMARY KEY("office_hours_id","user_id")
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"display_name" text NOT NULL,
	"role" "user_role" NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "idempotency_keys" ADD CONSTRAINT "idempotency_keys_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "office_hours" ADD CONSTRAINT "office_hours_host_id_users_id_fk" FOREIGN KEY ("host_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "queue_entries" ADD CONSTRAINT "queue_entries_office_hours_id_office_hours_id_fk" FOREIGN KEY ("office_hours_id") REFERENCES "public"."office_hours"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "queue_entries" ADD CONSTRAINT "queue_entries_student_id_users_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "queue_entries" ADD CONSTRAINT "queue_entries_called_by_users_id_fk" FOREIGN KEY ("called_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "staff_members" ADD CONSTRAINT "staff_members_office_hours_id_office_hours_id_fk" FOREIGN KEY ("office_hours_id") REFERENCES "public"."office_hours"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "staff_members" ADD CONSTRAINT "staff_members_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "outbox_unsent" ON "outbox" USING btree ("created_at") WHERE "outbox"."sent_at" is null;--> statement-breakpoint
CREATE UNIQUE INDEX "queue_entries_one_active_per_student" ON "queue_entries" USING btree ("office_hours_id","student_id") WHERE "queue_entries"."status" in ('waiting', 'called', 'in_call');--> statement-breakpoint
CREATE INDEX "queue_entries_next_waiting" ON "queue_entries" USING btree ("office_hours_id","priority" DESC NULLS LAST,"joined_at") WHERE "queue_entries"."status" = 'waiting';