import { createTRPCRouter, publicProcedure } from "@/server/api/trpc";
import { participants } from "@/server/db/schema";
import { asc, eq, gt, max } from "drizzle-orm";
import { z } from "zod";

const createParticipantSchema = z.object({
	eventId: z.string(),
	name: z.string().min(1, "Name is required"),
	email: z.string().email("Valid email is required"),
	userId: z.string().optional(),
	password: z.string().optional(),
	orderIndex: z.number().int().min(0).optional(),
});

const updateParticipantSchema = z.object({
	id: z.string(),
	name: z.string().min(1, "Name is required").optional(),
	email: z.string().email("Valid email is required").optional(),
	isActive: z.boolean().optional(),
});

const reorderSchema = z.object({
	participants: z.array(
		z.object({
			id: z.string(),
			orderIndex: z.number().int().min(0),
		}),
	),
});

export const participantsRouter = createTRPCRouter({
	// CREATE - Add new participant
	create: publicProcedure
		.input(createParticipantSchema)
		.mutation(async ({ ctx, input }) => {
			const { orderIndex, ...participantData } = input;

			// Check if participant already exists for this event
			const [existingParticipant] = await ctx.db
				.select()
				.from(participants)
				.where(eq(participants.email, input.email))
				.limit(1);

			if (
				existingParticipant &&
				existingParticipant.eventId === input.eventId
			) {
				throw new Error(
					"Participant with this email already exists for this event",
				);
			}

			// If no order specified, get the next available order
			const maxOrder =
				orderIndex ??
				(await ctx.db
					.select({ maxOrder: max(participants.orderIndex) })
					.from(participants)
					.where(eq(participants.eventId, input.eventId))
					.then((result) => (result[0]?.maxOrder ?? -1) + 1));

			const [newParticipant] = await ctx.db
				.insert(participants)
				.values({
					...participantData,
					orderIndex: maxOrder,
				})
				.returning();

			return newParticipant;
		}),

	// READ - Get all participants for an event
	getByEvent: publicProcedure
		.input(z.object({ eventId: z.string() }))
		.query(async ({ ctx, input }) => {
			return ctx.db
				.select()
				.from(participants)
				.where(eq(participants.eventId, input.eventId))
				.orderBy(asc(participants.orderIndex));
		}),

	// READ - Get participant by ID
	getById: publicProcedure
		.input(z.object({ id: z.string() }))
		.query(async ({ ctx, input }) => {
			const [participant] = await ctx.db
				.select()
				.from(participants)
				.where(eq(participants.id, input.id))
				.limit(1);

			return participant || null;
		}),

	// READ - Get participant by email and event
	getByEmailAndEvent: publicProcedure
		.input(z.object({ email: z.string(), eventId: z.string() }))
		.query(async ({ ctx, input }) => {
			const [participant] = await ctx.db
				.select()
				.from(participants)
				.where(eq(participants.email, input.email))
				.limit(1);

			return participant || null;
		}),

	// UPDATE - Update participant
	update: publicProcedure
		.input(updateParticipantSchema)
		.mutation(async ({ ctx, input }) => {
			const { id, ...updateData } = input;

			const [updatedParticipant] = await ctx.db
				.update(participants)
				.set({
					...updateData,
					updatedAt: new Date(),
				})
				.where(eq(participants.id, id))
				.returning();

			return updatedParticipant;
		}),

	// DELETE - Delete participant and adjust order of remaining participants
	delete: publicProcedure
		.input(z.object({ id: z.string() }))
		.mutation(async ({ ctx, input }) => {
			return ctx.db.transaction(async (tx) => {
				// Get the participant to be deleted
				const [participantToDelete] = await tx
					.select({
						orderIndex: participants.orderIndex,
						eventId: participants.eventId,
					})
					.from(participants)
					.where(eq(participants.id, input.id))
					.limit(1);

				if (!participantToDelete) {
					throw new Error("Participant not found");
				}

				// Delete the participant
				await tx.delete(participants).where(eq(participants.id, input.id));

				// Update order of remaining participants in the same event
				await tx
					.update(participants)
					.set({ orderIndex: participantToDelete.orderIndex - 1 })
					.where(gt(participants.orderIndex, participantToDelete.orderIndex));

				return { success: true };
			});
		}),

	// REORDER - Update order of multiple participants
	reorder: publicProcedure
		.input(reorderSchema)
		.mutation(async ({ ctx, input }) => {
			return ctx.db.transaction(async (tx) => {
				const updatePromises = input.participants.map((participant) =>
					tx
						.update(participants)
						.set({ orderIndex: participant.orderIndex, updatedAt: new Date() })
						.where(eq(participants.id, participant.id)),
				);

				await Promise.all(updatePromises);

				return { success: true };
			});
		}),

	// UTILITY - Toggle participant active status
	toggleActive: publicProcedure
		.input(z.object({ id: z.string() }))
		.mutation(async ({ ctx, input }) => {
			const [currentParticipant] = await ctx.db
				.select({ isActive: participants.isActive })
				.from(participants)
				.where(eq(participants.id, input.id))
				.limit(1);

			if (!currentParticipant) {
				throw new Error("Participant not found");
			}

			const [updatedParticipant] = await ctx.db
				.update(participants)
				.set({
					isActive: !currentParticipant.isActive,
					updatedAt: new Date(),
				})
				.where(eq(participants.id, input.id))
				.returning();

			return updatedParticipant;
		}),

	// BULK - Import multiple participants
	bulkCreate: publicProcedure
		.input(
			z.object({
				eventId: z.string(),
				participants: z.array(
					z.object({
						name: z.string().min(1),
						email: z.string().email(),
					}),
				),
			}),
		)
		.mutation(async ({ ctx, input }) => {
			return ctx.db.transaction(async (tx) => {
				const createdParticipants = [];

				for (let i = 0; i < input.participants.length; i++) {
					const participant = input.participants[i];

					if (!participant) {
						continue; // Skip if participant is undefined
					}

					// Check if participant already exists
					const [existing] = await tx
						.select()
						.from(participants)
						.where(eq(participants.email, participant.email))
						.limit(1);

					if (existing && existing.eventId === input.eventId) {
						continue; // Skip existing participants
					}

					// Get next order index
					const maxOrder = await tx
						.select({ maxOrder: max(participants.orderIndex) })
						.from(participants)
						.where(eq(participants.eventId, input.eventId))
						.then((result) => (result[0]?.maxOrder ?? -1) + 1);

					const [newParticipant] = await tx
						.insert(participants)
						.values({
							eventId: input.eventId,
							name: participant.name,
							email: participant.email,
							orderIndex: maxOrder + i,
						})
						.returning();

					createdParticipants.push(newParticipant);
				}

				return {
					success: true,
					created: createdParticipants.length,
					participants: createdParticipants,
				};
			});
		}),
});
