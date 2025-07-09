import { and, eq, gt, max } from "drizzle-orm";
import { z } from "zod";

import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";
import { rounds } from "@/server/db/schema";
import { revalidatePath } from "next/cache";

const createRoundSchema = z.object({
	eventId: z.string(),
	title: z.string().min(1, "Title is required"),
	description: z.string().optional(),
	timeLimit: z.number().int().positive().optional(), // minutes
	useEventDuration: z.boolean().default(false),
	orderIndex: z.number().int().min(0).optional(),
});

const updateRoundSchema = z.object({
	id: z.string(),
	title: z.string().min(1, "Title is required").optional(),
	description: z.string().optional(),
	timeLimit: z.number().int().positive().optional(),
	useEventDuration: z.boolean().optional(),
	isActive: z.boolean().optional(),
});

const reorderSchema = z.object({
	rounds: z.array(
		z.object({
			id: z.string(),
			orderIndex: z.number().int().min(0),
		}),
	),
});

export const roundsRouter = createTRPCRouter({
	// Public endpoint for getting rounds (for leaderboard)
	getPublicRounds: protectedProcedure
		.input(z.object({ eventId: z.string() }))
		.query(async ({ ctx, input }) => {
			const rounds = await ctx.db.query.rounds.findMany({
				where: (rounds, { eq }) => eq(rounds.eventId, input.eventId),
				orderBy: (rounds, { asc }) => asc(rounds.orderIndex),
				columns: {
					id: true,
					title: true,
					description: true,
					timeLimit: true,
					useEventDuration: true,
					isActive: true,
					orderIndex: true,
					eventId: true,
					createdAt: true,
					updatedAt: true,
				},
			});

			return rounds;
		}),

	// Get all rounds for a specific event
	getRounds: protectedProcedure
		.input(z.object({ eventId: z.string() }))
		.query(async ({ ctx, input }) => {
			// First verify the user owns the event
			const event = await ctx.db.query.events.findFirst({
				where: (events, { eq, and }) =>
					and(
						eq(events.id, input.eventId),
						eq(events.organizerId, ctx.user.id),
					),
			});

			if (!event) {
				throw new Error("Event not found or unauthorized");
			}

			const rounds = await ctx.db.query.rounds.findMany({
				where: (rounds, { eq }) => eq(rounds.eventId, input.eventId),
				orderBy: (rounds, { asc }) => asc(rounds.orderIndex),
				with: {
					questions: {
						columns: {
							id: true,
						},
					},
				},
			});

			// Transform to include question counts
			const roundsWithCounts = rounds.map((round) => ({
				...round,
				questionCount: round.questions.length,
			}));

			return roundsWithCounts;
		}),

	// Get single round by ID
	getRound: protectedProcedure
		.input(z.object({ id: z.string() }))
		.query(async ({ ctx, input }) => {
			const round = await ctx.db.query.rounds.findFirst({
				where: (rounds, { eq }) => eq(rounds.id, input.id),
				with: {
					event: {
						columns: {
							id: true,
							organizerId: true,
							title: true,
							durationMinutes: true,
						},
					},
					questions: {
						columns: {
							id: true,
						},
					},
				},
			});

			if (!round) {
				throw new Error("Round not found");
			}

			// Check if user owns the event
			if (round.event.organizerId !== ctx.user.id) {
				throw new Error("Unauthorized");
			}

			return {
				...round,
				questionCount: round.questions.length,
			};
		}),

	// Create new round
	createRound: protectedProcedure
		.input(createRoundSchema)
		.mutation(async ({ ctx, input }) => {
			// Verify user owns the event
			const event = await ctx.db.query.events.findFirst({
				where: (events, { eq, and }) =>
					and(
						eq(events.id, input.eventId),
						eq(events.organizerId, ctx.user.id),
					),
			});

			if (!event) {
				throw new Error("Event not found or unauthorized");
			}

			const { orderIndex, ...roundData } = input;

			// If no order specified, get the next available order
			const maxOrder =
				orderIndex ??
				(await ctx.db
					.select({ maxOrder: max(rounds.orderIndex) })
					.from(rounds)
					.where(eq(rounds.eventId, input.eventId))
					.then((result) => (result[0]?.maxOrder ?? -1) + 1));

			const [newRound] = await ctx.db
				.insert(rounds)
				.values({
					...roundData,
					orderIndex: maxOrder,
				})
				.returning();
			revalidatePath(`events/${newRound?.eventId}/manage-rounds`);

			return newRound;
		}),

	// Update round
	updateRound: protectedProcedure
		.input(updateRoundSchema)
		.mutation(async ({ ctx, input }) => {
			const { id, ...updateData } = input;

			// First get the round with event info to check ownership
			const round = await ctx.db.query.rounds.findFirst({
				where: (rounds, { eq }) => eq(rounds.id, id),
				with: {
					event: {
						columns: {
							organizerId: true,
						},
					},
				},
			});

			if (!round) {
				throw new Error("Round not found");
			}

			if (round.event.organizerId !== ctx.user.id) {
				throw new Error("Unauthorized");
			}

			const [updatedRound] = await ctx.db
				.update(rounds)
				.set(updateData)
				.where(eq(rounds.id, id))
				.returning();
			revalidatePath(`events/${round.eventId}/manage-rounds`);

			return updatedRound;
		}),

	// Delete round
	deleteRound: protectedProcedure
		.input(z.object({ id: z.string() }))
		.mutation(async ({ ctx, input }) => {
			return ctx.db.transaction(async (tx) => {
				// Get the round with event info to check ownership
				const round = await tx.query.rounds.findFirst({
					where: (rounds, { eq }) => eq(rounds.id, input.id),
					with: {
						event: {
							columns: {
								organizerId: true,
							},
						},
					},
				});

				if (!round) {
					throw new Error("Round not found");
				}

				if (round.event.organizerId !== ctx.user.id) {
					throw new Error("Unauthorized");
				}

				// Delete the round
				await tx.delete(rounds).where(eq(rounds.id, input.id));

				// Update order of remaining rounds in the same event
				await tx
					.update(rounds)
					.set({
						orderIndex: round.orderIndex - 1,
					})
					.where(
						and(
							eq(rounds.eventId, round.eventId),
							gt(rounds.orderIndex, round.orderIndex),
						),
					);
				revalidatePath(`events/${round.eventId}/manage-rounds`);

				return { success: true };
			});
		}),

	// Reorder multiple rounds
	reorderRounds: protectedProcedure
		.input(reorderSchema.extend({ eventId: z.string() }))
		.mutation(async ({ ctx, input }) => {
			// Verify user owns the event
			const event = await ctx.db.query.events.findFirst({
				where: (events, { eq, and }) =>
					and(
						eq(events.id, input.eventId),
						eq(events.organizerId, ctx.user.id),
					),
			});

			if (!event) {
				throw new Error("Event not found or unauthorized");
			}

			return ctx.db.transaction(async (tx) => {
				const updatePromises = input.rounds.map((round) =>
					tx
						.update(rounds)
						.set({ orderIndex: round.orderIndex })
						.where(eq(rounds.id, round.id)),
				);

				await Promise.all(updatePromises);
				revalidatePath(`events/${input.eventId}/manage-rounds`);

				return { success: true };
			});
		}),

	// Move round up in order
	moveRoundUp: protectedProcedure
		.input(z.object({ id: z.string() }))
		.mutation(async ({ ctx, input }) => {
			return ctx.db.transaction(async (tx) => {
				// Get current round with event info
				const currentRound = await tx.query.rounds.findFirst({
					where: (rounds, { eq }) => eq(rounds.id, input.id),
					with: {
						event: {
							columns: {
								organizerId: true,
							},
						},
					},
				});

				if (!currentRound) {
					throw new Error("Round not found");
				}

				if (currentRound.event.organizerId !== ctx.user.id) {
					throw new Error("Unauthorized");
				}

				if (currentRound.orderIndex === 0) {
					throw new Error("Cannot move round up");
				}

				// Find the round above
				const upperRound = await tx.query.rounds.findFirst({
					where: (rounds, { eq, and }) =>
						and(
							eq(rounds.eventId, currentRound.eventId),
							eq(rounds.orderIndex, currentRound.orderIndex - 1),
						),
				});

				if (!upperRound) {
					throw new Error("No round to swap with");
				}

				// Swap orders
				await tx
					.update(rounds)
					.set({ orderIndex: upperRound.orderIndex })
					.where(eq(rounds.id, input.id));

				await tx
					.update(rounds)
					.set({ orderIndex: currentRound.orderIndex })
					.where(eq(rounds.id, upperRound.id));

				revalidatePath(`events/${currentRound.eventId}/manage-rounds`);

				return { success: true };
			});
		}),

	// Move round down in order
	moveRoundDown: protectedProcedure
		.input(z.object({ id: z.string() }))
		.mutation(async ({ ctx, input }) => {
			return ctx.db.transaction(async (tx) => {
				// Get current round with event info
				const currentRound = await tx.query.rounds.findFirst({
					where: (rounds, { eq }) => eq(rounds.id, input.id),
					with: {
						event: {
							columns: {
								organizerId: true,
							},
						},
					},
				});

				if (!currentRound) {
					throw new Error("Round not found");
				}

				if (currentRound.event.organizerId !== ctx.user.id) {
					throw new Error("Unauthorized");
				}

				// Find the round below
				const lowerRound = await tx.query.rounds.findFirst({
					where: (rounds, { eq, and }) =>
						and(
							eq(rounds.eventId, currentRound.eventId),
							eq(rounds.orderIndex, currentRound.orderIndex + 1),
						),
				});

				if (!lowerRound) {
					throw new Error("No round to swap with");
				}

				// Swap orders
				await tx
					.update(rounds)
					.set({ orderIndex: lowerRound.orderIndex })
					.where(eq(rounds.id, input.id));

				await tx
					.update(rounds)
					.set({ orderIndex: currentRound.orderIndex })
					.where(eq(rounds.id, lowerRound.id));

				revalidatePath(`events/${currentRound.eventId}/manage-rounds`);

				return { success: true };
			});
		}),

	// Toggle round active status
	toggleRoundStatus: protectedProcedure
		.input(z.object({ id: z.string() }))
		.mutation(async ({ ctx, input }) => {
			// Get round with event info to check ownership
			const round = await ctx.db.query.rounds.findFirst({
				where: (rounds, { eq }) => eq(rounds.id, input.id),
				with: {
					event: {
						columns: {
							organizerId: true,
						},
					},
				},
			});

			if (!round) {
				throw new Error("Round not found");
			}

			if (round.event.organizerId !== ctx.user.id) {
				throw new Error("Unauthorized");
			}

			const [updatedRound] = await ctx.db
				.update(rounds)
				.set({ isActive: !round.isActive })
				.where(eq(rounds.id, input.id))
				.returning();

			revalidatePath(`events/${round.eventId}/manage-rounds`);

			return updatedRound;
		}),
});
