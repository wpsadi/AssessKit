import { createTRPCRouter, publicProcedure } from "@/server/api/trpc";
import { recalculate_event_scores } from "@/server/db/functions";
import { participants, scores } from "@/server/db/schema";
import { and, avg, desc, eq, max, sum } from "drizzle-orm";
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
			}));

			return rankedLeaderboard;
		}),

	// POST - Recalculate scores for an event
	recalculateEventScores: publicProcedure
		.input(z.object({ eventId: z.string() }))
		.mutation(async ({ ctx, input }) => {
			await recalculate_event_scores(ctx.db as any, input.eventId);
			return { success: true };
		}),

	// GET - Event stats
	getEventStats: publicProcedure
		.input(z.object({ eventId: z.string() }))
		.query(async ({ ctx, input }) => {
			const stats = await ctx.db
				.select({
					totalParticipants: sum(scores.totalQuestions),
					averageScore: avg(scores.totalPoints),
					highestScore: max(scores.totalPoints),
				})
				.from(scores)
				.where(eq(scores.eventId, input.eventId));

			return stats[0];
		}),
});
