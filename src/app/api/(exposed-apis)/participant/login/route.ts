import { generateToken } from "@/lib/auth-utils";
import {
	isValidEmail,
	isValidUUID,
	sanitizeString,
	validateRequiredFields,
} from "@/lib/validation-utils";
import { db } from "@/server/db";
import {
	events,
	participantSessions,
	participants,
	rounds,
} from "@/server/db/schema";
import { and, eq } from "drizzle-orm";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

export async function POST(request: NextRequest) {
	try {
		let body: { email?: string; password?: string; eventId?: string };
		try {
			body = await request.json();
		} catch (error) {
			return NextResponse.json(
				{ error: "Invalid JSON in request body" },
				{ status: 400 },
			);
		}

		const { email, password, eventId } = body;

		// Validate required fields
		const fieldError = validateRequiredFields(body, [
			"email",
			"password",
			"eventId",
		]);
		if (fieldError) {
			return NextResponse.json({ error: fieldError }, { status: 400 });
		}

		// Type assertion after validation
		const validEmail = email as string;
		const validPassword = password as string;
		const validEventId = eventId as string;

		// Validate email format
		if (!isValidEmail(validEmail)) {
			return NextResponse.json(
				{ error: "Invalid email format" },
				{ status: 400 },
			);
		}

		// Validate UUID format
		if (!isValidUUID(validEventId)) {
			return NextResponse.json(
				{ error: "Invalid eventId format" },
				{ status: 400 },
			);
		}

		// Sanitize inputs
		const sanitizedEmail = sanitizeString(validEmail);
		const sanitizedPassword = sanitizeString(validPassword);

		// Find participant by email and eventId
		const [participant] = await db
			.select()
			.from(participants)
			.where(
				and(
					eq(participants.email, sanitizedEmail),
					eq(participants.eventId, validEventId),
					eq(participants.isActive, true),
				),
			)
			.limit(1);

		if (!participant) {
			return NextResponse.json(
				{ error: "Invalid credentials or event not found" },
				{ status: 401 },
			);
		}

		// Check if the event has started
		const [event] = await db
			.select()
			.from(events)
			.where(eq(events.id, validEventId))
			.limit(1);

		if (!event) {
			// This should technically not happen if a participant exists for the event
			return NextResponse.json(
				{ error: "Event not found" },
				{
					status: 404,
				},
			);
		}

		if (event.startDate && new Date(event.startDate) > new Date()) {
			return NextResponse.json(
				{
					error: "Event has not started yet.",
					startDate: event.startDate,
				},
				{ status: 403 }, // Forbidden
			);
		}

		// Check password (in production, this should be hashed)
		if (participant.password !== sanitizedPassword) {
			return NextResponse.json(
				{ error: "Invalid credentials" },
				{ status: 401 },
			);
		}

		// Generate token
		const token = generateToken({
			participantId: participant.id,
			eventId: participant.eventId,
			email: participant.email,
			name: participant.name,
		});

		// Auto-detect active round and initialize session if this is the first login
		const [activeRound] = await db
			.select()
			.from(rounds)
			.where(
				and(eq(rounds.eventId, participant.eventId), eq(rounds.isActive, true)),
			)
			.limit(1);

		let sessionInfo = null;
		if (activeRound) {
			// Check if participant already has a session for this round
			const [existingSession] = await db
				.select()
				.from(participantSessions)
				.where(
					and(
						eq(participantSessions.participantId, participant.id),
						eq(participantSessions.roundId, activeRound.id),
					),
				)
				.limit(1);

			if (!existingSession) {
				// Create a new session for first-time login
				const [newSession] = await db
					.insert(participantSessions)
					.values({
						participantId: participant.id,
						eventId: participant.eventId,
						roundId: activeRound.id,
						// Don't set currentQuestionId here - let start-question handle that
						isOnQuestion: false,
						sessionStartedAt: new Date(),
						lastActivityAt: new Date(),
					})
					.returning();

				if (newSession) {
					sessionInfo = {
						sessionId: newSession.id,
						roundId: activeRound.id,
						roundTitle: activeRound.title,
						isNewSession: true,
					};
				}
			} else {
				sessionInfo = {
					sessionId: existingSession.id,
					roundId: activeRound.id,
					roundTitle: activeRound.title,
					isNewSession: false,
				};
			}
		}

		return NextResponse.json({
			success: true,
			token,
			participant: {
				id: participant.id,
				name: participant.name,
				email: participant.email,
				eventId: participant.eventId,
			},
			session: sessionInfo,
		});
	} catch (error) {
		console.error("Login error:", error);
		return NextResponse.json(
			{ error: "Internal server error" },
			{ status: 500 },
		);
	}
}
