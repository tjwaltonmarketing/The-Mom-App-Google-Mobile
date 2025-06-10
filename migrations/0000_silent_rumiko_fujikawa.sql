CREATE TABLE "deadlines" (
	"id" serial PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"due_date" timestamp NOT NULL,
	"priority" text DEFAULT 'medium' NOT NULL,
	"is_completed" boolean DEFAULT false,
	"related_to" integer
);
--> statement-breakpoint
CREATE TABLE "events" (
	"id" serial PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"start_time" timestamp NOT NULL,
	"end_time" timestamp,
	"location" text,
	"assigned_to" integer,
	"is_all_day" boolean DEFAULT false,
	"is_private" boolean DEFAULT false,
	"visibility_type" text DEFAULT 'shared' NOT NULL,
	"shared_with" integer[] DEFAULT '{}',
	"created_by" integer
);
--> statement-breakpoint
CREATE TABLE "family_members" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"role" text NOT NULL,
	"color" text NOT NULL,
	"avatar" text NOT NULL,
	"phone" text,
	"email" text,
	"notification_preference" text DEFAULT 'sms'
);
--> statement-breakpoint
CREATE TABLE "grocery_items" (
	"id" serial PRIMARY KEY NOT NULL,
	"item" text NOT NULL,
	"quantity" text NOT NULL,
	"category" text NOT NULL,
	"is_completed" boolean DEFAULT false,
	"added_by" integer,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "meal_plans" (
	"id" serial PRIMARY KEY NOT NULL,
	"day" text NOT NULL,
	"meal_type" text NOT NULL,
	"meal" text NOT NULL,
	"ingredients" text[],
	"notes" text,
	"created_by" integer,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "notifications" (
	"id" serial PRIMARY KEY NOT NULL,
	"type" text NOT NULL,
	"title" text NOT NULL,
	"message" text NOT NULL,
	"recipient_id" integer NOT NULL,
	"related_task_id" integer,
	"related_event_id" integer,
	"scheduled_for" timestamp NOT NULL,
	"sent_at" timestamp,
	"delivery_method" text NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "passwords" (
	"id" serial PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"category" text NOT NULL,
	"website" text,
	"username" text,
	"email" text,
	"password" text NOT NULL,
	"notes" text,
	"last_updated" timestamp DEFAULT now(),
	"created_by" integer,
	"shared_with" text,
	"is_favorite" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "subscriptions" (
	"id" serial PRIMARY KEY NOT NULL,
	"family_id" integer NOT NULL,
	"stripe_customer_id" text,
	"stripe_subscription_id" text,
	"status" text DEFAULT 'trial' NOT NULL,
	"plan" text DEFAULT 'family' NOT NULL,
	"billing_cycle" text DEFAULT 'monthly' NOT NULL,
	"trial_start_date" timestamp DEFAULT now(),
	"trial_end_date" timestamp NOT NULL,
	"subscription_start_date" timestamp,
	"subscription_end_date" timestamp,
	"cancel_at_period_end" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "tasks" (
	"id" serial PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"is_completed" boolean DEFAULT false,
	"priority" text DEFAULT 'medium' NOT NULL,
	"due_date" timestamp,
	"assigned_to" integer,
	"completed_by" integer,
	"completed_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "voice_notes" (
	"id" serial PRIMARY KEY NOT NULL,
	"content" text NOT NULL,
	"transcription" text,
	"created_by" integer,
	"created_at" timestamp DEFAULT now(),
	"is_processed" boolean DEFAULT false
);
--> statement-breakpoint
ALTER TABLE "deadlines" ADD CONSTRAINT "deadlines_related_to_family_members_id_fk" FOREIGN KEY ("related_to") REFERENCES "public"."family_members"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "events" ADD CONSTRAINT "events_assigned_to_family_members_id_fk" FOREIGN KEY ("assigned_to") REFERENCES "public"."family_members"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "events" ADD CONSTRAINT "events_created_by_family_members_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."family_members"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "grocery_items" ADD CONSTRAINT "grocery_items_added_by_family_members_id_fk" FOREIGN KEY ("added_by") REFERENCES "public"."family_members"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "meal_plans" ADD CONSTRAINT "meal_plans_created_by_family_members_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."family_members"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_recipient_id_family_members_id_fk" FOREIGN KEY ("recipient_id") REFERENCES "public"."family_members"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_related_task_id_tasks_id_fk" FOREIGN KEY ("related_task_id") REFERENCES "public"."tasks"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_related_event_id_events_id_fk" FOREIGN KEY ("related_event_id") REFERENCES "public"."events"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "passwords" ADD CONSTRAINT "passwords_created_by_family_members_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."family_members"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_family_id_family_members_id_fk" FOREIGN KEY ("family_id") REFERENCES "public"."family_members"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_assigned_to_family_members_id_fk" FOREIGN KEY ("assigned_to") REFERENCES "public"."family_members"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_completed_by_family_members_id_fk" FOREIGN KEY ("completed_by") REFERENCES "public"."family_members"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "voice_notes" ADD CONSTRAINT "voice_notes_created_by_family_members_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."family_members"("id") ON DELETE no action ON UPDATE no action;