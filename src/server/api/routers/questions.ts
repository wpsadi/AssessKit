import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";
import {
	events,
	participants,
	questions,
	responses,
	rounds,
	scores,
} from "@/server/db/schema";
import { and, asc, eq, gt, max } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";

const createQuestionSchema = z.object({
	roundId: z.string(),
	questionId: z.string().min(1, "Question ID is required"),
	answerIds: z.array(z.string()).min(1, "At least one answer ID is required"),
	positivePoints: z.number().int().min(0).default(1),
	negativePoints: z.number().int().max(0).default(0),
	timeLimit: z.number().int().min(1).optional(),
	useRoundDefault: z.boolean().default(true),
	orderIndex: z.number().int().min(0).optional(),
});

const updateQuestionSchema = z.object({
	id: z.string(),
	questionId: z.string().min(1, "Question ID is required").optional(),
	answerIds: z
		.array(z.string())
		.min(1, "At least one answer ID is required")
		.optional(),
	positivePoints: z.number().int().min(0).optional(),
	negativePoints: z.number().int().max(0).optional(),
	timeLimit: z.number().int().min(1).optional(),
	useRoundDefault: z.boolean().optional(),
});

const reorderSchema = z.object({
	questions: z.array(
		z.object({
			id: z.string(),
			orderIndex: z.number().int().min(0),
		}),
	),
});

