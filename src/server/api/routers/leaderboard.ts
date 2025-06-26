import { createTRPCRouter, publicProcedure } from "@/server/api/trpc";
import {
	events,
	participants,
	responses,
	rounds,
	scores,
} from "@/server/db/schema";
import { and, avg, count, desc, eq, sum } from "drizzle-orm";
import { z } from "zod";

export const leaderboardRouter = createTRPCRouter({
	// GET - Event leaderboard
	getEventLeaderboard: publicProcedure
		.input(z.object({ eventId: z.string() }))
		.query(async ({ ctx, input }) => {
			const leaderboard = await ctx.db
				.select({
					participant: participants,
					totalPoints: sum(scores.totalPoints),
					totalQuestions: sum(scores.totalQuestions),
					correctAnswers: sum(scores.correctAnswers),
					completionTime: sum(scores.completionTime),
				})
				.from(scores)
				.innerJoin(participants, eq(scores.participantId, participants.id))
				.where(eq(scores.eventId, input.eventId))
				.groupBy(participants.id)
				.orderBy(desc(sum(scores.totalPoints)));

			// Add rankings
			const rankedLeaderboard = leaderboard.map((entry, index) => ({
				...entry,
				rank: index + 1,
				accuracyRate:
					(Number(entry.totalQuestions) || 0) > 0
						? Math.round(
								((Number(entry.correctAnswers) || 0) /
									Number(entry.totalQuestions)) *
									100,
							)
						: 0,
			}));

			return rankedLeaderboard;
		}),

	// GET - Round leaderboard
	getRoundLeaderboard: publicProcedure
		.input(z.object({ roundId: z.string() }))
		.query(async ({ ctx, input }) => {
			const leaderboard = await ctx.db
				.select({
					participant: participants,
					score: scores,
				})
				.from(scores)
				.innerJoin(participants, eq(scores.participantId, participants.id))
				.where(eq(scores.roundId, input.roundId))
				.orderBy(desc(scores.totalPoints));

			// Add rankings
			const rankedLeaderboard = leaderboard.map((entry, index) => ({
				...entry,
				rank: index + 1,
				accuracyRate:
					(entry.score.totalQuestions ?? 0) > 0
						? Math.round(
								((entry.score.correctAnswers ?? 0) /
									Number(entry.score.totalQuestions)) *
									100,
							)
						: 0,
			}));

			return rankedLeaderboard;
		}),

	// GET - Participant performance across all events
	getParticipantPerformance: publicProcedure
		.input(z.object({ participantId: z.string() }))
		.query(async ({ ctx, input }) => {
			const performance = await ctx.db
				.select({
					event: events,
					round: rounds,
					score: scores,
				})
				.from(scores)
				.innerJoin(events, eq(scores.eventId, events.id))
				.innerJoin(rounds, eq(scores.roundId, rounds.id))
				.where(eq(scores.participantId, input.participantId))
				.orderBy(desc(scores.createdAt));

			const totalStats = {
				totalEvents: new Set(performance.map((p) => p.event.id)).size,
				totalRounds: performance.length,
				totalPoints: performance.reduce(
					(sum, p) => sum + (p.score.totalPoints ?? 0),
					0,
				),
				totalQuestions: performance.reduce(
					(sum, p) => sum + (p.score.totalQuestions ?? 0),
					0,
				),
				totalCorrect: performance.reduce(
					(sum, p) => sum + (p.score.correctAnswers ?? 0),
					0,
				),
				averageAccuracy: 0,
			};

			totalStats.averageAccuracy =
				totalStats.totalQuestions > 0
					? Math.round(
							(totalStats.totalCorrect / totalStats.totalQuestions) * 100,
						)
					: 0;

			return {
				performance,
				stats: totalStats,
			};
		}),

	// GET - Event statistics
	getEventStats: publicProcedure
		.input(z.object({ eventId: z.string() }))
		.query(async ({ ctx, input }) => {
			const stats = await ctx.db
				.select({
					totalParticipants: count(participants.id),
					averageScore: avg(scores.totalPoints),
					highestScore: sum(scores.totalPoints),
					totalResponses: count(responses.id),
				})
				.from(participants)
				.leftJoin(scores, eq(participants.id, scores.participantId))
				.leftJoin(responses, eq(participants.id, responses.participantId))
				.where(eq(participants.eventId, input.eventId));

			return (
				stats[0] || {
					totalParticipants: 0,
					averageScore: 0,
					highestScore: 0,
					totalResponses: 0,
				}
			);
		}),

	// GET - Live leaderboard (real-time updates)
	getLiveLeaderboard: publicProcedure
		.input(
			z.object({
				eventId: z.string(),
				roundId: z.string().optional(),
			}),
		)
		.query(async ({ ctx, input }) => {
			const whereConditions = [eq(participants.eventId, input.eventId)];

			if (input.roundId) {
				whereConditions.push(eq(responses.roundId, input.roundId));
			}

			const results = await ctx.db
				.select({
					participant: participants,
					totalPoints: sum(responses.pointsEarned),
					totalResponses: count(responses.id),
					correctResponses: count(responses.isCorrect),
					averageTime: avg(responses.timeTaken),
					lastResponse: responses.submittedAt,
				})
				.from(participants)
				.leftJoin(responses, eq(participants.id, responses.participantId))
				.where(and(...whereConditions))
				.groupBy(participants.id, responses.submittedAt)
				.orderBy(desc(sum(responses.pointsEarned)));

			// Add rankings and calculate accuracy
			const rankedResults = results.map((entry, index) => ({
				...entry,
				rank: index + 1,
				accuracyRate:
					(entry.totalResponses ?? 0) > 0
						? Math.round(
								((entry.correctResponses ?? 0) / Number(entry.totalResponses)) *
									100,
							)
						: 0,
			}));

			return rankedResults;
		}),

	// UPDATE - Recalculate scores for an event
	recalculateEventScores: publicProcedure
		.input(z.object({ eventId: z.string() }))
		.mutation(async ({ ctx, input }) => {
			return ctx.db.transaction(async (tx) => {
				// Get all participants for this event
				const eventParticipants = await tx
					.select()
					.from(participants)
					.where(eq(participants.eventId, input.eventId));

				// Get all rounds for this event
				const eventRounds = await tx
					.select()
					.from(rounds)
					.where(eq(rounds.eventId, input.eventId));

				let updatedScores = 0;

				for (const participant of eventParticipants) {
					for (const round of eventRounds) {
						// Get all responses for this participant in this round
						const roundResponses = await tx
							.select()
							.from(responses)
							.where(eq(responses.participantId, participant.id));

						const totalPoints = roundResponses.reduce(
							(sum, r) => sum + r.pointsEarned,
							0,
						);
						const totalQuestions = roundResponses.length;
						const correctAnswers = roundResponses.filter(
							(r) => r.isCorrect,
						).length;
						const completionTime = roundResponses.reduce(
							(sum, r) => sum + (r.timeTaken || 0),
							0,
						);

						// Update or create score record
						await tx
							.insert(scores)
							.values({
								participantId: participant.id,
								roundId: round.id,
								eventId: input.eventId,
								totalPoints,
								totalQuestions,
								correctAnswers,
								completionTime,
								completedAt: totalQuestions > 0 ? new Date() : null,
							})
							.onConflictDoUpdate({
								target: [scores.participantId, scores.roundId],
								set: {
									totalPoints,
									totalQuestions,
									correctAnswers,
									completionTime,
									completedAt: totalQuestions > 0 ? new Date() : null,
									updatedAt: new Date(),
								},
							});

						updatedScores++;
					}
				}

				return { success: true, updatedScores };
			});
		}),
});
