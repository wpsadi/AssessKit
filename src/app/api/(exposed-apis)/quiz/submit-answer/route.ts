import { getTokenFromRequest, verifyToken } from "@/lib/auth-utils";
import { db } from "@/server/db";
import { updateScores } from "@/server/db/functions";
import {
	participantSessions,
	questions,
	responses,
	rounds,
} from "@/server/db/schema";
import { and, asc, desc, eq } from "drizzle-orm";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

export async function POST(request: NextRequest) {
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

		let body: { questionId?: string; answer?: string };
		try {
			body = await request.json();
		} catch (error) {
			return NextResponse.json(
				{ error: "Invalid JSON in request body" },
				{ status: 400 },
			);
		}

		const { questionId, answer } = body;

		if (!questionId || answer === undefined || answer === null) {
			return NextResponse.json(
				{ error: "questionId and answer are required" },
				{ status: 400 },
			);
		}

		const [session] = await db
			.select()
			.from(participantSessions)
			.where(eq(participantSessions.participantId, participantId))
			.orderBy(desc(participantSessions.createdAt))
			.limit(1);

		if (!session || !session.roundId) {
			return NextResponse.json(
				{
					error:
						"No active session found. Please start a round first.",
				},
				{ status: 404 },
			);
		}

		const currentRoundId = session.roundId;

		// Get all questions for the round to check order
		const allQuestionsForRound = await db
			.select()
			.from(questions)
			.where(eq(questions.roundId, currentRoundId))
			.orderBy(asc(questions.orderIndex));

		const [question] = allQuestionsForRound.filter(
			(q) => q.questionId === questionId,
		);

		if (!question) {
			return NextResponse.json(
				{
					error:
						`Question "${questionId}" not found in the active round`,
				},
				{ status: 404 },
			);
		}

		// Check if previous questions have been answered
		const answeredQuestions = await db
			.select({
				questionId: responses.questionId,
			})
			.from(responses)
			.where(
				and(
					eq(responses.participantId, participantId),
					eq(responses.roundId, currentRoundId),
				),
			);

		if (question.orderIndex !== answeredQuestions.length) {
			return NextResponse.json(
				{
					error: "Questions must be answered in order.",
					expectedQuestionOrder: answeredQuestions.length,
					submittedQuestionOrder: question.orderIndex,
				},
				{ status: 409 }, // Conflict
			);
		}

		// Auto-start the question timer if it hasn't been started yet
		let questionStartTime = session.questionStartedAt;
		if (!questionStartTime || session.currentQuestionId !== question.id) {
			questionStartTime = new Date();
			await db
				.update(participantSessions)
				.set({
					currentQuestionId: question.id,
					questionStartedAt: questionStartTime,
					isOnQuestion: true,
				})
				.where(eq(participantSessions.id, session.id));
		}

		const [existingResponse] = await db
			.select()
			.from(responses)
			.where(
				and(
					eq(responses.participantId, participantId),
					eq(responses.questionId, question.id),
				),
			)
			.limit(1);

		if (existingResponse) {
			return NextResponse.json(
				{ error: "This question has already been answered." },
				{ status: 409 },
			);
		}

		const now = new Date();

		// Auto-start the question timer if it hasn't been started yet
		let actualQuestionStartTime = session.questionStartedAt;
		if (
			!actualQuestionStartTime ||
			session.currentQuestionId !== question.id
		) {
			actualQuestionStartTime = new Date();
			await db
				.update(participantSessions)
				.set({
					currentQuestionId: question.id,
					questionStartedAt: actualQuestionStartTime,
					isOnQuestion: true,
				})
				.where(eq(participantSessions.id, session.id));
		}

		const timeTaken = now.getTime() - actualQuestionStartTime.getTime();

		const [currentRound] = await db
			.select()
			.from(rounds)
			.where(eq(rounds.id, currentRoundId))
			.limit(1);

		if (!currentRound) {
			return NextResponse.json(
				{
					error:
						"Internal server error: Round not found for the session.",
				},
				{ status: 500 },
			);
		}

		const timeLimitSeconds =
			question.useRoundDefault && currentRound.timeLimit
				? currentRound.timeLimit
				: question.timeLimit;

		const isLate = timeLimitSeconds !== null
			? timeTaken > timeLimitSeconds * 1000
			: false;

		const isCorrect = question.answerIds.includes(answer as string);

		let pointsEarned = 0;
		if (!isLate) {
			pointsEarned = isCorrect
				? question.positivePoints
				: -question.negativePoints;
		}

		// Find the next question to automatically enable it
		const nextQuestion = allQuestionsForRound.find(
			(q) => q.orderIndex === question.orderIndex + 1,
		);

		await db
			.update(participantSessions)
			.set({
				isOnQuestion: !!nextQuestion,
				currentQuestionId: nextQuestion ? nextQuestion.id : null,
				questionStartedAt: nextQuestion ? new Date() : null,
				lastActivityAt: now,
				totalQuestionsAnswered: session.totalQuestionsAnswered + 1,
			})
			.where(eq(participantSessions.id, session.id));

		await db.insert(responses).values({
			participantId,
			roundId: currentRoundId,
			questionId: question.id,
			submittedAnswer: answer as string,
			isCorrect,
			pointsEarned,
			timeTaken,
			submittedAt: now,
		});

		await updateScores(
			participantId,
			currentRoundId,
			session.eventId as string,
			pointsEarned,
			isCorrect,
		);

		const remainingTime = timeLimitSeconds !== null
			? Math.max(0, timeLimitSeconds * 1000 - timeTaken)
			: null;

		return NextResponse.json({
			message: "Answer submitted successfully",
			isCorrect,
			pointsEarned,
			isLate,
			timeTaken,
			remainingTime,
		});
	} catch (error) {
		console.error("Error submitting answer:", error);
		return NextResponse.json(
			{ error: "An unexpected error occurred." },
			{ status: 500 },
		);
	}
}
