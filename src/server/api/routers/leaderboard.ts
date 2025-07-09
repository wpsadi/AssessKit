import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";
import {
	participantSessions,
	participants,
	responses,
} from "@/server/db/schema";
import { and, asc, desc, eq, sql } from "drizzle-orm";
import { z } from "zod";

// Helper function to ensure UTC formatting
function ensureUTC(timestamp: string | null): string | null {
	if (!timestamp) return null;
	// If timestamp already has timezone info, return as is
	if (
		timestamp.includes("Z") ||
		timestamp.includes("+") ||
		timestamp.includes("-")
	) {
		return timestamp;
	}
	// Otherwise, append 'Z' to indicate UTC
	return `${timestamp}Z`;
}

export const leaderboardRouter = createTRPCRouter({
	// GET - Leaderboard data (can be filtered by round)
	getLeaderboard: protectedProcedure
		.input(
			z.object({
				eventId: z.string(),
				roundId: z.string().optional(),
			}),
		)
		.query(async ({ ctx, input }) => {
			const { eventId, roundId } = input;

			// Build the main query to get leaderboard data directly from responses and sessions
			const leaderboardQuery = ctx.db
				.select({
					participant: participants,
					// Calculate points directly from responses
					totalPoints: sql<number>`COALESCE(SUM(${responses.pointsEarned}), 0)`,
					totalQuestions: sql<number>`COUNT(${responses.id})`,
					correctAnswers: sql<number>`SUM(CASE WHEN ${responses.isCorrect} = true THEN 1 ELSE 0 END)`,
					totalTimeTaken: sql<number>`COALESCE(SUM(${responses.timeTaken}), 0)`,
					// Get session information for completion time calculation
					sessionStartedAt: sql<string>`MIN(${participantSessions.sessionStartedAt})`, // First session start
					lastActivityAt: sql<string>`MAX(${participantSessions.lastActivityAt})`, // Latest activity
					isCompleted: sql<boolean>`BOOL_AND(${participantSessions.isCompleted})`, // All sessions completed
					totalSessions: sql<number>`COUNT(DISTINCT ${participantSessions.id})`,
					completedSessions: sql<number>`COUNT(CASE WHEN ${participantSessions.isCompleted} = true THEN 1 END)`,
					// Get first and last response timestamps for accurate completion time
					firstResponseTime: sql<string>`MIN(${responses.submittedAt})`,
					lastResponseTime: sql<string>`MAX(${responses.submittedAt})`,
					totalQuestionsAnswered: sql<number>`MAX(${participantSessions.totalQuestionsAnswered})`,
				})
				.from(participants)
				.leftJoin(
					responses,
					and(
						eq(responses.participantId, participants.id),
						roundId ? eq(responses.roundId, roundId) : undefined,
					),
				)
				.leftJoin(
					participantSessions,
					and(
						eq(participantSessions.participantId, participants.id),
						eq(participantSessions.eventId, eventId),
						roundId ? eq(participantSessions.roundId, roundId) : undefined,
					),
				)
				.where(eq(participants.eventId, eventId))
				.groupBy(participants.id)
				.orderBy(
					desc(sql<number>`COALESCE(SUM(${responses.pointsEarned}), 0)`), // Primary: Total points
					asc(sql<number>`COALESCE(SUM(${responses.timeTaken}), 0)`), // Secondary: Lower total time
				);

			// Execute the query
			const results = await leaderboardQuery;

			// Calculate completion time and format data
			const formattedResults = results.map((result, index) => {
				const totalQuestions = Number(result.totalQuestions) || 0;
				const correctAnswers = Number(result.correctAnswers) || 0;
				const accuracy =
					totalQuestions > 0 ? (correctAnswers / totalQuestions) * 100 : 0;

				// Calculate completion time based on completion status
				let completionTimeSeconds = 0;
				const isFullyCompleted = Boolean(result.isCompleted);

				if (
					isFullyCompleted &&
					result.firstResponseTime &&
					result.lastResponseTime
				) {
					// For completed participants: time from first response to last response
					const firstResponse = new Date(
						ensureUTC(result.firstResponseTime) || "",
					);
					const lastResponse = new Date(
						ensureUTC(result.lastResponseTime) || "",
					);

					if (
						!Number.isNaN(firstResponse.getTime()) &&
						!Number.isNaN(lastResponse.getTime())
					) {
						completionTimeSeconds = Math.floor(
							(lastResponse.getTime() - firstResponse.getTime()) / 1000,
						);
					}
				} else if (result.sessionStartedAt && result.lastActivityAt) {
					// For incomplete participants: time from session start to last activity
					const sessionStart = new Date(
						ensureUTC(result.sessionStartedAt) || "",
					);
					const lastActivity = new Date(ensureUTC(result.lastActivityAt) || "");

					if (
						!Number.isNaN(sessionStart.getTime()) &&
						!Number.isNaN(lastActivity.getTime())
					) {
						completionTimeSeconds = Math.floor(
							(lastActivity.getTime() - sessionStart.getTime()) / 1000,
						);
					}
				}

				return {
					participant: {
						id: result.participant.id,
						name: result.participant.name,
						email: result.participant.email,
					},
					rank: index + 1, // Will be adjusted for ties below
					totalPoints: Number(result.totalPoints) || 0,
					totalQuestions,
					correctAnswers,
					accuracy: Math.round(accuracy * 100) / 100, // Round to 2 decimal places
					timeTaken: Number(result.totalTimeTaken) || 0,
					completionTime: completionTimeSeconds,
					isCompleted: isFullyCompleted,
					sessionStart: ensureUTC(result.sessionStartedAt),
					lastActivity: ensureUTC(result.lastActivityAt),
					firstResponseTime: ensureUTC(result.firstResponseTime),
					lastResponseTime: ensureUTC(result.lastResponseTime),
					totalSessions: Number(result.totalSessions) || 0,
					completedSessions: Number(result.completedSessions) || 0,
					questionsAnswered: Number(result.totalQuestionsAnswered) || 0,
				};
			});

			// Adjust ranking for ties (same points and same total time)
			let currentRank = 1;
			const rankedResults = formattedResults.map((result, index) => {
				if (index > 0) {
					const prevResult = formattedResults[index - 1];
					if (
						prevResult &&
						(result.totalPoints !== prevResult.totalPoints ||
							result.timeTaken !== prevResult.timeTaken)
					) {
						currentRank = index + 1;
					}
				}

				return {
					...result,
					rank: currentRank,
				};
			});

			return rankedResults;
		}),

	// GET - Event statistics
	getEventStats: protectedProcedure
		.input(z.object({ eventId: z.string() }))
		.query(async ({ ctx, input }) => {
			const statsQuery = await ctx.db
				.select({
					totalParticipants: sql<number>`COUNT(DISTINCT ${participants.id})`,
					totalResponses: sql<number>`COUNT(${responses.id})`,
					totalCorrectAnswers: sql<number>`SUM(CASE WHEN ${responses.isCorrect} = true THEN 1 ELSE 0 END)`,
					totalPoints: sql<number>`COALESCE(SUM(${responses.pointsEarned}), 0)`,
					averageTime: sql<number>`AVG(${responses.timeTaken})`,
					completedSessions: sql<number>`COUNT(CASE WHEN ${participantSessions.isCompleted} = true THEN 1 END)`,
					totalSessions: sql<number>`COUNT(${participantSessions.id})`,
				})
				.from(participants)
				.leftJoin(responses, eq(responses.participantId, participants.id))
				.leftJoin(
					participantSessions,
					and(
						eq(participantSessions.participantId, participants.id),
						eq(participantSessions.eventId, input.eventId),
					),
				)
				.where(eq(participants.eventId, input.eventId));

			const stats = statsQuery[0];

			if (!stats) {
				return {
					totalParticipants: 0,
					totalResponses: 0,
					averageScore: 0,
					highestScore: 0,
					totalCorrectAnswers: 0,
					overallAccuracy: 0,
					averageTime: 0,
					completionRate: 0,
					totalSessions: 0,
					completedSessions: 0,
				};
			}

			const totalResponses = Number(stats.totalResponses) || 0;
			const totalCorrectAnswers = Number(stats.totalCorrectAnswers) || 0;
			const completedSessions = Number(stats.completedSessions) || 0;
			const totalSessions = Number(stats.totalSessions) || 0;

			return {
				totalParticipants: Number(stats.totalParticipants) || 0,
				totalResponses,
				averageScore:
					totalResponses > 0
						? Math.round(Number(stats.totalPoints) / totalResponses)
						: 0,
				highestScore: Number(stats.totalPoints) || 0,
				totalCorrectAnswers,
				overallAccuracy:
					totalResponses > 0
						? Math.round((totalCorrectAnswers / totalResponses) * 100)
						: 0,
				averageTime: Math.round(Number(stats.averageTime) || 0),
				completionRate:
					totalSessions > 0
						? Math.round((completedSessions / totalSessions) * 100)
						: 0,
				totalSessions,
				completedSessions,
			};
		}),
});
