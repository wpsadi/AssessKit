import { getTokenFromRequest, verifyToken } from "@/lib/auth-utils";
import { db } from "@/server/db";
import {
	events,
	participantSessions,
	questions,
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

		let body: { questionId?: string; roundId?: string };
		try {
			body = await request.json();
		} catch (error) {
			return NextResponse.json(
				{ error: "Invalid JSON in request body" },
				{ status: 400 },
			);
		}

		const { questionId, roundId } = body;

		if (!questionId || !roundId) {
			return NextResponse.json(
				{ error: "questionId and roundId are required" },
				{ status: 400 },
			);
		}

		// Check if there's an existing session and if the current question time limit has expired
		const existingSession = await db
			.select()
			.from(participantSessions)
			.where(
				and(
					eq(participantSessions.participantId, payload.participantId),
					eq(participantSessions.roundId, roundId),
				),
			)
			.limit(1);

		// If there's an active session on a question, check if it's expired
		if (
			existingSession.length > 0 &&
			existingSession[0]?.isOnQuestion &&
			existingSession[0]?.questionStartedAt &&
			existingSession[0]?.currentQuestionId
		) {
			// Get question details to calculate time limit
			const [question] = await db
				.select()
				.from(questions)
				.where(eq(questions.id, existingSession[0].currentQuestionId))
				.limit(1);

			if (question) {
				// Get round and event details for time limit calculation
				const [round] = await db
					.select()
					.from(rounds)
					.where(eq(rounds.id, roundId))
					.limit(1);

				if (round) {
					const [event] = await db
						.select()
						.from(events)
						.where(eq(events.id, round.eventId))
						.limit(1);

					if (event) {
						const effectiveTimeLimit = question.useRoundDefault
							? round.useEventDuration
								? event.durationMinutes * 60
								: round.timeLimit || 3600
							: question.timeLimit || 3600;

						const now = new Date();
						const questionStartTime = new Date(
							existingSession[0].questionStartedAt,
						);
						const elapsedSeconds = Math.floor(
							(now.getTime() - questionStartTime.getTime()) / 1000,
						);

						if (elapsedSeconds >= effectiveTimeLimit) {
							return NextResponse.json(
								{
									error:
										"Previous question time limit has expired. Cannot start new question until current question is completed or skipped.",
									timeExpired: true,
									elapsedSeconds,
									effectiveTimeLimit,
								},
								{ status: 429 }, // Too Many Requests
							);
						}
					}
				}
			}
		}

		// Get question details for the new question being started
		const [newQuestion] = await db
			.select()
			.from(questions)
			.where(eq(questions.id, questionId))
			.limit(1);

		if (!newQuestion) {
			return NextResponse.json(
				{ error: "Question not found" },
				{ status: 404 },
			);
		}

		// Get round and event details for time limit calculation
		const [round] = await db
			.select()
			.from(rounds)
			.where(eq(rounds.id, roundId))
			.limit(1);

		if (!round) {
			return NextResponse.json({ error: "Round not found" }, { status: 404 });
		}

		const [event] = await db
			.select()
			.from(events)
			.where(eq(events.id, round.eventId))
			.limit(1);

		if (!event) {
			return NextResponse.json({ error: "Event not found" }, { status: 404 });
		}

		// Calculate effective time limit for the new question
		const effectiveTimeLimit = newQuestion.useRoundDefault
			? round.useEventDuration
				? event.durationMinutes * 60
				: round.timeLimit || 3600
			: newQuestion.timeLimit || 3600;

		// Update participant session to mark they're viewing the question
		const updatedSession = await db
			.update(participantSessions)
			.set({
				currentQuestionId: questionId,
				isOnQuestion: true,
				questionStartedAt: new Date(),
				lastActivityAt: new Date(),
			})
			.where(
				and(
					eq(participantSessions.participantId, payload.participantId),
					eq(participantSessions.roundId, roundId),
				),
			)
			.returning();

		if (updatedSession.length === 0) {
			// Create session if it doesn't exist
			const [newSession] = await db
				.insert(participantSessions)
				.values({
					participantId: payload.participantId,
					eventId: payload.eventId,
					roundId: roundId,
					currentQuestionId: questionId,
					isOnQuestion: true,
					questionStartedAt: new Date(),
					lastActivityAt: new Date(),
				})
				.returning();

			if (!newSession) {
				return NextResponse.json(
					{ error: "Failed to create session" },
					{ status: 500 },
				);
			}

			return NextResponse.json({
				success: true,
				session: {
					id: newSession.id,
					questionStartedAt: newSession.questionStartedAt,
					isOnQuestion: newSession.isOnQuestion,
				},
				timing: {
					effectiveTimeLimit: effectiveTimeLimit,
					timeRemaining: effectiveTimeLimit,
					questionStartedAt: newSession.questionStartedAt,
				},
			});
		}

		const currentSession = updatedSession[0];
		if (!currentSession) {
			return NextResponse.json(
				{ error: "Failed to update session" },
				{ status: 500 },
			);
		}

		return NextResponse.json({
			success: true,
			session: {
				id: currentSession.id,
				questionStartedAt: currentSession.questionStartedAt,
				isOnQuestion: currentSession.isOnQuestion,
			},
			timing: {
				effectiveTimeLimit: effectiveTimeLimit,
				timeRemaining: effectiveTimeLimit,
				questionStartedAt: currentSession.questionStartedAt,
			},
		});
	} catch (error) {
		console.error("Start question error:", error);
		return NextResponse.json(
			{ error: "Internal server error" },
			{ status: 500 },
		);
	}
}
