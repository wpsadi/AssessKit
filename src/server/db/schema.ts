import { relations } from "drizzle-orm";
import {
	boolean,
	integer,
	jsonb,
	pgTable,
	text,
	timestamp,
	unique,
	uuid,
} from "drizzle-orm/pg-core";

// ---------------------------
// ✅ Admins
// ---------------------------
export const admins = pgTable("admins", {
	userId: uuid("user_id").primaryKey()
})

// ---------------------------
// ✅ Profiles
// ---------------------------
export const profiles = pgTable("profiles", {
	id: uuid("id").primaryKey(),
	email: text("email").notNull(),
	fullName: text("full_name"),
	avatarUrl: text("avatar_url"),
	role: text("role").default("organizer").notNull(),
	createdAt: timestamp("created_at").defaultNow().notNull(),
	updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// ---------------------------
// ✅ Events
// ---------------------------
export const events = pgTable("events", {
	id: uuid("id").defaultRandom().primaryKey(),
	title: text("title").notNull(),
	description: text("description"),
	organizerId: uuid("organizer_id").notNull(), // Supabase auth.users.id (no FK)
	startDate: timestamp("start_date"),
	endDate: timestamp("end_date"),
	durationMinutes: integer("duration_minutes").default(60).notNull(),
	isActive: boolean("is_active").default(true).notNull(),
	orderIndex: integer("order_index").default(0).notNull(),
	createdAt: timestamp("created_at").defaultNow().notNull(),
	updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// ---------------------------
// ✅ Rounds
// ---------------------------
export const rounds = pgTable("rounds", {
	id: uuid("id").defaultRandom().primaryKey(),
	eventId: uuid("event_id")
		.references(() => events.id, { onDelete: "cascade" })
		.notNull(),
	title: text("title").notNull(),
	description: text("description"),
	orderIndex: integer("order_index").default(0).notNull(),
	timeLimit: integer("time_limit"), // in minutes
	useEventDuration: boolean("use_event_duration").default(false).notNull(),
	isActive: boolean("is_active").default(false).notNull(),
	createdAt: timestamp("created_at").defaultNow().notNull(),
	updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// ---------------------------
// ✅ Questions
// ---------------------------
export const questions = pgTable(
	"questions",
	{
		id: uuid("id").defaultRandom().primaryKey(),
		roundId: uuid("round_id")
			.references(() => rounds.id, { onDelete: "cascade" })
			.notNull(),
		questionId: text("question_id").notNull(),
		answerIds: jsonb("answer_ids").$type<string[]>().notNull(),
		positivePoints: integer("positive_points").default(1).notNull(),
		negativePoints: integer("negative_points").default(0).notNull(),
		timeLimit: integer("time_limit"), // in seconds
		useRoundDefault: boolean("use_round_default").default(true).notNull(),
		orderIndex: integer("order_index").default(0).notNull(),
		createdAt: timestamp("created_at").defaultNow().notNull(),
		updatedAt: timestamp("updated_at").defaultNow().notNull(),
	},
	(table) => ({
		uniqueQuestionIdPerRound: unique().on(table.roundId, table.questionId),
	}),
);

// ---------------------------
// ✅ Participants
// ---------------------------
export const participants = pgTable(
	"participants",
	{
		id: uuid("id").defaultRandom().primaryKey(),
		eventId: uuid("event_id")
			.references(() => events.id, { onDelete: "cascade" })
			.notNull(),
		userId: uuid("user_id").references(() => profiles.id),
		name: text("name").notNull(),
		email: text("email").notNull(),
		password: text("password"), // Note: plaintext — not recommended
		isActive: boolean("is_active").default(true).notNull(),
		orderIndex: integer("order_index").default(0).notNull(),
		createdAt: timestamp("created_at").defaultNow().notNull(),
		updatedAt: timestamp("updated_at").defaultNow().notNull(),
	},
	(table) => ({
		// ✅ Ensures email is unique within a given event
		uniqueEmailPerEvent: unique().on(table.eventId, table.email),
	}),
);

// ---------------------------
// ✅ Responses
// ---------------------------
export const responses = pgTable("responses", {
	id: uuid("id").defaultRandom().primaryKey(),
	participantId: uuid("participant_id")
		.references(() => participants.id, { onDelete: "cascade" })
		.notNull(),
	questionId: uuid("question_id")
		.references(() => questions.id, { onDelete: "cascade" })
		.notNull(),
	roundId: uuid("round_id")
		.references(() => rounds.id, { onDelete: "cascade" })
		.notNull(),
	submittedAnswer: text("submitted_answer").notNull(),
	isCorrect: boolean("is_correct").notNull(),
	pointsEarned: integer("points_earned").default(0).notNull(),
	timeTaken: integer("time_taken"),
	submittedAt: timestamp("submitted_at").defaultNow().notNull(),
});

// ---------------------------
// ✅ Scores
// ---------------------------
export const scores = pgTable(
	"scores",
	{
		id: uuid("id").defaultRandom().primaryKey(),
		participantId: uuid("participant_id")
			.references(() => participants.id, { onDelete: "cascade" })
			.notNull(),
		roundId: uuid("round_id")
			.references(() => rounds.id, { onDelete: "cascade" })
			.notNull(),
		eventId: uuid("event_id")
			.references(() => events.id, { onDelete: "cascade" })
			.notNull(),
		totalPoints: integer("total_points").default(0).notNull(),
		totalQuestions: integer("total_questions").default(0).notNull(),
		correctAnswers: integer("correct_answers").default(0).notNull(),
		completionTime: integer("completion_time"),
		completedAt: timestamp("completed_at"),
		createdAt: timestamp("created_at").defaultNow().notNull(),
		updatedAt: timestamp("updated_at").defaultNow().notNull(),
	},
	(table) => ({
		participantRoundUnique: unique().on(table.participantId, table.roundId),
	}),
);

// ---------------------------
// ✅ Participant Sessions
// ---------------------------
export const participantSessions = pgTable("participant_sessions", {
	id: uuid("id").defaultRandom().primaryKey(),
	participantId: uuid("participant_id")
		.references(() => participants.id, { onDelete: "cascade" })
		.notNull(),
	eventId: uuid("event_id")
		.references(() => events.id, { onDelete: "cascade" })
		.notNull(),
	roundId: uuid("round_id")
		.references(() => rounds.id, { onDelete: "cascade" })
		.notNull(),
	currentQuestionId: uuid("current_question_id").references(
		() => questions.id,
		{ onDelete: "cascade" },
	),
	questionStartedAt: timestamp("question_started_at"),
	isOnQuestion: boolean("is_on_question").default(false).notNull(),
	totalQuestionsAnswered: integer("total_questions_answered")
		.default(0)
		.notNull(),
	sessionStartedAt: timestamp("session_started_at").defaultNow().notNull(),
	lastActivityAt: timestamp("last_activity_at").defaultNow().notNull(),
	isCompleted: boolean("is_completed").default(false).notNull(),
	createdAt: timestamp("created_at").defaultNow().notNull(),
	updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// ---------------------------
// ✅ Relations
// ---------------------------
export const profilesRelations = relations(profiles, ({ many }) => ({
	participants: many(participants),
}));

export const eventsRelations = relations(events, ({ many }) => ({
	rounds: many(rounds),
	participants: many(participants),
	scores: many(scores),
	participantSessions: many(participantSessions),
}));

export const roundsRelations = relations(rounds, ({ one, many }) => ({
	event: one(events, {
		fields: [rounds.eventId],
		references: [events.id],
	}),
	questions: many(questions),
	responses: many(responses),
	scores: many(scores),
	participantSessions: many(participantSessions),
}));

export const questionsRelations = relations(questions, ({ one, many }) => ({
	round: one(rounds, {
		fields: [questions.roundId],
		references: [rounds.id],
	}),
	responses: many(responses),
}));

export const participantsRelations = relations(
	participants,
	({ one, many }) => ({
		event: one(events, {
			fields: [participants.eventId],
			references: [events.id],
		}),
		user: one(profiles, {
			fields: [participants.userId],
			references: [profiles.id],
		}),
		responses: many(responses),
		scores: many(scores),
		sessions: many(participantSessions),
	}),
);

export const responsesRelations = relations(responses, ({ one }) => ({
	participant: one(participants, {
		fields: [responses.participantId],
		references: [participants.id],
	}),
	question: one(questions, {
		fields: [responses.questionId],
		references: [questions.id],
	}),
	round: one(rounds, {
		fields: [responses.roundId],
		references: [rounds.id],
	}),
}));

export const scoresRelations = relations(scores, ({ one }) => ({
	participant: one(participants, {
		fields: [scores.participantId],
		references: [participants.id],
	}),
	round: one(rounds, {
		fields: [scores.roundId],
		references: [rounds.id],
	}),
	event: one(events, {
		fields: [scores.eventId],
		references: [events.id],
	}),
}));

export const participantSessionsRelations = relations(
	participantSessions,
	({ one }) => ({
		participant: one(participants, {
			fields: [participantSessions.participantId],
			references: [participants.id],
		}),
		event: one(events, {
			fields: [participantSessions.eventId],
			references: [events.id],
		}),
		round: one(rounds, {
			fields: [participantSessions.roundId],
			references: [rounds.id],
		}),
		currentQuestion: one(questions, {
			fields: [participantSessions.currentQuestionId],
			references: [questions.id],
		}),
	}),
);
