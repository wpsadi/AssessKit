"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardFooter,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { FloatingSaveBar } from "@/components/ui/floating-save-bar";
import type { Round } from "@/lib/types";
import { api } from "@/trpc/react";
import { Clock, GripVertical, Settings, Trash2 } from "lucide-react";
import Link from "next/link";
import type React from "react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { DeleteRoundDialog } from "./delete-round-dialog";
import { EditRoundDialog } from "./edit-round-dialog";

interface RoundSortableListProps {
	rounds: Round[];
	eventId: string;
	onUpdate?: () => void;
	totalEventDuration: number;
	usedDuration: number;
	remainingDuration: number;
}

export function RoundSortableList({
	rounds: initialRounds,
	eventId,
	onUpdate,
	totalEventDuration,
	usedDuration,
	remainingDuration,
}: RoundSortableListProps) {
	const [rounds, setRounds] = useState<Round[]>(initialRounds);
	const [hasChanges, setHasChanges] = useState(false);
	const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
	const [isSaving, setIsSaving] = useState(false);
	const skipNextSyncRef = useRef(false);

	const reorderRoundsMutation = api.rounds.reorderRounds.useMutation({
		onSuccess: () => {
			// Mark that we should skip the next sync from props
			skipNextSyncRef.current = true;
			setIsSaving(false);
			setHasChanges(false);
			toast.success("Round order updated successfully");

			// Delay the refresh to ensure server has processed changes
			setTimeout(() => {
				onUpdate?.();
			}, 500);
		},
		onError: (error) => {
			console.error("Error updating round order:", error);
			toast.error(error.message || "Failed to update round order");
			// Revert to original state on error
			setRounds(initialRounds);
			setHasChanges(false);
			setIsSaving(false);
		},
	});

	// Sync local state with props when they change, but only if not skipping
	useEffect(() => {
		if (skipNextSyncRef.current) {
			skipNextSyncRef.current = false;
			return;
		}

		// Only update if there are no pending changes
		if (!hasChanges) {
			setRounds(initialRounds);
		}
	}, [initialRounds, hasChanges]);

	const handleDragStart = (e: React.DragEvent, index: number) => {
		setDraggedIndex(index);
		e.dataTransfer.setData("text/plain", index.toString());
		e.dataTransfer.effectAllowed = "move";
	};

	const handleDragEnd = () => {
		setDraggedIndex(null);
	};

	const handleDragOver = (e: React.DragEvent) => {
		e.preventDefault();
		e.dataTransfer.dropEffect = "move";
	};

	const handleDrop = (e: React.DragEvent, dropIndex: number) => {
		e.preventDefault();
		const dragIndex = Number.parseInt(e.dataTransfer.getData("text/plain"));

		// Validate indices
		if (
			Number.isNaN(dragIndex) ||
			dragIndex === dropIndex ||
			dragIndex < 0 ||
			dragIndex >= rounds.length ||
			dropIndex < 0 ||
			dropIndex >= rounds.length
		) {
			setDraggedIndex(null);
			return;
		}

		const newRounds = [...rounds];
		const [draggedRound] = newRounds.splice(dragIndex, 1);

		if (!draggedRound) {
			setDraggedIndex(null);
			return;
		}

		newRounds.splice(dropIndex, 0, draggedRound);

		// Update order indices to match new positions
		const reorderedRounds = newRounds.map((round, index) => ({
			...round,
			orderIndex: index,
		}));

		setRounds(reorderedRounds);
		setHasChanges(true);
		setDraggedIndex(null);
	};

	const handleSaveChanges = async () => {
		if (!hasChanges || isSaving) {
			return;
		}

		try {
			setIsSaving(true);

			const orderUpdates = rounds.map((round, index) => ({
				id: round.id,
				orderIndex: index,
			}));

			await reorderRoundsMutation.mutateAsync({
				eventId,
				rounds: orderUpdates,
			});

			// Note: We don't reset state here because the mutation's onSuccess will handle it
		} catch (error) {
			// Error is handled by the mutation's onError callback
			console.error("Failed to save round order:", error);
		}
	};

	const handleDiscardChanges = () => {
		setRounds(initialRounds);
		setHasChanges(false);
		toast.info("Changes discarded, order reverted to original");
	};

	const formatTime = (minutes: number) => {
		if (minutes <= 0) return "0m";
		const hours = Math.floor(minutes / 60);
		const mins = minutes % 60;
		if (hours > 0) {
			return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
		}
		return `${mins}m`;
	};

	const handleRoundUpdate = () => {
		// When a round is updated, refresh the data
		onUpdate?.();
	};

	return (
		<>
			<div className="space-y-4">
				{rounds.map((round, index: number) => (
					<Card
						key={round.id}
						className={`cursor-move transition-all duration-200 hover:shadow-md ${
							draggedIndex === index ? "scale-95 opacity-50" : ""
						}`}
						draggable
						onDragStart={(e) => handleDragStart(e, index)}
						onDragEnd={handleDragEnd}
						onDragOver={handleDragOver}
						onDrop={(e) => handleDrop(e, index)}
					>
						<CardHeader>
							<div className="flex items-start gap-4">
								<GripVertical className="mt-1 h-5 w-5 cursor-grab text-gray-400 active:cursor-grabbing" />
								<div className="flex-1">
									<div className="flex items-start justify-between">
										<div>
											<CardTitle className="text-xl">
												Round {index + 1}: {round.title}
											</CardTitle>
											<CardDescription className="mt-1">
												{round.description || "No description provided"}
											</CardDescription>
										</div>
										<div className="flex gap-2">
											<Badge variant={round.isActive ? "default" : "secondary"}>
												{round.isActive ? "Active" : "Inactive"}
											</Badge>
											{round.useEventDuration && (
												<Badge variant="outline" className="text-blue-600">
													Event Duration
												</Badge>
											)}
										</div>
									</div>
								</div>
							</div>
						</CardHeader>

						<CardContent>
							<div className="flex items-center text-gray-600 text-sm">
								<Clock className="mr-2 h-4 w-4" />
								<span>
									Duration:{" "}
									{round.useEventDuration
										? `${formatTime(totalEventDuration)} (Full Event)`
										: formatTime(round.timeLimit || 0)}
								</span>
							</div>
						</CardContent>

						<CardFooter className="flex justify-between">
							<Link href={`/rounds/${round.id}/questions`}>
								<Button variant="outline">
									<Settings className="mr-2 h-4 w-4" />
									Manage Questions
								</Button>
							</Link>

							<div className="flex gap-2">
								<EditRoundDialog
									round={{
										...round,
										createdAt: round.createdAt ?? new Date(0),
										updatedAt: round.updatedAt ?? new Date(0),
										eventId,
										description: round.description ?? null,
										isActive: round.isActive ?? false,
										orderIndex: round.orderIndex ?? 0,
										timeLimit: round.timeLimit ?? null,
										useEventDuration: round.useEventDuration ?? false,
									}}
									onSuccess={handleRoundUpdate}
									totalEventDuration={totalEventDuration}
								>
									<Button variant="ghost" size="sm">
										Edit
									</Button>
								</EditRoundDialog>

								<DeleteRoundDialog round={round}>
									<Button
										variant="ghost"
										size="sm"
										className="text-red-600 hover:text-red-700"
									>
										<Trash2 className="h-4 w-4" />
									</Button>
								</DeleteRoundDialog>
							</div>
						</CardFooter>
					</Card>
				))}
			</div>

			{hasChanges && (
				<FloatingSaveBar
					onSave={handleSaveChanges}
					onDiscard={handleDiscardChanges}
					isSaving={isSaving || reorderRoundsMutation.isPending}
				/>
			)}
		</>
	);
}
