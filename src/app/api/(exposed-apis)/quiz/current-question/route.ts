import { getTokenFromRequest, verifyToken } from "@/lib/auth-utils";
import { db } from "@/server/db";
import {
	participantSessions,
	questions,
	responses,
	rounds,
} from "@/server/db/schema";
import { and, asc, desc, eq } from "drizzle-orm";
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

		const { participantId } = payload;

		// Get the participant's current session
		const [session] = await db
			.select()
			.from(participantSessions)
			.where(eq(participantSessions.participantId, participantId))
			.orderBy(desc(participantSessions.createdAt))
			.limit(1);

		if (!session || !session.roundId) {
			return NextResponse.json(
				{
					error: "No active session found. Please start a round first.",
				},
				{ status: 404 },
			);
		}

		const currentRoundId = session.roundId;

		const [currentRound] = await db
			.select()
			.from(rounds)
			.where(eq(rounds.id, currentRoundId))
			.limit(1);

		if (!currentRound) {
			return NextResponse.json(
				{
					error: "Internal server error: Round not found for the session.",
				},
				{ status: 500 },
			);
		}

		// Get all questions for the current round
		const allQuestions = await db
			.select()
			.from(questions)
			.where(eq(questions.roundId, currentRoundId))
			.orderBy(asc(questions.orderIndex));

		if (allQuestions.length === 0) {
			return NextResponse.json({
				completed: true,
				message: "This round has no questions.",
				progress: {
					current: 0,
					total: 0,
				},
			});
		}

		// Get all answered question IDs for the participant in the current round
		const answeredQuestions = await db
			.select({ questionId: responses.questionId })
			.from(responses)
			.where(
				and(
					eq(responses.participantId, participantId),
					eq(responses.roundId, currentRoundId),
				),
			);

		const answeredQuestionIds = answeredQuestions.map((r) => r.questionId);

		// Find the first unanswered question
		const nextQuestion = allQuestions.find(
			(q) => !answeredQuestionIds.includes(q.id),
		);

		if (!nextQuestion) {
			return NextResponse.json({
				completed: true,
				message: "All questions in this round have been answered.",
				progress: {
					current: allQuestions.length,
					total: allQuestions.length,
				},
			});
		}

		let questionStartTime = session.questionStartedAt;

		// If the current question in the session is not the next unanswered question,
		// it means we need to start the timer for the new question.
		if (session.currentQuestionId !== nextQuestion.id) {
			questionStartTime = new Date();
			await db
				.update(participantSessions)
				.set({
					currentQuestionId: nextQuestion.id,
					questionStartedAt: questionStartTime,
					isOnQuestion: true,
				})
				.where(eq(participantSessions.id, session.id));
		}

		const timeLimitSeconds =
			nextQuestion.useRoundDefault && currentRound.timeLimit
				? currentRound.timeLimit
				: nextQuestion.timeLimit;

		const endTime =
			timeLimitSeconds && questionStartTime
				? new Date(questionStartTime.getTime() + timeLimitSeconds * 1000)
				: null;

		return NextResponse.json({
			questionId: nextQuestion.questionId,
			progress: {
				current: answeredQuestionIds.length + 1,
				total: allQuestions.length,
			},
			timing: {
				startTime: questionStartTime,
				endTime: endTime,
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