export const questionsRouter = createTRPCRouter({
	// CREATE - Add new question
	create: protectedProcedure
		.input(createQuestionSchema)
		.mutation(async ({ ctx, input }) => {
			const isAdmin = ctx.isAdmin;
			const { orderIndex, ...questionData } = input;

			// Check if questionId already exists in this round
			const existingQuestion = await ctx.db
				.select({ id: questions.id })
				.from(questions)
				.where(
					and(
						eq(questions.roundId, input.roundId),
						eq(questions.questionId, input.questionId),
					),
				)
				.limit(1);

			if (existingQuestion.length > 0) {
				throw new Error(
					`Question ID "${input.questionId}" already exists in this round. Please use a unique question ID.`,
				);
			}

			// If no order specified, get the next available order
			const maxOrder =
				orderIndex ??
				(await ctx.db
					.select({ maxOrder: max(questions.orderIndex) })
					.from(questions)
					.where(eq(questions.roundId, input.roundId))
					.then((result) => (result[0]?.maxOrder ?? -1) + 1));

			const [newQuestion] = await ctx.db
				.insert(questions)
				.values({
					...questionData,
					orderIndex: maxOrder,
				})
				.returning();

			revalidatePath(`rounds/${newQuestion?.roundId}/questions`);

			return newQuestion;
		}),

	// READ - Get all questions for a round
	getByRound: protectedProcedure
		.input(z.object({ roundId: z.string() }))
		.query(async ({ ctx, input }) => {
			return ctx.db
				.select()
				.from(questions)
				.where(eq(questions.roundId, input.roundId))
				.orderBy(asc(questions.orderIndex));
		}),

	// READ - Get question by ID
	getById: protectedProcedure
		.input(z.object({ id: z.string() }))
		.query(async ({ ctx, input }) => {
			const [question] = await ctx.db
				.select()
				.from(questions)
				.where(eq(questions.id, input.id))
				.limit(1);

			return question || null;
		}),

	// UPDATE - Update question
	update: protectedProcedure
		.input(updateQuestionSchema)
		.mutation(async ({ ctx, input }) => {
			const { id, ...updateData } = input;

			// If questionId is being updated, check for uniqueness in the round
			if (updateData.questionId) {
				// First get the current question to know which round it belongs to
				const [currentQuestion] = await ctx.db
					.select({
						roundId: questions.roundId,
						questionId: questions.questionId,
					})
					.from(questions)
					.where(eq(questions.id, id))
					.limit(1);

				if (!currentQuestion) {
					throw new Error("Question not found");
				}

				// Only check for duplicates if the questionId is actually changing
				if (currentQuestion.questionId !== updateData.questionId) {
					const existingQuestion = await ctx.db
						.select({ id: questions.id })
						.from(questions)
						.where(
							and(
								eq(questions.roundId, currentQuestion.roundId),
								eq(questions.questionId, updateData.questionId),
							),
						)
						.limit(1);

					if (existingQuestion.length > 0) {
						throw new Error(
							`Question ID "${updateData.questionId}" already exists in this round. Please use a unique question ID.`,
						);
					}
				}
			}

			const [updatedQuestion] = await ctx.db
				.update(questions)
				.set({
					...updateData,
					updatedAt: new Date(),
				})
				.where(eq(questions.id, id))
				.returning();

			revalidatePath(`rounds/${updatedQuestion?.roundId}/questions`);

			return updatedQuestion;
		}),

	// DELETE - Delete question and adjust order of remaining questions
	delete: protectedProcedure
		.input(z.object({ id: z.string() }))
		.mutation(async ({ ctx, input }) => {
			return ctx.db.transaction(async (tx) => {
				// Get the question to be deleted
				const [questionToDelete] = await tx
					.select({
						orderIndex: questions.orderIndex,
						roundId: questions.roundId,
					})
					.from(questions)
					.where(eq(questions.id, input.id))
					.limit(1);

				if (!questionToDelete) {
					throw new Error("Question not found");
				}

				// Delete the question
				await tx.delete(questions).where(eq(questions.id, input.id));

				// Update order of remaining questions in the same round
				await tx
					.update(questions)
					.set({ orderIndex: questionToDelete.orderIndex - 1 })
					.where(gt(questions.orderIndex, questionToDelete.orderIndex));

				revalidatePath(`rounds/${questionToDelete.roundId}/questions`);

				return { success: true };
			});
		}),

	// REORDER - Update order of multiple questions
	reorder: protectedProcedure
		.input(reorderSchema)
		.mutation(async ({ ctx, input }) => {
			return ctx.db.transaction(async (tx) => {
				// get questionData as it contains the roundId
				const [firstQuestion] = await tx
					.select({ roundId: questions.roundId })
					.from(questions)
					// biome-ignore lint/style/noNonNullAssertion: <explanation>
					.where(eq(questions.id, input.questions[0]?.id!))
					.limit(1);

				const updatePromises = input.questions.map((question) =>
					tx
						.update(questions)
						.set({
							orderIndex: question.orderIndex,
							updatedAt: new Date(),
						})
						.where(eq(questions.id, question.id)),
				);

				await Promise.all(updatePromises);
				// Revalidate the path to refresh question list
				revalidatePath(`rounds/${firstQuestion?.roundId}/questions`);

				return { success: true };
			});
		}),

	// UTILITY - Move question up in order
	moveUp: protectedProcedure
		.input(z.object({ id: z.string() }))
		.mutation(async ({ ctx, input }) => {
			return ctx.db.transaction(async (tx) => {
				const [currentQuestion] = await tx
					.select({
						orderIndex: questions.orderIndex,
						roundId: questions.roundId,
					})
					.from(questions)
					.where(eq(questions.id, input.id))
					.limit(1);

				if (!currentQuestion || currentQuestion.orderIndex === 0) {
					throw new Error("Cannot move question up");
				}

				// Find the question above
				const [upperQuestion] = await tx
					.select()
					.from(questions)
					.where(eq(questions.orderIndex, currentQuestion.orderIndex - 1))
					.limit(1);

				if (!upperQuestion) {
					throw new Error("No question to swap with");
				}

				// Swap orders
				await tx
					.update(questions)
					.set({
						orderIndex: upperQuestion.orderIndex,
						updatedAt: new Date(),
					})
					.where(eq(questions.id, input.id));

				await tx
					.update(questions)
					.set({
						orderIndex: currentQuestion.orderIndex,
						updatedAt: new Date(),
					})
					.where(eq(questions.id, upperQuestion.id));

				revalidatePath(`rounds/${currentQuestion.roundId}/questions`);
				return { success: true };
			});
		}),

	// UTILITY - Move question down in order
	moveDown: protectedProcedure
		.input(z.object({ id: z.string() }))
		.mutation(async ({ ctx, input }) => {
			return ctx.db.transaction(async (tx) => {
				const [currentQuestion] = await tx
					.select({
						orderIndex: questions.orderIndex,
						roundId: questions.roundId,
					})
					.from(questions)
					.where(eq(questions.id, input.id))
					.limit(1);

				if (!currentQuestion) {
					throw new Error("Question not found");
				}

				// Find the question below
				const [lowerQuestion] = await tx
					.select()
					.from(questions)
					.where(eq(questions.orderIndex, currentQuestion.orderIndex + 1))
					.limit(1);

				if (!lowerQuestion) {
					throw new Error("No question to swap with");
				}

				// Swap orders
				await tx
					.update(questions)
					.set({
						orderIndex: lowerQuestion.orderIndex,
						updatedAt: new Date(),
					})
					.where(eq(questions.id, input.id));

				await tx
					.update(questions)
					.set({
						orderIndex: currentQuestion.orderIndex,
						updatedAt: new Date(),
					})
					.where(eq(questions.id, lowerQuestion.id));

				revalidatePath(`rounds/${currentQuestion.roundId}/questions`);
				return { success: true };
			});
		}),

	// BULK - Create multiple questions
	bulkCreate: protectedProcedure
		.input(
			z.object({
				roundId: z.string(),
				questions: z.array(
					z.object({
						questionId: z.string().min(1, "Question ID is required"),
						answerIds: z
							.array(z.string())
							.min(1, "At least one answer ID is required"),
						positivePoints: z.number().int().min(0).default(1),
						negativePoints: z.number().int().max(0).default(0),
						timeLimit: z.number().int().min(1).optional(),
						useRoundDefault: z.boolean().default(true),
					}),
				),
			}),
		)
		.mutation(async ({ ctx, input }) => {
			return ctx.db.transaction(async (tx) => {
				const createdQuestions = [];
				const usedQuestionIds = new Set<string>();

				// Check for duplicates within the input first
				for (const question of input.questions) {
					if (usedQuestionIds.has(question.questionId)) {
						throw new Error(
							`Duplicate question ID "${question.questionId}" found in the input. Each question ID must be unique.`,
						);
					}
					usedQuestionIds.add(question.questionId);
				}

				// Check for existing question IDs in the round
				const existingQuestionIds = await tx
					.select({ questionId: questions.questionId })
					.from(questions)
					.where(eq(questions.roundId, input.roundId));

				const existingIds = new Set(
					existingQuestionIds.map((q) => q.questionId),
				);

				for (const question of input.questions) {
					if (existingIds.has(question.questionId)) {
						throw new Error(
							`Question ID "${question.questionId}" already exists in this round. Please use unique question IDs.`,
						);
					}
				}

				for (let i = 0; i < input.questions.length; i++) {
					const question = input.questions[i];

					if (!question) {
						continue; // Skip if question is undefined
					}

					// Get next order index
					const maxOrder = await tx
						.select({ maxOrder: max(questions.orderIndex) })
						.from(questions)
						.where(eq(questions.roundId, input.roundId))
						.then((result) => (result[0]?.maxOrder ?? -1) + 1);

					const [newQuestion] = await tx
						.insert(questions)
						.values({
							roundId: input.roundId,
							questionId: question.questionId,
							answerIds: question.answerIds,
							positivePoints: question.positivePoints,
							negativePoints: question.negativePoints,
							timeLimit: question.timeLimit,
							useRoundDefault: question.useRoundDefault,
							orderIndex: maxOrder + i,
						})
						.returning();

					createdQuestions.push(newQuestion);
				}

				// Revalidate the path to refresh question list
				revalidatePath(`rounds/${input.roundId}/questions`);
				return {
					success: true,
					created: createdQuestions.length,
					questions: createdQuestions,
				};
			});
		}),
});
