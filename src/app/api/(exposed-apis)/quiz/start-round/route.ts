import { getTokenFromRequest, verifyToken } from "@/lib/auth-utils";
import { db } from "@/server/db";
import {
	participantSessions,
	questions,
	responses,
	rounds,
} from "@/server/db/schema";
import { and, asc, desc, eq, sql } from "drizzle-orm";
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

		const { eventId, participantId } = payload;

		// Get all rounds for the event, ordered by `orderIndex`
		const allRounds = await db
			.select()
			.from(rounds)
			.where(eq(rounds.eventId, eventId))
			.orderBy(asc(rounds.orderIndex));

		if (allRounds.length === 0) {
			return NextResponse.json(
				{ error: "No rounds found for this event" },
				{ status: 404 },
			);
		}

		const [session] = await db
			.select()
			.from(participantSessions)
			.where(
				and(
					eq(participantSessions.participantId, participantId),
					eq(participantSessions.eventId, eventId),
				),
			)
			.orderBy(desc(participantSessions.createdAt))
			.limit(1);

		if (!session) {
			// This is the first time the user is starting any round for this event.
			// Start the first round.
			const firstRound = allRounds[0];
			if (!firstRound) {
				return NextResponse.json(
					{ error: "No rounds configured for this event." },
					{ status: 404 },
				);
			}

			const [newSession] = await db
				.insert(participantSessions)
				.values({
					participantId: participantId,
					eventId: eventId,
					roundId: firstRound.id,
					lastActivityAt: new Date(),
				})
				.returning();

			return NextResponse.json({
				success: true,
				message: `Round \"${firstRound.title}\" started.`,
				roundId: firstRound.id,
				sessionId: newSession?.id,
			});
		}

		// The user has an existing session, let's find the next round.
		const currentRoundId = session.roundId;

		// Check if the current round is completed.
		const totalQuestionsInCurrentRound = await db
			.select({ count: sql<number>`count(*)` })
			.from(questions)
			.where(eq(questions.roundId, currentRoundId));

		const answeredQuestionsInCurrentRound = await db
			.select({ count: sql<number>`count(*)` })
			.from(responses)
			.where(
				and(
					eq(responses.participantId, participantId),
					eq(responses.roundId, currentRoundId),
				),
			);

		if (
			(answeredQuestionsInCurrentRound[0]?.count ?? 0) <
			(totalQuestionsInCurrentRound[0]?.count ?? 0)
		) {
			return NextResponse.json(
				{
					error: "Current round is not yet completed.",
					answered: answeredQuestionsInCurrentRound[0]?.count ?? 0,
					total: totalQuestionsInCurrentRound[0]?.count ?? 0,
					roundId: currentRoundId,
				},
				{ status: 400 },
			);
		}

		// Find the index of the current round in the ordered list of all rounds.
		const currentRoundIndex = allRounds.findIndex(
			(r) => r.id === currentRoundId,
		);

		if (currentRoundIndex === -1) {
			// Should not happen if session exists
			return NextResponse.json(
				{
					error: "Could not find the current round associated with session.",
					roundId: currentRoundId,
				},
				{ status: 500 },
			);
		}

		const nextRound = allRounds[currentRoundIndex + 1];

		if (!nextRound) {
			return NextResponse.json(
				{ completed: true, message: "All rounds have been completed." },
				{ status: 200 },
			);
		}

		// Find the first question of the next round to start it automatically
		const [firstQuestionOfNextRound] = await db
			.select()
			.from(questions)
			.where(eq(questions.roundId, nextRound.id))
			.orderBy(asc(questions.orderIndex))
			.limit(1);

		// Update the session to the next round.
		await db
			.update(participantSessions)
			.set({
				roundId: nextRound.id,
				// Automatically start the first question of the new round
				currentQuestionId: firstQuestionOfNextRound
					? firstQuestionOfNextRound.id
					: null,
				isOnQuestion: !!firstQuestionOfNextRound,
				questionStartedAt: firstQuestionOfNextRound ? new Date() : null,
				lastActivityAt: new Date(),
			})
			.where(eq(participantSessions.id, session.id));

		return NextResponse.json({
			success: true,
			message: `Round \"${nextRound.title}\" started.`,
			roundId: nextRound.id,
		});
	} catch (error) {
		console.error("Start round error:", error);
		return NextResponse.json(
			{ error: "Internal server error" },
			{ status: 500 },
		);
	}
}
