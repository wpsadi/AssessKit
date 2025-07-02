import { getTokenFromRequest, verifyToken } from "@/lib/auth-utils";
import { db } from "@/server/db";
import {
	events,
	participantSessions,
	questions,
	responses,
	rounds,
} from "@/server/db/schema";
import { and, eq } from "drizzle-orm";
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

		let body: { questionId?: string; roundId?: string; answer?: string };
		try {
			body = await request.json();
		} catch (error) {
			return NextResponse.json(
				{ error: "Invalid JSON in request body" },
				{ status: 400 },
			);
		}

		const { questionId, roundId, answer } = body;

		if (!questionId || !roundId || answer === undefined || answer === null) {
			return NextResponse.json(
				{ error: "questionId, roundId, and answer are required" },
				{ status: 400 },
			);
		}

		// Get question details
		const [question] = await db
			.select()
			.from(questions)
			.where(eq(questions.id, questionId))
			.limit(1);

		if (!question) {
			return NextResponse.json(
				{ error: "Question not found" },
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

		// Get event details for proper time calculation
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

		// Get participant session to check timing
		const [session] = await db
			.select()
			.from(participantSessions)
			.where(
				and(
					eq(participantSessions.participantId, payload.participantId),
					eq(participantSessions.roundId, roundId),
				),
			)
			.limit(1);

		let timeTaken: number | null = null;
		let isLate = false;
		let effectiveTimeLimit = 0;

		if (session?.questionStartedAt) {
			const startTime = new Date(session.questionStartedAt).getTime();
			const submitTime = new Date().getTime();
			timeTaken = Math.floor((submitTime - startTime) / 1000); // in seconds

			// Calculate effective time limit properly
			effectiveTimeLimit = question.useRoundDefault
				? round.useEventDuration
					? event.durationMinutes * 60 // Convert minutes to seconds
					: round.timeLimit || 3600 // Use round time limit or default
				: question.timeLimit || 3600;

			if (timeTaken > effectiveTimeLimit) {
				isLate = true;
				// Reject late submissions
				return NextResponse.json(
					{
						error: "Question time limit exceeded. Answer cannot be submitted.",
						isLate: true,
						timeTaken: timeTaken,
						effectiveTimeLimit: effectiveTimeLimit,
					},
					{ status: 408 }, // Request Timeout
				);
			}
		}

		// Check if answer is correct (strict matching with answer IDs)
		const isCorrect = question.answerIds.includes(answer.toString().trim());

		// Calculate points earned
		let pointsEarned = 0;
		if (isCorrect) {
			pointsEarned = question.positivePoints;
		} else {
			pointsEarned = question.negativePoints;
		}

		// If submitted late, could apply penalty (optional)
		// Note: This block is now unreachable since we reject late submissions above
		// if (isLate && isCorrect) {
		//     pointsEarned = Math.floor(pointsEarned * 0.5);
		// }

		// Check if response already exists
		const [existingResponse] = await db
			.select()
			.from(responses)
			.where(
				and(
					eq(responses.participantId, payload.participantId),
					eq(responses.questionId, questionId),
					eq(responses.roundId, roundId),
				),
			)
			.limit(1);

		if (existingResponse) {
			return NextResponse.json(
				{ error: "Response already submitted for this question" },
				{ status: 400 },
			);
		}

		// Insert response
		const [newResponse] = await db
			.insert(responses)
			.values({
				participantId: payload.participantId,
				questionId: questionId,
				roundId: roundId,
				submittedAnswer: answer.toString(),
				isCorrect: isCorrect,
				pointsEarned: pointsEarned,
				timeTaken: timeTaken,
				submittedAt: new Date(),
			})
			.returning();

		// Update session
		await db
			.update(participantSessions)
			.set({
				isOnQuestion: false,
				totalQuestionsAnswered: session
					? session.totalQuestionsAnswered + 1
					: 1,
				lastActivityAt: new Date(),
			})
			.where(
				and(
					eq(participantSessions.participantId, payload.participantId),
					eq(participantSessions.roundId, roundId),
				),
			);

		return NextResponse.json({
			success: true,
			response: {
				id: newResponse?.id,
				isCorrect: isCorrect,
				pointsEarned: pointsEarned,
				timeTaken: timeTaken,
				isLate: isLate,
				effectiveTimeLimit: effectiveTimeLimit,
				correctAnswers: question.answerIds,
			},
		});
	} catch (error) {
		console.error("Submit answer error:", error);
		return NextResponse.json(
			{ error: "Internal server error" },
			{ status: 500 },
		);
	}
}
