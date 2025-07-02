import { generateToken } from "@/lib/auth-utils";
import {
	isValidEmail,
	isValidUUID,
	sanitizeString,
	validateRequiredFields,
} from "@/lib/validation-utils";
import { db } from "@/server/db";
import { participants } from "@/server/db/schema";
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

		return NextResponse.json({
			success: true,
			token,
			participant: {
				id: participant.id,
				name: participant.name,
				email: participant.email,
				eventId: participant.eventId,
			},
		});
	} catch (error) {
		console.error("Login error:", error);
		return NextResponse.json(
			{ error: "Internal server error" },
			{ status: 500 },
		);
	}
}
