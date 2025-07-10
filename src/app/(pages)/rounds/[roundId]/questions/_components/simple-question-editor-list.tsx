"use client";

import type React from "react";

import { FloatingSaveBar } from "@/components/ui/floating-save-bar";
import type { Event, Question, Round } from "@/lib/types";
import { api } from "@/trpc/react";
import { useQueryClient } from "@tanstack/react-query";
import { invalidateEntityQueries } from "@/lib/query-keys";
import { Loader2 } from "lucide-react";
import { useCallback, useState } from "react";
import { toast } from "sonner";
import { SimpleQuestionEditor } from "./simple-question-editor";

interface SimpleQuestionEditorListProps {
	questions: Question[];
	round: Round;
	event: Event;
	onUpdate?: () => void;
}

export function SimpleQuestionEditorList({
	questions: initialQuestions,
	round,
	event,
	onUpdate,
}: SimpleQuestionEditorListProps) {
	// Sort initial questions by orderIndex
	const [questions, setQuestions] = useState(() =>
		[...initialQuestions].sort((a, b) => a.orderIndex - b.orderIndex),
	);
	const [hasOrderChanges, setHasOrderChanges] = useState(false);
	const [isSaving, setIsSaving] = useState(false);
	const queryClient = useQueryClient();

	// Get fresh questions data but don't use it for display
	const { isLoading: isLoadingQuestions, refetch: refetchQuestions } =
		api.questions.getByRound.useQuery(
			{ roundId: round.id },
			{
				refetchOnWindowFocus: false,
				enabled: false, // Only fetch when explicitly called
			},
		);

	const updateQuestionOrder = api.questions.reorder.useMutation({
		onSuccess: () => {
			setHasOrderChanges(false);
			toast.success("Question order updated successfully");
			// Use centralized invalidation helper for questions
			invalidateEntityQueries.questions(queryClient, round.id);
			onUpdate?.();
		},
		onError: (error) => {
			console.error("Error updating question order:", error);
			toast.error("Failed to update question order");
		},
	});

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

		const newQuestions = [...questions];
		const [draggedQuestion] = newQuestions.splice(dragIndex, 1);

		if (!draggedQuestion) return;

		newQuestions.splice(dropIndex, 0, draggedQuestion);

		// Update order indices
		const updatedQuestions = newQuestions.map((question, index) => ({
			...question,
			orderIndex: index + 1,
		}));

		setQuestions(updatedQuestions);
		setHasOrderChanges(true);
	};

	const handleSaveOrderChanges = async () => {
		setIsSaving(true);
		try {
			const orderUpdates = questions.map((question, index) => ({
				id: question.id,
				orderIndex: index + 1,
			}));

			await updateQuestionOrder.mutateAsync({ questions: orderUpdates });
		} catch (error) {
			console.error("Error updating question order:", error);
		} finally {
			setIsSaving(false);
		}
	};

	const handleDiscardOrderChanges = () => {
		// Reset to original order
		const resetQuestions = [...initialQuestions].sort(
			(a, b) => a.orderIndex - b.orderIndex,
		);
		setQuestions(resetQuestions);
		setHasOrderChanges(false);
		toast.info("Question order changes discarded");
	};

	// Handle individual question updates without affecting order
	const handleQuestionUpdate = useCallback(
		(updatedQuestion: Question) => {
			setQuestions((prevQuestions) =>
				prevQuestions.map((q) =>
					q.id === updatedQuestion.id
						? { ...updatedQuestion, orderIndex: q.orderIndex } // Preserve order
						: q,
				),
			);
			onUpdate?.();
		},
		[onUpdate],
	);

	// Handle question deletion
	const handleQuestionDelete = useCallback(
		(deletedQuestionId: string) => {
			setQuestions((prevQuestions) =>
				prevQuestions.filter((q) => q.id !== deletedQuestionId),
			);
			onUpdate?.();
		},
		[onUpdate],
	);

	// Handle new question creation
	const handleQuestionCreate = useCallback(() => {
		// Refetch questions when a new one is created
		refetchQuestions().then((result) => {
			if (result.data) {
				const sortedQuestions = [...result.data].sort(
					(a, b) => a.orderIndex - b.orderIndex,
				);
				setQuestions(sortedQuestions);
			}
		});
		onUpdate?.();
	}, [refetchQuestions, onUpdate]);

	if (isLoadingQuestions && questions.length === 0) {
		return (
			<div className="flex items-center justify-center py-8">
				<Loader2 className="h-6 w-6 animate-spin" />
				<span className="ml-2 text-gray-600 text-sm">Loading questions...</span>
			</div>
		);
	}

	return (
		<>
			<div className="space-y-4">
				{questions.map((question, index) => (
					<div
						key={question.id}
						className="cursor-move"
						draggable
						onDragStart={(e) => handleDragStart(e, index)}
						onDragOver={handleDragOver}
						onDrop={(e) => handleDrop(e, index)}
					>
						<SimpleQuestionEditor
							question={question}
							index={index + 1}
							round={round}
							event={event}
							onUpdate={handleQuestionUpdate}
							onDelete={handleQuestionDelete}
						/>
					</div>
				))}

				{questions.length === 0 && (
					<div className="py-8 text-center text-gray-500">
						<p>No questions yet. Create your first question to get started.</p>
					</div>
				)}
			</div>

			{hasOrderChanges && (
				<FloatingSaveBar
					onSave={handleSaveOrderChanges}
					onDiscard={handleDiscardOrderChanges}
					isSaving={isSaving || updateQuestionOrder.isPending}
				/>
			)}
		</>
	);
}
