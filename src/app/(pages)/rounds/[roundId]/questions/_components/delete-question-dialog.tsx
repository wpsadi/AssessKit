"use client";

import type React from "react";

import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "@/components/ui/dialog";
import type { Question } from "@/lib/types";
import { api } from "@/trpc/react";
import { AlertTriangle } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

interface DeleteQuestionDialogProps {
	question: Question;
	children: React.ReactNode;
	onSuccess?: () => void;
}

export function DeleteQuestionDialog({
	question,
	children,
	onSuccess,
}: DeleteQuestionDialogProps) {
	const [open, setOpen] = useState(false);

	// TRPC mutation for deleting questions
	const deleteQuestionMutation = api.questions.delete.useMutation({
		onSuccess: () => {
			toast.success("Question deleted successfully!");
			setOpen(false);
			onSuccess?.();
		},
		onError: (error) => {
			toast.error(`Error deleting question: ${error.message}`);
		},
	});

	const handleDelete = async () => {
		try {
			await deleteQuestionMutation.mutateAsync({ id: question.id });
		} catch (error) {
			// Error is handled by onError callback
			console.error("Error deleting question:", error);
		}
	};

	return (
		<Dialog open={open} onOpenChange={setOpen}>
			<DialogTrigger asChild>{children}</DialogTrigger>
			<DialogContent className="sm:max-w-[425px]">
				<DialogHeader>
					<DialogTitle className="flex items-center gap-2">
						<AlertTriangle className="h-5 w-5 text-red-600" />
						Delete Question
					</DialogTitle>
					<DialogDescription>
						Are you sure you want to delete this question? This action cannot be
						undone and will permanently remove the question and any associated
						responses.
					</DialogDescription>
				</DialogHeader>

				<div className="py-4">
					<div className="rounded-lg bg-muted p-4">
						<p className="font-medium text-sm">Question ID: {question.id}</p>
					</div>
				</div>

				<DialogFooter>
					<Button
						type="button"
						variant="outline"
						onClick={() => setOpen(false)}
					>
						Cancel
					</Button>
					<Button
						type="button"
						variant="destructive"
						onClick={handleDelete}
						disabled={deleteQuestionMutation.isPending}
					>
						{deleteQuestionMutation.isPending
							? "Deleting..."
							: "Delete Question"}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
