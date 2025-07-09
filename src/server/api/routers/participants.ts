import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";
import { participants } from "@/server/db/schema";
import { and, asc, eq, gt, max, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
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
	create: protectedProcedure
		.input(createParticipantSchema)
		.mutation(async ({ ctx, input }) => {
			const { orderIndex, ...participantData } = input;

			// Check if participant already exists for this event
			const existingParticipant = await ctx.db
				.select()
				.from(participants)
				.where(
					and(
						eq(participants.email, input.email),
						eq(participants.eventId, input.eventId),
					),
				)
				.limit(1);

			console.log("Existing Participant:", existingParticipant);

			console.log("Input Event ID:", input.eventId);
			if (
				existingParticipant &&
				existingParticipant.length > 0 &&
				existingParticipant[0] &&
				existingParticipant[0].eventId === input.eventId
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
			revalidatePath(`/events/${input.eventId}/participants`);
			return newParticipant;
		}),

	// READ - Get all participants for an event
	getByEvent: protectedProcedure
		.input(z.object({ eventId: z.string() }))
		.query(async ({ ctx, input }) => {
			return ctx.db
				.select()
				.from(participants)
				.where(eq(participants.eventId, input.eventId))
				.orderBy(asc(participants.orderIndex));
		}),

	// READ - Get participant by ID
	getById: protectedProcedure
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
	getByEmailAndEvent: protectedProcedure
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
	update: protectedProcedure
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

			revalidatePath(`/events/${updatedParticipant?.eventId}/participants`);

			return updatedParticipant;
		}),

	// DELETE - Delete participant and adjust order of remaining participants
	delete: protectedProcedure
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

				// Revalidate the path to refresh participant list
				revalidatePath(`/events/${participantToDelete.eventId}/participants`);
				return { success: true };
			});
		}),

	// // REORDER - Update order of multiple participants
	// reorder: protectedProcedure
	// 	.input(reorderSchema)
	// 	.mutation(async ({ ctx, input }) => {
	// 		return ctx.db.transaction(async (tx) => {
	// 			const updatePromises = input.participants.map((participant) =>
	// 				tx
	// 					.update(participants)
	// 					.set({
	// 						orderIndex: participant.orderIndex,
	// 						updatedAt: new Date(),
	// 					})
	// 					.where(eq(participants.id, participant.id))
	// 			);

	// 			await Promise.all(updatePromises);
	// 			// Revalidate the path to refresh participant list
	// 			revalidatePath(
	// 				`/events/${input.participants[0].}/participants`,
	// 			);

	// 			return { success: true };
	// 		});
	// 	}),

	// UTILITY - Toggle participant active status
	toggleActive: protectedProcedure
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

			revalidatePath(`/events/${updatedParticipant?.eventId}/participants`);

			return updatedParticipant;
		}),
	bulkCreate: protectedProcedure
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
			const { eventId, participants: inputParticipants } = input;

			// Deduplicate by email
			const unique = Array.from(
				new Map(inputParticipants.map((p) => [p.email, p])).values(),
			);

			if (unique.length === 0) return { success: false, processed: 0 };

			// Get the current max order index for the event
			let maxOrder = await ctx.db
				.select({ max: sql<number>`MAX(${participants.orderIndex})` })
				.from(participants)
				.where(sql`${participants.eventId} = ${eventId}`)
				.then((r) => r[0]?.max ?? -1);

			// Build the VALUES list
			const valuesSql = sql.join(
				unique.map((p, i) => {
					maxOrder += 1;
					return sql`(${sql.param(eventId)}, ${sql.param(
						p.email,
					)}, ${sql.param(p.name)}, ${sql.param(maxOrder)})`;
				}),
				sql`, `,
			);

			// Execute UPSERT
			await ctx.db.execute(sql`
			INSERT INTO ${participants} (event_id, email, name, order_index)
			VALUES ${valuesSql}
			ON CONFLICT (email, event_id)
			DO UPDATE SET
				name = EXCLUDED.name,
				updated_at = NOW()
		`);

			revalidatePath(`/events/${eventId}/participants`);

			return {
				success: true,
				processed: unique.length,
			};
		}),

	getWithPasswordsByEvent: protectedProcedure
		.input(z.object({ eventId: z.string() }))
		.query(async ({ ctx, input }) => {
			return ctx.db
				.select({
					id: participants.id,
					name: participants.name,
					email: participants.email,
					password: participants.password, // return password only if stored
				})
				.from(participants)
				.where(eq(participants.eventId, input.eventId));
		}),
});
