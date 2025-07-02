import { getTokenFromRequest, verifyToken } from "@/lib/auth-utils";
import { db } from "@/server/db";
import {
	events,
	participantSessions,
	questions,
	responses,
	rounds,
} from "@/server/db/schema";
import { and, asc, eq, notInArray } from "drizzle-orm";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

export async function GET(request: NextRequest) {
	try {
		const token = getTokenFromRequest(request);

		if (!token) {
			return NextResponse.json(
				{ error: "Authorization token required" },
				{ status: 401 },
			);
		}

		const payload = verifyToken(token);

		if (!payload) {
			return NextResponse.json(
				{ error: "Invalid or expired token" },
				{ status: 401 },
			);
		}

		const { searchParams } = new URL(request.url);
		const roundId = searchParams.get("roundId");

		if (!roundId) {
			return NextResponse.json(
				{ error: "roundId parameter is required" },
				{ status: 400 },
			);
		}

		// Get all questions for the round
		const allQuestions = await db
			.select()
			.from(questions)
			.where(eq(questions.roundId, roundId))
			.orderBy(asc(questions.orderIndex));

		if (allQuestions.length === 0) {
			return NextResponse.json(
				{ error: "No questions found for this round" },
				{ status: 404 },
			);
		}

		// Get round details
		const [round] = await db
			.select()
			.from(rounds)
			.where(eq(rounds.id, roundId))
			.limit(1);

		if (!round) {
			return NextResponse.json(
				{ error: "Round not found" },
				{
					status: 404,
				},
			);
		}

		// Get event details
		const [event] = await db
			.select()
			.from(events)
			.where(eq(events.id, round.eventId))
			.limit(1);

		if (!event) {
			return NextResponse.json(
				{ error: "Event not found" },
				{
					status: 404,
				},
			);
		}

		// Get already answered questions
		const answeredQuestions = await db
			.select({ questionId: responses.questionId })
			.from(responses)
			.where(
				and(
					eq(responses.participantId, payload.participantId),
					eq(responses.roundId, roundId),
				),
			);

		const answeredQuestionIds = answeredQuestions.map((r) => r.questionId);

		// Find the first unanswered question
		const currentQuestion = allQuestions.find(
			(q) => !answeredQuestionIds.includes(q.id),
		);

		if (!currentQuestion) {
			return NextResponse.json({
				completed: true,
				message: "All questions have been answered",
				totalQuestions: allQuestions.length,
				answeredQuestions: answeredQuestionIds.length,
			});
		}

		// Get or create participant session
		let [session] = await db
			.select()
			.from(participantSessions)
			.where(
				and(
					eq(participantSessions.participantId, payload.participantId),
					eq(participantSessions.roundId, roundId),
				),
			)
			.limit(1);

		if (!session) {
			// Create new session
			[session] = await db
				.insert(participantSessions)
				.values({
					participantId: payload.participantId,
					eventId: payload.eventId,
					roundId: roundId,
					currentQuestionId: currentQuestion.id,
				})
				.returning();
		}

		if (!session) {
			return NextResponse.json(
				{ error: "Failed to create or retrieve session" },
				{ status: 500 },
			);
		}

		// Calculate effective time limit in seconds
		const effectiveTimeLimit = currentQuestion.useRoundDefault
			? round.useEventDuration
				? event.durationMinutes * 60
				: round.timeLimit || 3600
			: currentQuestion.timeLimit || 3600;

		// Calculate time remaining for current question
		let timeRemaining = null;
		let isExpired = false;

		if (session.isOnQuestion && session.questionStartedAt) {
			const now = new Date();
			const questionStartTime = new Date(session.questionStartedAt);
			const elapsedSeconds = Math.floor(
				(now.getTime() - questionStartTime.getTime()) / 1000,
			);
			timeRemaining = Math.max(0, effectiveTimeLimit - elapsedSeconds);
			isExpired = timeRemaining <= 0;
		}

		return NextResponse.json({
			currentQuestion: {
				id: currentQuestion.id,
				questionId: currentQuestion.questionId,
				// answerIds: currentQuestion.answerIds,
				positivePoints: currentQuestion.positivePoints,
				negativePoints: currentQuestion.negativePoints,
				timeLimit: currentQuestion.timeLimit,
				useRoundDefault: currentQuestion.useRoundDefault,
				orderIndex: currentQuestion.orderIndex,
				effectiveTimeLimit: effectiveTimeLimit,
			},
			timing: {
				timeRemaining: timeRemaining,
				isExpired: isExpired,
				questionStartedAt: session.questionStartedAt,
				effectiveTimeLimit: effectiveTimeLimit,
			},
			progress: {
				current: answeredQuestionIds.length + 1,
				total: allQuestions.length,
				answered: answeredQuestionIds.length,
			},
			session: {
				id: session.id,
				isOnQuestion: session.isOnQuestion,
				questionStartedAt: session.questionStartedAt,
			},
			round: {
				id: round.id,
				title: round.title,
				useEventDuration: round.useEventDuration,
				timeLimit: round.timeLimit,
			},
			event: {
				id: event.id,
				title: event.title,
				durationMinutes: event.durationMinutes,
			},
		});
	} catch (error) {
		console.error("Get current question error:", error);
		return NextResponse.json(
			{ error: "Internal server error" },
			{ status: 500 },
		);
	}
}
