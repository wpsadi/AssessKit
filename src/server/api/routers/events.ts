import { events } from "@/server/db/schema";
import { and, eq, gt, max } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "../trpc";

const createEventSchema = z.object({
	title: z.string().min(1, "Title is required"),
	description: z.string().optional(),
	startDate: z.date().optional(),
	endDate: z.date().optional(),
	durationMinutes: z.number().int().min(1).default(60),
	orderIndex: z.number().int().min(0).optional(),
});

const updateEventSchema = z.object({
	id: z.string(),
	title: z.string().min(1, "Title is required").optional(),
	description: z.string().optional(),
	startDate: z.date().optional(),
	endDate: z.date().optional(),
	durationMinutes: z.number().int().min(1).optional(),
	isActive: z.boolean().optional(),
});

const reorderSchema = z.object({
	events: z.array(
		z.object({
			id: z.string(),
			orderIndex: z.number().int().min(0),
		}),
	),
});

export const eventsRouter = createTRPCRouter({
	// READ - Get all events for the authenticated user
	getEvents: protectedProcedure.query(async ({ ctx }) => {
		const isAdmin = ctx.isAdmin;
		const events = await ctx.db.query.events.findMany({
			where: (events, { eq }) =>
				isAdmin ? undefined : eq(events.organizerId, ctx.user.id),
			orderBy: (events, { asc }) => asc(events.orderIndex),
			with: {
				participants: {
					columns: {
						id: true,
					},
				},
				rounds: {
					columns: {
						id: true,
					},
				},
			},
		});

		// Transform the results to include counts
		const eventsWithCounts = events.map((event) => ({
			...event,
			participantCount: event.participants.length,
			roundCount: event.rounds.length,
		}));

		return eventsWithCounts;
	}),

	// READ - Get single event by ID
	getEvent: protectedProcedure
		.input(z.object({ id: z.string() }))
		.query(async ({ ctx, input }) => {
			const event = await ctx.db.query.events.findFirst({
				where: (events, { eq, and }) =>
					and(
						eq(events.id, input.id),
						ctx.isAdmin
							? undefined
							: eq(events.organizerId, ctx.user.id),
					),
				with: {
					participants: {
						columns: {
							id: true,
						},
					},
					rounds: {
						columns: {
							id: true,
						},
					},
				},
			});

			if (!event) {
				throw new Error("Event not found");
			}

			return {
				...event,
				participantCount: event.participants.length,
				roundCount: event.rounds.length,
			};
		}),

	// CREATE - Add new event
	createEvent: protectedProcedure
		.input(createEventSchema)
		.mutation(async ({ ctx, input }) => {
			const { orderIndex, ...eventData } = input;

			// If no order specified, get the next available order
			const maxOrder = orderIndex ??
				(await ctx.db
					.select({ maxOrder: max(events.orderIndex) })
					.from(events)
					.where(eq(events.organizerId, ctx.user.id))
					.then((result) => (result[0]?.maxOrder ?? -1) + 1));

			const event = await ctx.db
				.insert(events)
				.values({
					...eventData,
					organizerId: ctx.user.id,
					orderIndex: maxOrder,
				})
				.returning();

			revalidatePath("/dashboard");

			return event[0];
		}),

	// UPDATE - Update event
	updateEvent: protectedProcedure
		.input(updateEventSchema)
		.mutation(async ({ ctx, input }) => {
			const { id, ...updateData } = input;

			const updatedEvent = await ctx.db
				.update(events)
				.set({
					...updateData,
					updatedAt: new Date(),
				})
				.where(
					and(
						eq(events.id, id),
						ctx.isAdmin
							? undefined
							: eq(events.organizerId, ctx.user.id),
					),
				)
				.returning();

			if (updatedEvent.length === 0) {
				throw new Error("Event not found or unauthorized");
			}
			revalidatePath("/dashboard");
			return updatedEvent[0];
		}),

	// DELETE - Delete event
	deleteEvent: protectedProcedure
		.input(z.object({ id: z.string() }))
		.mutation(async ({ ctx, input }) => {
			return ctx.db.transaction(async (tx) => {
				// Get the event to be deleted
				const [eventToDelete] = await tx
					.select({ orderIndex: events.orderIndex })
					.from(events)
					.where(
						and(
							eq(events.id, input.id),
							ctx.isAdmin
								? undefined
								: eq(events.organizerId, ctx.user.id),
						),
					)
					.limit(1);

				if (!eventToDelete) {
					throw new Error("Event not found or unauthorized");
				}

				// Delete the event
				await tx
					.delete(events)
					.where(
						and(
							eq(events.id, input.id),
							ctx.isAdmin
								? undefined
								: eq(events.organizerId, ctx.user.id),
						),
					);

				// Update order of remaining events
				await tx
					.update(events)
					.set({ orderIndex: eventToDelete.orderIndex - 1 })
					.where(
						and(
							gt(events.orderIndex, eventToDelete.orderIndex),
							ctx.isAdmin
								? undefined
								: eq(events.organizerId, ctx.user.id),
						),
					);
				revalidatePath("/dashboard");
				return { success: true };
			});
		}),

	// REORDER - Update order of multiple events
	reorder: protectedProcedure
		.input(reorderSchema)
		.mutation(async ({ ctx, input }) => {
			return ctx.db.transaction(async (tx) => {
				const updatePromises = input.events.map((event) =>
					tx
						.update(events)
						.set({
							orderIndex: event.orderIndex,
							updatedAt: new Date(),
						})
						.where(
							and(
								eq(events.id, event.id),
								ctx.isAdmin
									? undefined
									: eq(events.organizerId, ctx.user.id),
							),
						)
				);

				await Promise.all(updatePromises);
				revalidatePath("/dashboard");
				return { success: true };
			});
		}),

	// UTILITY - Toggle event active status
	toggleActive: protectedProcedure
		.input(z.object({ id: z.string() }))
		.mutation(async ({ ctx, input }) => {
			const [currentEvent] = await ctx.db
				.select({ isActive: events.isActive })
				.from(events)
				.where(
					and(
						eq(events.id, input.id),
						ctx.isAdmin
							? undefined
							: eq(events.organizerId, ctx.user.id),
					),
				)
				.limit(1);

			if (!currentEvent) {
				throw new Error("Event not found or unauthorized");
			}

			const updatedEvent = await ctx.db
				.update(events)
				.set({
					isActive: !currentEvent.isActive,
					updatedAt: new Date(),
				})
				.where(
					and(
						eq(events.id, input.id),
						ctx.isAdmin
							? undefined
							: eq(events.organizerId, ctx.user.id),
					),
				)
				.returning();
			revalidatePath("/dashboard");
			return updatedEvent[0];
		}),

	// UTILITY - Move event up in order
	moveUp: protectedProcedure
		.input(z.object({ id: z.string() }))
		.mutation(async ({ ctx, input }) => {
			return ctx.db.transaction(async (tx) => {
				const [currentEvent] = await tx
					.select({ orderIndex: events.orderIndex })
					.from(events)
					.where(
						and(
							eq(events.id, input.id),
							ctx.isAdmin
								? undefined
								: eq(events.organizerId, ctx.user.id),
						),
					)
					.limit(1);

				if (!currentEvent || currentEvent.orderIndex === 0) {
					throw new Error("Cannot move event up");
				}

				// Find the event above
				const [upperEvent] = await tx
					.select()
					.from(events)
					.where(
						and(
							eq(events.orderIndex, currentEvent.orderIndex - 1),
							ctx.isAdmin
								? undefined
								: eq(events.organizerId, ctx.user.id),
						),
					)
					.limit(1);

				if (!upperEvent) {
					throw new Error("No event to swap with");
				}

				// Swap orders
				await tx
					.update(events)
					.set({
						orderIndex: upperEvent.orderIndex,
						updatedAt: new Date(),
					})
					.where(
						and(
							eq(events.id, input.id),
							ctx.isAdmin
								? undefined
								: eq(events.organizerId, ctx.user.id),
						),
					);

				await tx
					.update(events)
					.set({
						orderIndex: currentEvent.orderIndex,
						updatedAt: new Date(),
					})
					.where(
						and(
							eq(events.id, upperEvent.id),
							ctx.isAdmin
								? undefined
								: eq(events.organizerId, ctx.user.id),
						),
					);
				revalidatePath("/dashboard");
				return { success: true };
			});
		}),

	// UTILITY - Move event down in order
	moveDown: protectedProcedure
		.input(z.object({ id: z.string() }))
		.mutation(async ({ ctx, input }) => {
			return ctx.db.transaction(async (tx) => {
				const [currentEvent] = await tx
					.select({ orderIndex: events.orderIndex })
					.from(events)
					.where(
						and(
							eq(events.id, input.id),
							ctx.isAdmin
								? undefined
								: eq(events.organizerId, ctx.user.id),
						),
					)
					.limit(1);

				if (!currentEvent) {
					throw new Error("Event not found");
				}

				// Find the event below
				const [lowerEvent] = await tx
					.select()
					.from(events)
					.where(
						and(
							eq(events.orderIndex, currentEvent.orderIndex + 1),
							ctx.isAdmin
								? undefined
								: eq(events.organizerId, ctx.user.id),
						),
					)
					.limit(1);

				if (!lowerEvent) {
					throw new Error("No event to swap with");
				}

				// Swap orders
				await tx
					.update(events)
					.set({
						orderIndex: lowerEvent.orderIndex,
						updatedAt: new Date(),
					})
					.where(
						and(
							eq(events.id, input.id),
							ctx.isAdmin
								? undefined
								: eq(events.organizerId, ctx.user.id),
						),
					);

				await tx
					.update(events)
					.set({
						orderIndex: currentEvent.orderIndex,
						updatedAt: new Date(),
					})
					.where(
						and(
							eq(events.id, lowerEvent.id),
							ctx.isAdmin
								? undefined
								: eq(events.organizerId, ctx.user.id),
						),
					);
				revalidatePath("/dashboard");
				return { success: true };
			});
		}),
});
