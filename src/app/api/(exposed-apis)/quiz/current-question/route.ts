import { getTokenFromRequest, verifyToken } from "@/lib/auth-utils";
import { arcProtect } from "@/utils/arcjet";
import { createClient } from "@/utils/supabase/service";
import { and, asc, desc, eq } from "drizzle-orm";
import { type NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
	try {
		const token = getTokenFromRequest(request);

		if (!token) {
			return NextResponse.json(
				{ error: "Authorization token required" },
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
				{ error: "Invalid or expired token" },
				{ status: 401 },
			);
		}

		const { participantId, eventId } = payload;

		const supabase = createClient();

		// Get the participant's current session
		const { data: sessions, error: sessionError } = await supabase
			.from("participant_sessions")
			.select("*")
			.eq("participant_id", participantId)
			.order("created_at", { ascending: false })
			.limit(1);

		const session = sessions?.[0];

		if (!session || !session.round_id) {
			return NextResponse.json(
				{
					error: "No active session found. Please start a round first.",
				},
				{ status: 404 },
			);
		}

		const currentRoundId = session.round_id;

		const { data: roundsData, error: roundError } = await supabase
			.from("rounds")
			.select("*")
			.eq("id", currentRoundId)
			.eq("event_id", eventId)
			.limit(1);

		const currentRound = roundsData?.[0];

		if (!currentRound) {
			return NextResponse.json(
				{
					error: "Internal server error: Round not found for the session.",
				},
				{ status: 500 },
			);
		}

		// Get all questions for the current round
		const { data: allQuestions, error: questionsError } = await supabase
			.from("questions")
			.select("*")
			.eq("round_id", currentRoundId)
			.order("order_index", { ascending: true });

		if (!allQuestions || allQuestions.length === 0) {
			// No questions in current round, instruct to start next round if available
			// Find the next round (by order or created_at, assuming order_index exists)
			const { data: allRounds } = await supabase
				.from("rounds")
				.select("*")
				.eq("event_id", eventId)
				.order("order_index", { ascending: true });

			const currentRoundIndex =
				allRounds?.findIndex((r) => r.id === currentRoundId) ?? -1;
			const hasNextRound =
				allRounds &&
				currentRoundIndex >= 0 &&
				currentRoundIndex < allRounds.length - 1;

			return NextResponse.json({
				completed: false,
				message: hasNextRound
					? "This round has no questions. Please start the next round."
					: "This round has no questions and there are no more rounds.",
				progress: {
					current: 0,
					total: 0,
				},
			});
		}

		// Get all answered question IDs for the participant in the current round
		const { data: answeredQuestions, error: answeredError } = await supabase
			.from("responses")
			.select("question_id")
			.eq("participant_id", participantId)
			.eq("round_id", currentRoundId);

		const answeredQuestionIds = (answeredQuestions || []).map(
			(r: { question_id: string }) => r.question_id,
		);

		// Find the first unanswered question
		const nextQuestion = allQuestions.find(
			(q: { id: string }) => !answeredQuestionIds.includes(q.id),
		);

		if (!nextQuestion) {
			// All questions in this round have been answered, check for next round
			const { data: allRounds } = await supabase
				.from("rounds")
				.select("*")
				.eq("event_id", eventId)
				.order("order_index", { ascending: true });

			const currentRoundIndex =
				allRounds?.findIndex((r) => r.id === currentRoundId) ?? -1;
			const hasNextRound =
				allRounds &&
				currentRoundIndex >= 0 &&
				currentRoundIndex < allRounds.length - 1;

			console.log(allRounds);

			return NextResponse.json({
				completed: !hasNextRound,
				message: hasNextRound
					? "All questions in this round have been answered. Please start the next round."
					: "All questions in all rounds have been answered.",
				progress: {
					current: allQuestions.length,
					total: allQuestions.length,
				},
			});
		}

		let questionStartedAt = session.question_started_at;

		// If the current question in the session is not the next unanswered question,
		// it means we need to start the timer for the new question.
		if (session.current_question_id !== nextQuestion.id) {
			questionStartedAt = new Date().toISOString();
			await supabase
				.from("participant_sessions")
				.update({
					current_question_id: nextQuestion.id,
					question_started_at: questionStartedAt,
					is_on_question: true,
				})
				.eq("id", session.id);
		}

		const timeLimitSeconds =
			nextQuestion.use_round_default && currentRound.time_limit
				? currentRound.time_limit
				: nextQuestion.time_limit;

		const endTime =
			timeLimitSeconds && questionStartedAt
				? new Date(
						new Date(`${questionStartedAt}Z`).getTime() +
							timeLimitSeconds * 1000,
					).toISOString()
				: null;

		return NextResponse.json({
			question_id: nextQuestion.question_id,
			progress: {
				current: answeredQuestionIds.length + 1,
				total: allQuestions.length,
			},
			timing: {
				start_time: questionStartedAt,
				end_time: endTime,
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
