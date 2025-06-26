"use client";

import type React from "react";

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
import { useEffect, useState } from "react";
import { DeleteRoundDialog } from "./delete-round-dialog";
import { EditRoundDialog } from "./edit-round-dialog";

interface RoundSortableListProps {
	rounds: Round[];
	eventId: string;
	onUpdate?: () => void;
}

export function RoundSortableList({
	rounds: initialRounds,
	eventId,
	onUpdate,
}: RoundSortableListProps) {
	const [rounds, setRounds] = useState(initialRounds);
	const [hasChanges, setHasChanges] = useState(false);

	const reorderRoundsMutation = api.rounds.reorderRounds.useMutation({
		onSuccess: () => {
			setHasChanges(false);
			onUpdate?.();
		},
		onError: (error) => {
			console.error("Error updating round order:", error);
			setRounds(initialRounds);
			setHasChanges(false);
		},
	});

	useEffect(() => {
		setRounds(initialRounds);
		setHasChanges(false);
	}, [initialRounds]);

	const handleDragStart = (e: React.DragEvent, index: number) => {
		e.dataTransfer.setData("text/plain", index.toString());
	};

	const handleDragOver = (e: React.DragEvent) => {
		e.preventDefault();
	};

	const handleDrop = (e: React.DragEvent, dropIndex: number) => {
		e.preventDefault();
		const dragIndex = Number.parseInt(e.dataTransfer.getData("text/plain"));
		if (dragIndex === dropIndex) return;

		const newRounds = [...rounds];
		const [draggedRound] = newRounds.splice(dragIndex, 1);
		if (draggedRound) {
			newRounds.splice(dropIndex, 0, draggedRound);
		}

		// Update order indices (zero-based for backend)
		const updatedRounds = newRounds.map((round, index) => ({
			...round,
			orderIndex: index,
		}));

		setRounds(updatedRounds);
		setHasChanges(true);
	};

	const handleSaveChanges = async () => {
		try {
			const orderUpdates = rounds.map((round, index) => ({
				id: round.id,
				orderIndex: index,
			}));
			await reorderRoundsMutation.mutateAsync({
				eventId,
				rounds: orderUpdates,
			});
		} catch (error) {
			// Error handled in mutation
		}
	};

	const handleDiscardChanges = () => {
		setRounds(initialRounds);
		setHasChanges(false);
	};

	const formatTime = (minutes: number) => {
		const hours = Math.floor(minutes / 60);
		const mins = minutes % 60;
		if (hours > 0) {
			return `${hours}h ${mins}m`;
		}
		return `${mins}m`;
	};

	return (
		<>
			<div className="space-y-4">
				{rounds.map((round, index) => (
					<Card
						key={round.id}
						className="cursor-move transition-shadow hover:shadow-md"
						draggable
						onDragStart={(e) => handleDragStart(e, index)}
						onDragOver={handleDragOver}
						onDrop={(e) => handleDrop(e, index)}
					>
						<CardHeader>
							<div className="flex items-start gap-4">
								<GripVertical className="mt-1 h-5 w-5 flex-shrink-0 text-gray-400" />
								<div className="flex-1">
									<div className="flex items-start justify-between">
										<div>
											<CardTitle className="text-xl">
												Round{" "}
												{typeof round.orderIndex === "number"
													? round.orderIndex + 1
													: index + 1}
												: {round.title}
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
									Time Limit:{" "}
									{round.useEventDuration
										? "Event Duration"
										: formatTime(round.timeLimit || 60)}
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
									onSuccess={onUpdate ? () => onUpdate() : () => {}}
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
					isSaving={reorderRoundsMutation.isPending}
				/>
			)}
		</>
	);
}
