import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";
import {
	events,
	participants,
	questions,
	responses,
	rounds,
	scores,
} from "@/server/db/schema";
import { and, desc, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";

const createResponseSchema = z.object({
	participantId: z.string(),
	questionId: z.string(),
	roundId: z.string(),
	submittedAnswer: z.string().min(1, "Answer is required"),
	timeTaken: z.number().int().min(0).optional(),
});

const updateResponseSchema = z.object({
	id: z.string(),
	submittedAnswer: z.string().min(1, "Answer is required").optional(),
	pointsEarned: z.number().int().optional(),
	timeTaken: z.number().int().min(0).optional(),
	isCorrect: z.boolean().optional(),
});

const gradeResponseSchema = z.object({
	id: z.string(),
	isCorrect: z.boolean(),
	pointsEarned: z.number().int(),
});

export const responsesRouter = createTRPCRouter({
	// CREATE - Submit new response
	create: protectedProcedure
		.input(createResponseSchema)
		.mutation(async ({ ctx, input }) => {
			return ctx.db.transaction(async (tx) => {
				// Get the question to determine correct answers and points
				const [question] = await tx
					.select()
					.from(questions)
					.where(eq(questions.id, input.questionId))
					.limit(1);

				if (!question) {
					throw new Error("Question not found");
				}

				// get info about event by roundId
				const [round] = await tx
					.select()
					.from(rounds)
					.where(eq(rounds.id, input.roundId))
					.limit(1);

				// Check if answer is correct
				const isCorrect = question.answerIds.includes(
					input.submittedAnswer.toLowerCase().trim(),
				);
				const pointsEarned = isCorrect
					? question.positivePoints
					: question.negativePoints;

				const [newResponse] = await tx
					.insert(responses)
					.values({
						...input,
						isCorrect,
						pointsEarned,
					})
					.returning();

				revalidatePath(
					`/events/${round?.eventId}/participants/${input.participantId}/answers`,
				);

				return newResponse;
			});
		}),

	// READ - Get responses by participant
	getByParticipant: protectedProcedure
		.input(z.object({ participantId: z.string() }))
		.query(async ({ ctx, input }) => {
			return ctx.db
				.select()
				.from(responses)
				.where(eq(responses.participantId, input.participantId))
				.orderBy(desc(responses.submittedAt));
		}),

	// READ - Get responses by question
	getByQuestion: protectedProcedure
		.input(z.object({ questionId: z.string() }))
		.query(async ({ ctx, input }) => {
			return ctx.db
				.select()
				.from(responses)
				.where(eq(responses.questionId, input.questionId))
				.orderBy(desc(responses.submittedAt));
		}),

	// READ - Get responses by round
	getByRound: protectedProcedure
		.input(z.object({ roundId: z.string() }))
		.query(async ({ ctx, input }) => {
			return ctx.db
				.select()
				.from(responses)
				.where(eq(responses.roundId, input.roundId))
				.orderBy(desc(responses.submittedAt));
		}),

	// READ - Get specific participant's response to a question
	getParticipantResponse: protectedProcedure
		.input(
			z.object({
				participantId: z.string(),
				questionId: z.string(),
			}),
		)
		.query(async ({ ctx, input }) => {
			const [response] = await ctx.db
				.select()
				.from(responses)
				.where(
					and(
						eq(responses.participantId, input.participantId),
						eq(responses.questionId, input.questionId),
					),
				)
				.limit(1);

			return response || null;
		}),

	// READ - Get response by ID
	getById: protectedProcedure
		.input(z.object({ id: z.string() }))
		.query(async ({ ctx, input }) => {
			const [response] = await ctx.db
				.select()
				.from(responses)
				.where(eq(responses.id, input.id))
				.limit(1);

			return response || null;
		}),

	// UPDATE - Update response (for manual grading/correction)
	update: protectedProcedure
		.input(updateResponseSchema)
		.mutation(async ({ ctx, input }) => {
			const { id, ...updateData } = input;

			const [updatedResponse] = await ctx.db
				.update(responses)
				.set(updateData)
				.where(eq(responses.id, id))
				.returning();

			// get info about round
			const [round] = await ctx.db
				.select()
				.from(rounds)
				// biome-ignore lint/style/noNonNullAssertion: <explanation>
				.where(eq(rounds.id, updatedResponse?.roundId!))
				.limit(1);
			// revalidatePath
			revalidatePath(
				`/events/${round?.eventId}/participants/${updatedResponse?.participantId}/answers`,
			);

			return updatedResponse;
		}),

	// GRADE - Grade/re-grade a response
	grade: protectedProcedure
		.input(gradeResponseSchema)
		.mutation(async ({ ctx, input }) => {
			const [updatedResponse] = await ctx.db
				.update(responses)
				.set({
					isCorrect: input.isCorrect,
					pointsEarned: input.pointsEarned,
				})
				.where(eq(responses.id, input.id))
				.returning();

			// get info about round
			const [round] = await ctx.db
				.select()
				.from(rounds)
				// biome-ignore lint/style/noNonNullAssertion: <explanation>
				.where(eq(rounds.id, updatedResponse?.roundId!))
				.limit(1);

			// revalidatePath
			revalidatePath(
				`/events/${round?.eventId}/participants/${updatedResponse?.participantId}/answers`,
			);

			return updatedResponse;
		}),

	// DELETE - Delete response
	delete: protectedProcedure
		.input(z.object({ id: z.string() }))
		.mutation(async ({ ctx, input }) => {
			await ctx.db.delete(responses).where(eq(responses.id, input.id));
			// get info about round
			const [response] = await ctx.db
				.select()
				.from(responses)
				.where(eq(responses.id, input.id))
				.limit(1);
			const [round] = await ctx.db
				.select()
				.from(rounds)
				// biome-ignore lint/style/noNonNullAssertion: <explanation>
				.where(eq(rounds.id, response?.roundId!))
				.limit(1);
			return { success: true };
		}),

	// BULK - Grade multiple responses
	// bulkGrade: protectedProcedure
	// 	.input(
	// 		z.object({
	// 			responses: z.array(gradeResponseSchema),
	// 		}),
	// 	)
	// 	.mutation(async ({ ctx, input }) => {
	// 		return ctx.db.transaction(async (tx) => {
	// 			const updatePromises = input.responses.map((response) =>
	// 				tx
	// 					.update(responses)
	// 					.set({
	// 						isCorrect: response.isCorrect,
	// 						pointsEarned: response.pointsEarned,
	// 					})
	// 					.where(eq(responses.id, response.id))
	// 			);

	// 			await Promise.all(updatePromises);
	// 			// Revalidate paths for each response

	// 			return { success: true, updated: input.responses.length };
	// 		});
	// 	}),

	// ANALYTICS - Get response statistics for a question
	getQuestionStats: protectedProcedure
		.input(z.object({ questionId: z.string() }))
		.query(async ({ ctx, input }) => {
			const allResponses = await ctx.db
				.select()
				.from(responses)
				.where(eq(responses.questionId, input.questionId));

			const totalResponses = allResponses.length;
			const correctResponses = allResponses.filter((r) => r.isCorrect).length;
			const averageTime =
				allResponses.reduce((sum, r) => sum + (r.timeTaken || 0), 0) /
				totalResponses;
			const totalPoints = allResponses.reduce(
				(sum, r) => sum + r.pointsEarned,
				0,
			);

			return {
				totalResponses,
				correctResponses,
				incorrectResponses: totalResponses - correctResponses,
				accuracyRate:
					totalResponses > 0 ? (correctResponses / totalResponses) * 100 : 0,
				averageTime: Math.round(averageTime),
				totalPoints,
				averagePoints: totalResponses > 0 ? totalPoints / totalResponses : 0,
			};
		}),
});
