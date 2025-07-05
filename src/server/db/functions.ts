import { and, eq, sql } from "drizzle-orm";
import type { NeonHttpDatabase } from "drizzle-orm/neon-http";
import { db } from ".";
import { scores } from "./schema";

export async function updateScores(
	participantId: string,
	roundId: string,
	eventId: string,
	pointsEarned: number,
	isCorrect: boolean,
) {
	await db
		.insert(scores)
		.values({
			participantId,
			roundId,
			eventId,
			totalPoints: pointsEarned,
			totalQuestions: 1,
			correctAnswers: isCorrect ? 1 : 0,
		})
		.onConflictDoUpdate({
			target: [scores.participantId, scores.roundId],
			set: {
				totalPoints: sql`${scores.totalPoints} + ${pointsEarned}`,
				totalQuestions: sql`${scores.totalQuestions} + 1`,
				correctAnswers: isCorrect
					? sql`${scores.correctAnswers} + 1`
					: scores.correctAnswers,
				updatedAt: new Date(),
			},
		});
}

export async function recalculate_event_scores(
	db: NeonHttpDatabase<typeof import("./schema")>,
	event_id: string,
) {
	await db.execute(sql`SELECT recalculate_event_scores(${event_id})`);
}
