import { getTokenFromRequest, verifyToken } from "@/lib/auth-utils";
import { arcProtect } from "@/utils/arcjet";
import { createClient } from "@/utils/supabase/service";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

export async function POST(request: NextRequest) {
	try {
		const token = getTokenFromRequest(request);
		if (!token) {
			return NextResponse.json(
				{
					error: "Authorization token required",
					errmsg: "No token provided",
				},
				{ status: 401 },
			);
		}

		const decision = await arcProtect(2, request);
		if (decision) {
			return decision;
		}

		const payload = verifyToken(token);
		if (!payload) {
			return NextResponse.json(
				{
					error: "Invalid or expired token",
					errmsg: "Token verification failed",
				},
				{ status: 401 },
			);
		}

		const { eventId, participantId } = payload;

		// Validate eventId and participantId
		if (!eventId || !participantId) {
			return NextResponse.json(
				{
					error: "Invalid token payload",
					errmsg: "eventId or participantId missing in token",
				},
				{ status: 400 },
			);
		}
		const supabase = createClient();

		// Helper function to ensure timestamp has Z suffix for UTC
		const ensureUTCTimestamp = (timestamp: string | null): string | null => {
			if (!timestamp) return null;
			return timestamp.endsWith("Z") ? timestamp : `${timestamp}Z`;
		};

		// ensure event timimg has started
		const { data: event, error: eventError } = await supabase
			.from("events")
			.select("*")
			.eq("id", eventId)
			.single();

		if (eventError) {
			return NextResponse.json(
				{
					error: "Failed to fetch event",
					errmsg: eventError.message,
				},
				{ status: 500 },
			);
		}

		if (!event) {
			return NextResponse.json(
				{
					error: "Event not found",
					errmsg: "No event found with the provided ID",
				},
				{ status: 404 },
			);
		}

		// Check if the event has started
		const eventStartDate = ensureUTCTimestamp(event.startDate);
		if (eventStartDate && new Date(eventStartDate) > new Date()) {
			return NextResponse.json(
				{
					error: "Event not started",
					errmsg: "The event has not started yet",
				},
				{ status: 400 },
			);
		}

		// Check if the event has ended
		const eventEndDate = ensureUTCTimestamp(event.endDate);
		if (eventEndDate && new Date(eventEndDate) < new Date()) {
			return NextResponse.json(
				{
					error: "Event has ended",
					errmsg: "The event has already ended",
				},
				{ status: 400 },
			);
		}

		// Get all rounds for the event, ordered by `order_index`

		const { data: allRounds, error: roundsError } = await supabase
			.from("rounds")
			.select("*")
			.eq("event_id", eventId)
			.order("order_index", { ascending: true });

		if (roundsError) {
			return NextResponse.json(
				{
					error: "Failed to fetch rounds",
					msg: roundsError.message,
					errmsg: roundsError.message,
				},
				{ status: 500 },
			);
		}

		if (!allRounds || allRounds.length === 0) {
			return NextResponse.json(
				{
					error: "No rounds found for this event",
					errmsg: "No rounds in DB",
				},
				{ status: 404 },
			);
		}

		const { data: sessions, error: sessionError } = await supabase
			.from("participant_sessions")
			.select("*")
			.eq("participant_id", participantId)
			.eq("event_id", eventId)
			.order("created_at", { ascending: false })
			.limit(1);

		if (sessionError) {
			return NextResponse.json(
				{
					error: "Failed to fetch session",
					errmsg: sessionError.message,
				},
				{ status: 500 },
			);
		}

		const session = sessions?.[0];

		if (!session) {
			// This is the first time the user is starting any round for this event.
			// Start the first round.
			const firstRound = allRounds[0];
			if (!firstRound) {
				return NextResponse.json(
					{
						error: "No rounds configured for this event.",
						errmsg: "No first round found",
					},
					{ status: 404 },
				);
			}

			// Find the first question of the first round
			const { data: firstQuestions, error: firstQuestionError } = await supabase
				.from("questions")
				.select("*")
				.eq("round_id", firstRound.id)
				.order("order_index", { ascending: true })
				.limit(1);

			if (firstQuestionError) {
				return NextResponse.json(
					{
						error: "Failed to fetch first question of first round",
						errmsg: firstQuestionError.message,
					},
					{ status: 500 },
				);
			}

			const firstQuestionOfFirstRound = firstQuestions?.[0];

			const { data: newSessionArr, error: insertError } = await supabase
				.from("participant_sessions")
				.insert([
					{
						participant_id: participantId,
						event_id: eventId,
						round_id: firstRound.id,
						current_question_id: firstQuestionOfFirstRound
							? firstQuestionOfFirstRound.id
							: null,
						is_on_question: !!firstQuestionOfFirstRound,
						question_started_at: firstQuestionOfFirstRound
							? new Date().toISOString()
							: null,
						session_started_at: new Date().toISOString(),
						last_activity_at: new Date().toISOString(),
					},
				])
				.select();

			const newSession = newSessionArr?.[0];

			if (insertError) {
				return NextResponse.json(
					{
						error: "Failed to create session",
						errmsg: insertError.message,
					},
					{ status: 500 },
				);
			}

			return NextResponse.json({
				success: true,
				message: `Round "${firstRound.title}" started.`,
				roundId: firstRound.id,
				sessionId: newSession?.id,
				currentQuestionId: firstQuestionOfFirstRound?.id || null,
			});
		}

		// Check if user is currently in the middle of a round
		if (session.is_on_question && session.current_question_id) {
			return NextResponse.json(
				{
					error:
						"You are currently answering a question. Please complete the current round first.",
					currentRoundId: session.round_id,
					currentQuestionId: session.current_question_id,
				},
				{ status: 400 },
			);
		}

		// The user has an existing session, let's find the next round.
		const currentRoundId = session.round_id;

		// Check if the current round is completed.
		const { count: totalQuestionsCount, error: totalQuestionsError } =
			await supabase
				.from("questions")
				.select("id", { count: "exact", head: true })
				.eq("round_id", currentRoundId);

		if (totalQuestionsError) {
			return NextResponse.json(
				{
					error: "Failed to fetch questions count",
					errmsg: totalQuestionsError.message,
				},
				{ status: 500 },
			);
		}

		const { count: answeredQuestionsCount, error: answeredQuestionsError } =
			await supabase
				.from("responses")
				.select("id", { count: "exact", head: true })
				.eq("participant_id", participantId)
				.eq("round_id", currentRoundId);

		if (answeredQuestionsError) {
			return NextResponse.json(
				{
					error: "Failed to fetch responses count",
					errmsg: answeredQuestionsError.message,
				},
				{ status: 500 },
			);
		}

		if ((answeredQuestionsCount ?? 0) < (totalQuestionsCount ?? 0)) {
			return NextResponse.json(
				{
					error: "Current round is not yet completed.",
					answered: answeredQuestionsCount ?? 0,
					total: totalQuestionsCount ?? 0,
					roundId: currentRoundId,
					errmsg: "Not all questions answered",
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
					errmsg: "Current round not found in allRounds",
				},
				{ status: 500 },
			);
		}

		const nextRound = allRounds[currentRoundIndex + 1];

		if (!nextRound) {
			return NextResponse.json(
				{
					completed: true,
					message: "All rounds have been completed.",
					errmsg: "No next round",
				},
				{ status: 200 },
			);
		}

		// Find the first question of the next round to start it automatically
		const { data: firstQuestions, error: firstQuestionError } = await supabase
			.from("questions")
			.select("*")
			.eq("round_id", nextRound.id)
			.order("order_index", { ascending: true })
			.limit(1);

		if (firstQuestionError) {
			return NextResponse.json(
				{
					error: "Failed to fetch first question of next round",
					errmsg: firstQuestionError.message,
				},
				{ status: 500 },
			);
		}

		const firstQuestionOfNextRound = firstQuestions?.[0];

		// Update the session to the next round.
		const { error: updateError } = await supabase
			.from("participant_sessions")
			.update({
				round_id: nextRound.id,
				current_question_id: firstQuestionOfNextRound
					? firstQuestionOfNextRound.id
					: null,
				is_on_question: !!firstQuestionOfNextRound,
				question_started_at: firstQuestionOfNextRound
					? new Date().toISOString()
					: null,
				last_activity_at: new Date().toISOString(),
			})
			.eq("id", session.id);

		if (updateError) {
			return NextResponse.json(
				{
					error: "Failed to update session for next round",
					errmsg: updateError.message,
				},
				{ status: 500 },
			);
		}

		return NextResponse.json({
			success: true,
			message: `Round "${nextRound.title}" started.`,
			roundId: nextRound.id,
			currentQuestionId: firstQuestionOfNextRound?.id || null,
		});
	} catch (error) {
		console.error("Start round error:", error);
		return NextResponse.json(
			{
				error: "Internal server error",
				errmsg: (error as Error)?.message ?? "Unknown error",
			},
			{ status: 500 },
		);
	}
}
