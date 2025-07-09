import { generateToken } from "@/lib/auth-utils";
import {
	isValidEmail,
	isValidUUID,
	sanitizeString,
	validateRequiredFields,
} from "@/lib/validation-utils";
import { arcProtect } from "@/utils/arcjet";
import { createClient } from "@/utils/supabase/service";
import { type NextRequest, NextResponse } from "next/server";

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

		const decision = await arcProtect(20, request);
		if (decision) {
			return decision;
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

		const supabase = createClient();

		// Find participant by email and eventId using Supabase
		const { data: participant, error: participantError } = await supabase
			.from("participants")
			.select("*")
			.match({
				email: sanitizedEmail,
				event_id: validEventId,
				is_active: true,
			})
			.single();

		console.log("Participant data:", participant, "Error:", participantError);

		if (participantError || !participant) {
			return NextResponse.json(
				{ error: "Invalid credentials or event not found" },
				{ status: 401 },
			);
		}

		// Check if the event has started using Supabase
		const { data: event, error: eventError } = await supabase
			.from("events")
			.select("*")
			.eq("id", validEventId)
			.single();

		if (eventError || !event) {
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
			eventId: participant.event_id,
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
