import { getTokenFromRequest, verifyToken } from "@/lib/auth-utils";
import { arcProtect } from "@/utils/arcjet";
import { createClient } from "@/utils/supabase/service";
import {  type NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
	try {
		const supabase = createClient();
		const token = getTokenFromRequest(request);
		if (!token) {
			return NextResponse.json(
				{ error: "Authorization token required" },
				{ status: 401 },
			);
		}

		const decision = await arcProtect(2, request);
		if (decision ) {
			return decision;
		}

		const payload = verifyToken(token);
		if (!payload) {
			return NextResponse.json(
				{ error: "Invalid or expired token" },
				{
					status: 401,
				},
			);
		}

		const { participantId } = payload;

		let body: { questionId?: string; answer?: string };
		try {
			body = await request.json();
		} catch {
			return NextResponse.json(
				{ error: "Invalid JSON in request body" },
				{ status: 400 },
			);
		}

		const { questionId, answer } = body;
		if (
			!questionId ||
			typeof questionId !== "string" ||
			answer === undefined ||
			answer === null
		) {
			return NextResponse.json(
				{
					error: "questionId and answer are required",
				},
				{ status: 400 },
			);
		}

		const { data: session, error: sessionError } = await supabase
			.from("participant_sessions")
			.select("*")
			.eq("participant_id", participantId)
			.order("created_at", { ascending: false })
			.limit(1)
			.single();

		if (sessionError || !session || !session.round_id) {
			return NextResponse.json(
				{
					error: "No active session found. Please start a round first.",
				},
				{ status: 404 },
			);
		}

		const currentRoundId = session.round_id;
		const eventId = session.event_id;

		const { data: allQuestionsForRound, error: qErr } = await supabase
			.from("questions")
			.select("*")
			.eq("round_id", currentRoundId)
			.order("order_index", { ascending: true });

		if (qErr || !allQuestionsForRound) {
			return NextResponse.json(
				{
					error: "Could not fetch questions for round.",
				},
				{ status: 500 },
			);
		}

		const { data: currentRound, error: roundErr } = await supabase
			.from("rounds")
			.select("*")
			.eq("id", currentRoundId)
			.eq("event_id", eventId)
			.single();

		if (roundErr || !currentRound) {
			return NextResponse.json(
				{
					error: "Round not found for the session.",
				},
				{ status: 500 },
			);
		}

		const { data: answeredQuestions, error: ansErr } = await supabase
			.from("responses")
			.select("question_id")
			.eq("participant_id", participantId)
			.eq("round_id", currentRoundId);

		if (ansErr) {
			return NextResponse.json(
				{ error: "Could not fetch responses." },
				{
					status: 500,
				},
			);
		}

		if (answeredQuestions.length >= allQuestionsForRound.length) {
			const { data: moreRounds, error: moreRoundsErr } = await supabase
				.from("rounds")
				.select("id")
				.eq("event_id", eventId)
				.gt("order_index", currentRound.order_index)
				.order("order_index", { ascending: true })
				.limit(1);

			if (moreRoundsErr) {
				return NextResponse.json(
					{
						error: "Could not check for next round.",
					},
					{ status: 500 },
				);
			}

			if (moreRounds && moreRounds.length > 0) {
				return NextResponse.json(
					{
						error: "This round is over. Please move to the next round.",
						roundStatus: "over",
						nextStep: "start-next-round",
					},
					{ status: 409 },
				);
			}

			// Event is over - mark session as completed
			await supabase
				.from("participant_sessions")
				.update({
					is_completed: true,
					is_on_question: false,
					current_question_id: null,
					question_started_at: null,
				})
				.eq("id", session.id);

			return NextResponse.json(
				{
					message: "Event is over. No more rounds available.",
					roundStatus: "event-over",
					nextStep: null,
				},
				{ status: 200 },
			);
		}

		const question = allQuestionsForRound.find(
			(q) => String(q.question_id) === String(questionId),
		);
		if (!question) {
			return NextResponse.json(
				{
					error: `Question \"${questionId}\" not found in the active round`,
				},
				{ status: 404 },
			);
		}

		if (question.order_index !== answeredQuestions.length) {
			return NextResponse.json(
				{
					error: "Questions must be answered in order.",
					expectedQuestionOrder: answeredQuestions.length,
					submittedQuestionOrder: question.order_index,
				},
				{ status: 409 },
			);
		}

		if (session.current_question_id !== question.id) {
			return NextResponse.json(
				{
					error:
						"This is not the current question. Please answer questions in order.",
					expectedQuestionId: session.current_question_id,
					submittedQuestionId: question.id,
				},
				{ status: 409 },
			);
		}

		if (!session.question_started_at) {
			return NextResponse.json(
				{
					error: "Session does not have a valid start time for the question.",
				},
				{ status: 500 },
			);
		}

		const { data: existingResponse } = await supabase
			.from("responses")
			.select("*")
			.eq("participant_id", participantId)
			.eq("question_id", question.id)
			.maybeSingle();

		if (existingResponse) {
			return NextResponse.json(
				{
					error: "This question has already been answered.",
				},
				{ status: 409 },
			);
		}

		const submittedAt = new Date();
		const startedAt = new Date(`${session.question_started_at}Z`);
		console.log(
			"Submitted At:",
			submittedAt,
			"Started At:",
			startedAt,
			"Raw:",
			session.question_started_at,
		);
		const timeTaken = Math.max(
			0,
			Math.floor((submittedAt.getTime() - startedAt.getTime()) / 1000),
		);

		let timeLimitSeconds: number | null = null;
		if (question.use_round_default && currentRound.time_limit != null) {
			timeLimitSeconds = Number(currentRound.time_limit) * 60;
		} else if (question.time_limit != null) {
			timeLimitSeconds = Number(question.time_limit);
		}

		let isLate = false;
		let remainingTime: number | null = null;
		if (timeLimitSeconds !== null) {
			isLate = timeTaken > timeLimitSeconds;
			remainingTime = Math.max(0, timeLimitSeconds - timeTaken);
		}

		const submittedAnswer = String(answer);
		let isCorrect = false;
		let pointsEarned = 0;

		if (submittedAnswer.trim() === "") {
			isCorrect = false;
			pointsEarned = 0;
		} else {
			isCorrect = (question.answer_ids as string[])
				.map(String)
				.includes(submittedAnswer);
			if (!isLate) {
				pointsEarned = isCorrect
					? Number(question.positive_points)
					: -Number(question.negative_points);
			}
		}

		const nextQuestion = allQuestionsForRound.find(
			(q) => q.order_index === question.order_index + 1,
		);

		await supabase
			.from("participant_sessions")
			.update({
				is_on_question: !!nextQuestion,
				current_question_id: nextQuestion ? nextQuestion.id : null,
				question_started_at: nextQuestion ? new Date().toISOString() : null,
				total_questions_answered:
					Number(session.total_questions_answered || 0) + 1,
			})
			.eq("id", session.id);

		const { error: insertError } = await supabase.from("responses").insert({
			participant_id: participantId,
			round_id: currentRoundId,
			question_id: question.id,
			submitted_answer: submittedAnswer,
			is_correct: isCorrect,
			points_earned: pointsEarned,
			time_taken: timeTaken,
			submitted_at: submittedAt.toISOString(),
		});

		if (insertError) {
			if (
				insertError.code === "23505" ||
				insertError.message?.toLowerCase().includes("duplicate")
			) {
				return NextResponse.json(
					{
						error: "This question has already been answered.",
					},
					{ status: 409 },
				);
			}
			return NextResponse.json(
				{
					error: "Failed to record response.",
					detail: insertError.message,
				},
				{ status: 500 },
			);
		}

		if (!nextQuestion) {
			const { data: moreRounds, error: moreRoundsErr } = await supabase
				.from("rounds")
				.select("id")
				.eq("event_id", eventId)
				.gt("order_index", currentRound.order_index)
				.order("order_index", { ascending: true })
				.limit(1);

			if (moreRoundsErr) {
				return NextResponse.json(
					{
						error: "Could not check for next round.",
					},
					{ status: 500 },
				);
			}

			if (moreRounds && moreRounds.length > 0) {
				return NextResponse.json({
					message: "All questions are answered for this round.",
					isCorrect,
					pointsEarned,
					isLate,
					timeTaken,
					remainingTime,
					roundStatus: "over",
					nextStep: "start-next-round",
				});
			}

			// Event is over - mark session as completed
			await supabase
				.from("participant_sessions")
				.update({
					is_completed: true,
					is_on_question: false,
					current_question_id: null,
					question_started_at: null,
				})
				.eq("id", session.id);

			return NextResponse.json({
				message: "All questions are answered and event is over.",
				isCorrect,
				pointsEarned,
				isLate,
				timeTaken,
				remainingTime,
				roundStatus: "event-over",
				nextStep: null,
			});
		}

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
			{
				status: 500,
			},
		);
	}
}
