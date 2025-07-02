CREATE TABLE "participant_sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"participant_id" uuid NOT NULL,
	"event_id" uuid NOT NULL,
	"round_id" uuid NOT NULL,
	"current_question_id" uuid,
	"question_started_at" timestamp,
	"is_on_question" boolean DEFAULT false NOT NULL,
	"total_questions_answered" integer DEFAULT 0 NOT NULL,
	"session_started_at" timestamp DEFAULT now() NOT NULL,
	"last_activity_at" timestamp DEFAULT now() NOT NULL,
	"is_completed" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "participant_sessions" ADD CONSTRAINT "participant_sessions_participant_id_participants_id_fk" FOREIGN KEY ("participant_id") REFERENCES "public"."participants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "participant_sessions" ADD CONSTRAINT "participant_sessions_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "participant_sessions" ADD CONSTRAINT "participant_sessions_round_id_rounds_id_fk" FOREIGN KEY ("round_id") REFERENCES "public"."rounds"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "participant_sessions" ADD CONSTRAINT "participant_sessions_current_question_id_questions_id_fk" FOREIGN KEY ("current_question_id") REFERENCES "public"."questions"("id") ON DELETE cascade ON UPDATE no action;